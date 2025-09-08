// src/services/doc.service.ts
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as mammoth from 'mammoth';
import { InferenceClient } from '@huggingface/inference';
import { ENV } from '../config/env.js';

const require = createRequire(import.meta.url);
const pdf: (data: Buffer) => Promise<{ text: string }> = require('pdf-parse');

// 👇 Constructor con token (sin objeto); el provider lo pasamos por llamada
const hf = new InferenceClient(ENV.HF_TOKEN);

// ⚡ Embeddings rápidos y multilingües
const EMB_MODEL = 'intfloat/multilingual-e5-small';

// ----------------------- Store en memoria -----------------------
type DocStore = { name: string; text: string; chunks: string[]; vectors: number[][] };
const store = new Map<string, DocStore>();

// ----------------------- Utils rápidas --------------------------
const MAX_DOC_CHARS = 200_000;
const CHUNK_SIZE    = 900;
const MAX_CHUNKS    = 48;
const MAX_CONTEXT_K = 4;
const CONTEXT_TRIM  = 1200;
const FE_TIMEOUT_MS = 20_000;
const FE_MAX_CONC   = 2;
const RETRIES       = 3;

// ----------------------- Extracción de texto --------------------
export async function extractText(filePath: string, mime: string) {
  const buf = await fs.readFile(filePath);

  if (mime.includes('pdf')) {
    const res = await pdf(buf);
    return (res.text || '').trim();
  }

  if (mime.includes('word') || filePath.toLowerCase().endsWith('.docx')) {
    const res = await (mammoth as any).extractRawText({ buffer: buf });
    return (res?.value || '').trim();
  }

  return buf.toString('utf8').trim();
}

// ----------------------- Chunking eficiente ---------------------
export function chunkText(text: string, maxLen = CHUNK_SIZE) {
  const cleaned = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim();
  const capped = cleaned.length > MAX_DOC_CHARS ? cleaned.slice(0, MAX_DOC_CHARS) : cleaned;

  if (capped.length <= maxLen) return [capped];

  const paras = capped.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);

  const out: string[] = [];
  let cur = '';
  for (const p of paras) {
    if ((cur + '\n\n' + p).length > maxLen && cur) {
      out.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + '\n\n' + p : p;
    }
    if (out.length >= MAX_CHUNKS) break;
  }
  if (cur && out.length < MAX_CHUNKS) out.push(cur);

  return out.slice(0, MAX_CHUNKS);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function embedOne(text: string, attempt = 1): Promise<number[]> {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), FE_TIMEOUT_MS);
  try {
    const v = await hf.featureExtraction({
      model: EMB_MODEL,
      inputs: text,
      provider: 'hf-inference',      
      signal: ac.signal as any,
    });
    const arr = Array.isArray(v) ? (v as number[]) : ((v as any)[0] as number[]);
    const s = Math.sqrt(arr.reduce((a, b) => a + b * b, 0)) || 1;
    return arr.map(x => x / s);
  } catch (e) {
    if (attempt < RETRIES) {
      await sleep(800 * Math.pow(2, attempt - 1));
      return embedOne(text, attempt + 1);
    }
    throw e;
  } finally {
    clearTimeout(to);
  }
}

export async function embed(texts: string[]) {
  if (texts.length === 1) return [await embedOne(texts[0])];

  const results: number[][] = new Array(texts.length);
  let i = 0;

  async function worker() {
    while (i < texts.length) {
      const idx = i++;
      results[idx] = await embedOne(texts[idx]);
    }
  }

  const workers = Array.from({ length: Math.min(FE_MAX_CONC, texts.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

const cos = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);


export async function indexDoc(id: string, filePath: string, mime: string, name: string) {
  const t0 = Date.now();
  const text = await extractText(filePath, mime);
  if (!text) throw new Error('No se pudo extraer texto del documento');

  const chunks = chunkText(text);
  if (chunks.length === 0) throw new Error('Documento sin contenido útil');

  const vectors = await embed(chunks);

  store.set(id, { name, text, chunks, vectors });
  const ms = Date.now() - t0;
  console.log(`[BACK][indexDoc] ${name} → chunks=${chunks.length} embMs=${ms}`);

  return { name, chunkCount: chunks.length };
}


export async function askDoc(
  id: string,
  question: string,
  opts?: { topK?: number; system?: string; max_tokens?: number; temperature?: number }
) {
  const doc = store.get(id);
  if (!doc) throw new Error('Documento no indexado');

  const {
    topK = MAX_CONTEXT_K,
    system = 'Eres un asistente útil en español.',
    max_tokens = 350,
    temperature = 0.2,
  } = opts ?? {};

  // 1) embedding de la pregunta
  const [qv] = await embed([question]);

  // 2) retrieval: top-K por coseno
  const picks = doc.vectors
    .map((v, i) => ({ i, s: cos(qv, v) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, Math.min(topK, doc.chunks.length))
    .map(p => doc.chunks[p.i].slice(0, CONTEXT_TRIM));

  // 3) contexto + prompts
  const context = picks.map((c, i) => `【${i + 1}】\n${c}`).join('\n\n');

  const gemmaPrompt =
`<start_of_turn>system
${system}
<end_of_turn>
<start_of_turn>user
Usa exclusivamente la información de los fragmentos. Si no está, dilo explícitamente.
Fragmentos:
${context}

Pregunta: ${question}
<end_of_turn>
<start_of_turn>model`;

  // 4) Intento 1: chatCompletion (si el provider para Gemma lo soporta)
  try {
    const chat = await hf.chatCompletion({
      model: ENV.MODEL_ID,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Usa SOLO estos fragmentos; si la info no está, dilo.\n\n${context}\n\nPregunta: ${question}` },
      ],
      max_tokens,
      temperature,
    });

    const answer = chat.choices?.[0]?.message?.content?.trim() ?? '';
    return { answer, contextUsed: picks };
  } catch (e) {
    console.warn('[BACK][askDoc] chatCompletion no disponible; uso textGeneration. Motivo:', (e as Error).message);
  }

  // 5) Fallback: textGeneration 
  const gen: any = await hf.textGeneration({
    model: ENV.MODEL_ID, 
    inputs: gemmaPrompt,
    parameters: {
      max_new_tokens: max_tokens,
      temperature,
      return_full_text: false,
    },
  });

  let answer = '';
  if (typeof gen === 'string') {
    answer = gen.trim();
  } else if (Array.isArray(gen) && gen[0]?.generated_text) {
    answer = (gen[0].generated_text as string).trim();
  } else if ((gen as any)?.generated_text) {
    answer = ((gen as any).generated_text as string).trim();
  }

  return { answer, contextUsed: picks }}