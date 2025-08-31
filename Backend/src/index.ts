import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { corsMiddleware } from './config/cors.js';
import { iaRouter } from './routes/iaRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { ENV } from './config/env.js';

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));

// Rate limit básico para proteger tu endpoint
const limiter = rateLimit({
  windowMs: 60_000, // 1 min
  max: 30,          // 30 req/min/ip
});
app.use('/api', limiter);

// Rutas
app.use('/api', iaRouter);

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true, service: 'hf-backend', model: ENV.MODEL_ID }));

// Errores
app.use(errorHandler);

app.listen(ENV.PORT, () => {
  console.log(`🚀 API lista en http://localhost:${ENV.PORT}`);
});
