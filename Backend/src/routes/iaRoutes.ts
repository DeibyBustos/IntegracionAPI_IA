import { Router } from 'express';
import { chatController } from '../controllers/iaController.js';

export const iaRouter = Router();

// POST /api/chat  -> { message, system?, max_tokens?, temperature? }
iaRouter.post('/chat', chatController);
