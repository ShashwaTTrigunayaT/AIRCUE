import 'dotenv/config';

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const splitList = (value) =>
  String(value || '')
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const groqApiKeys = [
  ...new Set([...splitList(process.env.GROQ_API_KEYS), ...splitList(process.env.GROQ_API_KEY)]),
];

const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const groqModels = [
  ...new Set([
    groqModel,
    ...splitList(process.env.GROQ_FALLBACK_MODELS || 'openai/gpt-oss-20b,qwen/qwen3.8-27b'),
  ]),
];

export const config = {
  port: num(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  groqApiKeys,
  groqApiKey: groqApiKeys[0] || '',
  groqModel,
  groqModels,
  groqFallbackModels: groqModels.slice(1),
  openAqApiKey: process.env.OPENAQ_API_KEY || '',
  mongodbUri: process.env.MONGODB_URI || '',
  mongodbDb: process.env.MONGODB_DB || 'aircue',
  corsOrigin: process.env.CORS_ORIGIN || '',
  cacheTtlMs: num(process.env.CACHE_TTL_MS, 5 * 60 * 1000),
  upstreamTimeoutMs: num(process.env.UPSTREAM_TIMEOUT_MS, 12000),
  version: '1.0.0',
};
