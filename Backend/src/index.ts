import 'dotenv/config';
import { InferenceClient } from '@huggingface/inference';

const HF_TOKEN = process.env.HF_TOKEN?.trim();
const MODEL_ID = process.env.MODEL_ID?.trim();

if (!HF_TOKEN) throw new Error('Falta HF_TOKEN en .env');
if (!MODEL_ID) throw new Error('Falta MODEL_ID en .env');

const hf = new InferenceClient(HF_TOKEN);

async function main() {
  const res = await hf.chatCompletion({
    model: MODEL_ID, // <-- ¡importante!
    messages: [
      { role: 'system', content: 'Eres un asistente útil en español.' },
      { role: 'user', content: 'Explícame la IA en 3 frases.' },
    ],
    max_tokens: 300,
    temperature: 0.3,
  });

  console.log('🧠 Respuesta:\n', res.choices?.[0]?.message?.content);
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
