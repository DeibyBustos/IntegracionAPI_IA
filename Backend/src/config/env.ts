import 'dotenv/config';

function req(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

export const ENV = {
  HF_TOKEN: req('HF_TOKEN'),
  MODEL_ID: req('MODEL_ID'),
  PORT: Number(process.env.PORT ?? 3000),
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean),
};
