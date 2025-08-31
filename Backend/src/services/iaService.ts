import { hf } from '../config/hf.js';
import { ENV } from '../config/env.js';

export type ChatParams = {
  message: string;
  system?: string;
  max_tokens?: number;
  temperature?: number;
};

export async function chatService({ message, system, max_tokens = 400, temperature = 0.3 }: ChatParams) {
  const res = await hf.chatCompletion({
    model: ENV.MODEL_ID,
    messages: [
      { role: 'system', content: system ?? 'Eres un asistente útil en español.' },
      { role: 'user', content: message },
    ],
    max_tokens,
    temperature,
  });

  return res.choices?.[0]?.message?.content?.trim() ?? '';
}
