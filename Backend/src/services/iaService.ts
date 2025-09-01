import { hf } from '../config/hf.js';
import { ENV } from '../config/env.js';

export type ChatParams = {
  message: string;
  system?: string;
  max_tokens?: number;
  temperature?: number;
};

export async function chatService(
  { message, system, max_tokens = 400, temperature = 0.3 }: ChatParams,
  reqId: string = 'no-id'
) {
  const t0 = Date.now();
  console.log(`[BACK][${reqId}] → HF.chatCompletion model=${ENV.MODEL_ID}`);
  console.log(`[BACK][${reqId}] prompt:`, message);

  const res = await hf.chatCompletion({
    model: ENV.MODEL_ID,
    messages: [
      { role: 'system', content: system ?? 'Eres un asistente útil en español.' },
      { role: 'user', content: message },
    ],
    max_tokens,
    temperature,
  });

  const text = res.choices?.[0]?.message?.content?.trim() ?? '';
  console.log(`[BACK][${reqId}] ← HF.res (len=${text.length}) in ${Date.now() - t0}ms`);
  return text;
}
