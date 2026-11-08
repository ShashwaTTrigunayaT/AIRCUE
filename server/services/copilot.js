import { config } from '../config.js';
import { fetchJson } from '../utils/http.js';
import { HttpError } from '../utils/errors.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function copilotStatus() {
  const keyCount = config.groqApiKeys.length;
  return {
    enabled: keyCount > 0,
    provider: 'AIRCUE Copilot',
    model: keyCount ? config.groqModel : null,
    fallbackModels: keyCount ? config.groqFallbackModels : [],
    keyCount,
    reason: keyCount
      ? null
      : 'AIRCUE Copilot is disabled because GROQ_API_KEYS (or GROQ_API_KEY) is not configured on the server. All other AIR CUE features work without it, and insights fall back to rule-based explanations of the loaded data.',
  };
}

const GROUNDING_RULES = `GROUNDING RULES (mandatory):
1. Use ONLY the supplied CONTEXT for location-specific claims about air quality, pollutants, forecasts, history, timestamps and sources.
2. Never invent, estimate or fill in missing readings, timestamps, pollutant values, station names, model resolutions or causes of pollution.
3. If the context does not contain what is needed, say plainly that the available data is insufficient.
4. Always name the data source and whether it is observed, modelled or forecast when making a data claim. Unless the context says observed, assume modelled (Open-Meteo/CAMS).
5. Keep the AQI standard the context names. Never relabel a US or European AQI value as CPCB AQI, and never treat different AQI scales as directly comparable.
6. Explain pollutant concepts generally when asked, but label general knowledge clearly as general and separate it from live-data findings.
7. Do not diagnose medical conditions, do not give personal medical advice, and never claim that air is "safe" or that an activity is risk-free. For health concerns, suggest consulting a clinician.
8. Do not speculate about pollution causes (such as traffic, crop burning or fireworks) unless the context explicitly identifies a cause.
9. Be concise: at most 180 words, plain language, short paragraphs or bullets. No markdown tables.`;

const SYSTEM_PROMPT = `You are the AIRCUE Copilot, embedded in the AIR CUE air-quality intelligence app that turns pollution data into practical decisions.

${GROUNDING_RULES}
10. If the data timestamp is older than three hours, mention that the data may be stale.`;

const RETRIABLE_GROQ_STATUSES = new Set([401, 403, 408, 409, 429, 500, 502, 503, 504]);
let nextKeyIndex = 0;

function isModelUnavailable(error) {
  if (error?.status === 404) return true;
  if (error?.status !== 400) return false;
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('model') &&
    /(not found|not exist|does not exist|decommission|unsupported|invalid|no longer)/.test(message)
  );
}

function mapGroqFailure(error) {
  if (error instanceof HttpError) return error;
  if (isModelUnavailable(error)) {
    return new HttpError(
      502,
      'AI_MODEL_UNAVAILABLE',
      'No configured Groq model is available for this account. Check GROQ_MODEL and GROQ_FALLBACK_MODELS.',
    );
  }
  if (error?.status === 401 || error?.status === 403) {
    return new HttpError(502, 'AI_AUTH_FAILED', 'All configured Groq API keys were rejected, so AIRCUE Copilot is unavailable.');
  }
  if (error?.status === 429) {
    return new HttpError(503, 'AI_RATE_LIMITED', 'All configured Groq API keys are rate-limited right now. Try again in a moment.');
  }
  if (error?.code === 'UPSTREAM_TIMEOUT') {
    return new HttpError(504, 'AI_TIMEOUT', 'The AI provider did not respond in time. Your dashboard data is unaffected.');
  }
  if (error?.status === 400) {
    return new HttpError(502, 'AI_REQUEST_REJECTED', 'The AI provider rejected the request. Your dashboard data is unaffected.');
  }
  return new HttpError(502, 'AI_UNAVAILABLE', 'AIRCUE Copilot could not get a response from Groq. Your dashboard data is unaffected.');
}

export async function groqChat({ messages, temperature = 0.2, maxTokens = 550, timeout = 25000 }) {
  const keys = config.groqApiKeys;
  const models = config.groqModels;
  if (!keys.length) {
    throw new HttpError(503, 'AI_DISABLED', copilotStatus().reason);
  }

  const start = nextKeyIndex % keys.length;
  nextKeyIndex = (nextKeyIndex + 1) % keys.length;
  let lastError = null;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];

    for (let offset = 0; offset < keys.length; offset += 1) {
      const keyIndex = (start + offset) % keys.length;
      try {
        const payload = await fetchJson(GROQ_URL, {
          provider: 'Groq',
          timeout,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${keys[keyIndex]}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature,
            // Groq's current OpenAI-compatible endpoint expects max_completion_tokens.
            max_completion_tokens: maxTokens,
            messages,
          }),
        });

        const content = payload?.choices?.[0]?.message?.content?.trim();
        if (!content) {
          lastError = new HttpError(
            502,
            'AI_EMPTY_RESPONSE',
            'The AI provider returned an empty answer. Please try again.',
          );
          console.warn('[air-cue] Groq returned no message content.', {
            model,
            attempt: offset + 1,
            keys: keys.length,
            finishReason: payload?.choices?.[0]?.finish_reason || 'unknown',
            usage: payload?.usage || null,
          });
          continue;
        }

        return { content, model: payload.model || model };
      } catch (error) {
        lastError = error;
        if (isModelUnavailable(error)) {
          console.warn(`[air-cue] Groq model ${model} is unavailable for this account; trying the next configured model.`);
          break;
        }
        const retriable =
          RETRIABLE_GROQ_STATUSES.has(error?.status) ||
          error?.code === 'UPSTREAM_TIMEOUT' ||
          error?.code === 'UPSTREAM_UNREACHABLE';
        if (!retriable) throw mapGroqFailure(error);
        console.warn(
          `[air-cue] Groq attempt ${offset + 1}/${keys.length} failed on ${model} (${error?.status || error?.code || 'unknown'}); trying the next configured key.`,
        );
      }
    }

    if (modelIndex >= models.length - 1) break;
    if (lastError?.status === 401 || lastError?.status === 403) throw mapGroqFailure(lastError);
    console.warn(
      `[air-cue] Groq model ${model} did not answer (${lastError?.status || lastError?.code || 'unknown'}); trying fallback ${models[modelIndex + 1]}.`,
    );
  }

  throw mapGroqFailure(lastError);
}

export async function askCopilot({ question, context }) {
  const { content, model } = await groqChat({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `QUESTION FROM USER:\n${question}\n\nCONTEXT (JSON, the only permitted source for location-specific claims):\n${JSON.stringify(
          context,
        )}`,
      },
    ],
  });

  return {
    answer: content,
    model,
    provider: 'AIRCUE Copilot',
    generatedAt: new Date().toISOString(),
  };
}
