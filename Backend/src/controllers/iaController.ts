import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/iaService.js';
import { z } from 'zod';

const ChatSchema = z.object({
  message: z.string().min(1, 'message requerido'),
  system: z.string().optional(),
  max_tokens: z.number().int().positive().max(4096).optional(),
  temperature: z.number().min(0).max(1).optional(),
});

export async function chatController(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ChatSchema.parse(req.body ?? {});
    const output = await chatService(parsed);
    res.json({ ok: true, output });
  } catch (err) {
    next(err);
  }
}
