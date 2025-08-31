import { Router } from 'express';
import { chatController } from '../controllers/iaController.js';

export const iaRouter = Router();

iaRouter.post('/chat', chatController);
