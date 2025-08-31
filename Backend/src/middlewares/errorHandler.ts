import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: 'VALIDATION_ERROR',
      details: err.issues.map(e => ({ path: e.path, message: e.message })),
    });
  }
  console.error('❌ Error:', err);
  res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
}
