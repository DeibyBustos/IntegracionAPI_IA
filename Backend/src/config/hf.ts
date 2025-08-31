import { InferenceClient } from '@huggingface/inference';
import { ENV } from './env.js';

// Puedes fijar el provider si quieres, o dejar "auto"
export const hf = new InferenceClient( ENV.HF_TOKEN);
