import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { indexDoc, askDoc } from '../services/doc.service.js';

const upload = multer({ dest: path.join(process.cwd(), 'uploads') });
export const filesRouter = Router();

filesRouter.post('/files', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'Archivo requerido' });

    const id = crypto.randomBytes(8).toString('hex');
    const meta = await indexDoc(id, req.file.path, req.file.mimetype, req.file.originalname);
    await fs.unlink(req.file.path).catch(() => {});
    res.json({ ok: true, docId: id, ...meta });
  } catch (e) {
    next(e);
  }
});

filesRouter.post('/files/:id/ask', async (req, res, next) => {
  try {
    const { question, system, max_tokens, temperature } = req.body ?? {};
    if (!question) return res.status(400).json({ ok: false, error: 'question requerido' });

    const out = await askDoc(req.params.id, question, { system, max_tokens, temperature });
    res.json({ ok: true, ...out });
  } catch (e) {
    next(e);
  }
});
