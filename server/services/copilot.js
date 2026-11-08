import { config } from '../config.js';
import { fetchJson } from '../utils/http.js';
import { HttpError } from '../utils/errors.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function copilotStatus() {
  return {
    enabled: Boolean(config.groqApiKey),
    provider: 'Groq',
    model: config.groqApiKey ? config.groqModel : null,
    reason: config.groqApiKey
      ? null
      : 'The AI assistant is disabled because GROQ_API_KEY is not configured on the server. All other AIR CUE features work without it, and insights fall back to rule-based explanations of the loaded data.',
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

const SYSTEM_PROMPT = `You are the AIR CUE Copilot, embedded in an air-quality intelligence app that turns pollution data into practical decisions.

${GROUNDING_RULES}
10. If the data timestamp is older than three hours, mention that the data may be stale.`;

export async function groqChat({ messages, temperature = 0.2, maxTokens = 550, timeout = 25000 }) {
  if (!config.groqApiKey) {
    throw new HttpError(503, 'AI_DISABLED', copilotStatus().reason);
  }

  const payload = await fetchJson(GROQ_URL, {
    provider: 'Groq',
    timeout,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.groqModel,
      temperature,
      // Groq's current OpenAI-compatible endpoint expects max_completion_tokens.
      max_completion_tokens: maxTokens,
      messages,
    }),
  }).catch((error) => {
    if (error?.status === 401 || error?.status === 403) {
      throw new HttpError(502, 'AI_AUTH_FAILED', 'Groq rejected the configured API key, so the AI assistant is unavailable.');
    }
    if (error?.status === 429) {
      throw new HttpError(503, 'AI_RATE_LIMITED', 'The AI provider rate limit was reached. Try again in a moment.');
    }
    if (error?.code === 'UPSTREAM_TIMEOUT') {
      throw new HttpError(504, 'AI_TIMEOUT', 'The AI provider did not respond in time. Your dashboard data is unaffected.');
    }
    throw error;
  });

  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    console.warn('[air-cue] Groq returned no message content.', {
      finishReason: payload?.choices?.[0]?.finish_reason || 'unknown',
      usage: payload?.usage || null,
    });
    throw new HttpError(502, 'AI_EMPTY_RESPONSE', 'The AI provider returned an empty answer. Please try again.');
  }

  return { content, model: payload.model || config.groqModel };
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
    provider: 'Groq',
    generatedAt: new Date().toISOString(),
  };
}
