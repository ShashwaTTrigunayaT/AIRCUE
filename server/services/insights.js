import { groqChat, copilotStatus } from './copilot.js';
import { AQI_STANDARDS } from '../utils/aqi.js';

const timeLabel = (iso, timezone) => {
  if (!iso) return 'unknown time';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

/**
 * Rule-based insights use only values already computed from the loaded dataset.
 * Every entry carries its basis so the UI can show why it exists.
 */
export function ruleBasedInsights({ current, forecast, history }) {
  const insights = [];
  const primaryId = current.primaryStandard;
  const primary = primaryId ? current.aqi[primaryId] : null;
  const timezone = current.location?.timezone;

  if (primary?.valid && primary.dominant) {
    insights.push({
      title: `${primary.dominant.label} drives the current ${primaryId === 'CPCB' ? 'CPCB AQI' : primaryId === 'US' ? 'US AQI' : 'EU AQI'}`,
      detail: `${AQI_STANDARDS[primaryId]?.label || primaryId} is ${primary.value} (${primary.category.label}). ${primary.dominant.label} has the highest ${primaryId === 'CPCB' ? 'CPCB sub-index' : 'provider sub-index'} at ${primary.dominant.subIndex}.`,
      basis: 'dominant pollutant from the current reading',
    });
  }

  if (current.trend) {
    const verb =
      current.trend.direction === 'rising'
        ? 'higher'
        : current.trend.direction === 'falling'
          ? 'lower'
          : 'about level';
    insights.push({
      title: `${current.trend.label} is ${current.trend.direction}`,
      detail: `${current.trend.label} averaged ${current.trend.recentAverage} µg/m³ over the last 6 hours, ${verb} than the previous 6 hours${
        current.trend.direction === 'stable' ? '.' : ` (${Math.abs(current.trend.deltaPct)}% change).`
      }`,
      basis: 'hourly modelled values, last 12 hours',
    });
  }

  const aqiHours = (forecast?.hourly || []).filter((hour) => typeof hour.us_aqi === 'number');
  if (aqiHours.length >= 6) {
    const peak = aqiHours.reduce((best, hour) => (hour.us_aqi > best.us_aqi ? hour : best), aqiHours[0]);
    insights.push({
      title: `Forecast US AQI peaks at ${Math.round(peak.us_aqi)}`,
      detail: `The highest provider US AQI in the next ${aqiHours.length} forecast hours is expected around ${timeLabel(peak.time, timezone)}. This is a modelled forecast, not an observation.`,
      basis: 'hourly US AQI forecast (Open-Meteo)',
    });
  }

  const bestWindow = forecast?.outdoorWindows?.durations?.['60']?.windows?.[0];
  if (bestWindow) {
    insights.push({
      title: 'Comparatively lower pollution window forecast',
      detail: `For a one-hour outing, the best-ranked forecast window starts around ${timeLabel(bestWindow.startTime, timezone)} with mean PM2.5 of ${bestWindow.meanPm25} µg/m³. This is a relative ranking, not a safety guarantee.`,
      basis: 'forecast PM2.5 window scoring',
    });
  }

  const weeklyChange = history?.change24h?.pm2_5;
  if (typeof weeklyChange === 'number' && Math.abs(weeklyChange) >= 10) {
    insights.push({
      title: `PM2.5 is ${weeklyChange > 0 ? 'up' : 'down'} ${Math.abs(weeklyChange)}% versus the previous day`,
      detail: `Comparing the last 24 hours with the 24 hours before, modelled PM2.5 daily means differ by ${Math.abs(weeklyChange)}%. Both periods come from the same provider and measurement type.`,
      basis: '24-hour modelled historical averages',
    });
  }

  return insights;
}

const INSIGHT_PROMPT = `You write AIR CUE pollution insights.

STRICT RULES:
- Use only the supplied CONTEXT. Never invent readings, timestamps, causes or forecasts.
- Each insight must quote or clearly reference values from the context and name the AQI standard when quoting an AQI.
- Label modelled data as modelled. Do not call it measured.
- Do not diagnose, do not guarantee safety, and do not speculate about pollution causes.
- Return ONLY a JSON array of 2-3 objects: [{"title": "...", "detail": "..."}].
- Titles at most 9 words. Details at most 26 words. Plain text, no markdown.`;

function parseInsights(content) {
  const cleaned = content
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    const insights = parsed
      .filter((entry) => entry && typeof entry.title === 'string' && typeof entry.detail === 'string')
      .slice(0, 3)
      .map((entry) => ({ title: entry.title.trim().slice(0, 120), detail: entry.detail.trim().slice(0, 400) }));
    return insights.length ? insights : null;
  } catch {
    return null;
  }
}

export async function generateInsights({ context, current, forecast, history }) {
  const fallback = ruleBasedInsights({ current, forecast, history });

  if (!copilotStatus().enabled) {
    return { insights: fallback, source: 'rules', model: null, note: 'Generated by AIR CUE rules from the loaded dataset.' };
  }

  try {
    const { content, model } = await groqChat({
      messages: [
        { role: 'system', content: INSIGHT_PROMPT },
        { role: 'user', content: `CONTEXT:\n${JSON.stringify(context)}` },
      ],
      temperature: 0.2,
      // gpt-oss models spend completion tokens on internal reasoning before content;
      // a small budget can produce an empty answer.
      maxTokens: 1200,
      timeout: 25000,
    });

    const insights = parseInsights(content);
    if (!insights) throw new Error('Unparseable insight response');

    return {
      insights,
      source: 'groq',
      model,
      note: 'Generated by AIRCUE Copilot (Groq) from the loaded AIR CUE dataset. AI can be wrong; verify against the dashboard values.',
    };
  } catch (error) {
    return {
      insights: fallback,
      source: 'rules',
      model: null,
      note: 'The AI insight service was unavailable, so AIR CUE used its rule-based insights from the loaded dataset.',
      aiError: error?.message || 'AI unavailable',
    };
  }
}
