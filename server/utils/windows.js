import { POLLUTANT_BY_KEY } from './pollutants.js';
import { categorize } from './aqi.js';

/**
 * Best Outdoor Window scoring.
 *
 * Windows are ranked by forecast PM2.5 concentration only: a CPCB AQI cannot be
 * computed for these windows because CPCB requires 24-hour averaging,
 * and mixing standards inside one ranking would be misleading.
 *
 * Score = 65% mean PM2.5 + 35% peak PM2.5 for the window (lower is better).
 * The US AQI mean is included as context, clearly labelled as a different standard.
 */
// Whole hours only: the provider forecast is hourly, so sub-hour windows would
// imply precision the data does not have.
const DURATIONS = [60, 120, 180];
const HORIZON_HOURS = 48;
const TOP_WINDOWS = 3;

function mean(values) {
  const valid = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  return valid.length ? valid.reduce((sum, v) => sum + v, 0) / valid.length : null;
}

export function computeOutdoorWindows(series) {
  const startIndex = series.currentIndex;
  const metricKey = 'pm2_5';
  const metricLabel = POLLUTANT_BY_KEY[metricKey]?.label || 'PM2.5';
  const maxStart = Math.min(series.time.length - 1, startIndex + HORIZON_HOURS);

  const durations = {};

  for (const duration of DURATIONS) {
    const hours = duration / 60;
    const candidates = [];

    for (let start = startIndex; start + hours - 1 <= maxStart; start += 1) {
      const end = start + hours - 1;
      const pmValues = [];
      const aqiValues = [];
      let complete = true;

      for (let i = start; i <= end; i += 1) {
        const pm = series.series[metricKey]?.[i];
        if (typeof pm !== 'number' || !Number.isFinite(pm)) {
          complete = false;
          break;
        }
        pmValues.push(pm);
        const aqi = series.series.us_aqi?.[i];
        if (typeof aqi === 'number' && Number.isFinite(aqi)) aqiValues.push(aqi);
      }

      if (!complete || !pmValues.length) continue;

      const meanPm = mean(pmValues);
      const peakPm = Math.max(...pmValues);
      const meanAqi = mean(aqiValues);
      const score = 0.65 * meanPm + 0.35 * peakPm;

      // A window starting at 15:00 with one hourly value ends at 16:00, not 15:00.
      const endInstant = new Date(Date.parse(series.time[end]) + 60 * 60 * 1000).toISOString();

      candidates.push({
        startTime: series.time[start],
        endTime: endInstant,
        durationMinutes: duration,
        meanPm25: Number(meanPm.toFixed(1)),
        peakPm25: Number(peakPm.toFixed(1)),
        meanUsAqi: meanAqi === null ? null : Math.round(meanAqi),
        usAqiCategory: meanAqi === null ? null : categorize('US', meanAqi),
        score: Number(score.toFixed(2)),
        hoursCovered: pmValues.length,
        granularity: 'whole forecast hours',
      });
    }

    candidates.sort((a, b) => a.score - b.score || a.startTime.localeCompare(b.startTime));
    durations[String(duration)] = {
      durationMinutes: duration,
      availableWindows: candidates.length,
      windows: candidates.slice(0, TOP_WINDOWS),
      worstWindow: candidates.length ? candidates[candidates.length - 1] : null,
    };
  }

  return {
    metric: metricKey,
    metricLabel,
    metricUnit: series.units?.[metricKey] || 'µg/m³',
    method:
      'For each available contiguous window, AIR CUE scores the forecast with 65% mean PM2.5 plus 35% peak PM2.5. Lower scores rank better. Windows are whole forecast hours (60, 120 or 180 minutes) because the forecast itself is hourly.',
    rankingBasis:
      'Ranking uses forecast PM2.5 concentration only. A CPCB AQI is not computed for these windows because CPCB requires 24-hour averaging; the US AQI shown alongside is a separate provider index.',
    isRelativeComparison: true,
    disclaimer:
      'This is a relative comparison of forecast pollution, not a declaration that the air is safe or that an activity is risk-free.',
    horizonHours: HORIZON_HOURS,
    durations,
  };
}
