import cors, { CorsOptions } from 'cors';
import { ENV } from './env.js';

export const corsMiddleware = cors({
  origin(origin, cb) {
    // Permite herramientas locales (curl, Postman) sin origin
    if (!origin) return cb(null, true);
    if (ENV.ALLOWED_ORIGINS.length === 0) return cb(null, true);
    if (ENV.ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
});
