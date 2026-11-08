import 'dotenv/config';

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const splitGroqKeys = (value) =>
  String(value || '')
    .split(/[\s,;]+/)
    .map((key) => key.trim())
    .filter(Boolean);

const groqApiKeys = [
  ...new Set([...splitGroqKeys(process.env.GROQ_API_KEYS), ...splitGroqKeys(process.env.GROQ_API_KEY)]),
];

export const config = {
  port: num(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  groqApiKeys,
  groqApiKey: groqApiKeys[0] || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  openAqApiKey: process.env.OPENAQ_API_KEY || '',
  mongodbUri: process.env.MONGODB_URI || '',
  mongodbDb: process.env.MONGODB_DB || 'aircue',
  corsOrigin: process.env.CORS_ORIGIN || '',
  cacheTtlMs: num(process.env.CACHE_TTL_MS, 5 * 60 * 1000),
  upstreamTimeoutMs: num(process.env.UPSTREAM_TIMEOUT_MS, 12000),
  version: '1.0.0',
};
