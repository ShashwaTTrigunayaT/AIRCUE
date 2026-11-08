import { POLLUTANT_BY_KEY } from './pollutants.js';

/**
 * AQI standards supported by AIR CUE.
 *
 * Important: AQI values are not interchangeable across standards.
 * - CPCB values in this app are computed by AIR CUE from hourly concentrations
 *   using CPCB breakpoints and CPCB averaging requirements. Inputs are modelled
 *   Open-Meteo/CAMS hourly values, not CPCB monitoring-station data.
 * - US and EU values are supplied by Open-Meteo (provider-defined indices).
 *   They are never relabelled or converted into CPCB values.
 */
export const AQI_STANDARDS = {
  CPCB: {
    id: 'CPCB',
    shortLabel: 'CPCB',
    label: 'CPCB AQI (India)',
    authority: 'Central Pollution Control Board, India',
    scale: '0–500',
    averaging: '24-hour averages (8-hour for O₃ and CO)',
    note:
      'Computed by AIR CUE from hourly modelled concentrations using CPCB breakpoints. Requires at least three valid pollutants including PM2.5 or PM10.',
  },
  US: {
    id: 'US',
    shortLabel: 'US AQI',
    label: 'US EPA AQI',
    authority: 'United States Environmental Protection Agency',
    scale: '0–500',
    averaging: 'Provider-defined hourly index',
    note: 'Supplied by Open-Meteo as the US AQI. Not a CPCB value and not directly comparable to one.',
  },
  EU: {
    id: 'EU',
    shortLabel: 'EU AQI',
    label: 'European AQI',
    authority: 'European Environment Agency',
    scale: '0–100+',
    averaging: 'Provider-defined hourly index',
    note: 'Supplied by Open-Meteo as the European AQI. Uses a different scale from CPCB and US AQI.',
  },
};

const CPCB_CATEGORIES = [
  { max: 50, key: 'good', label: 'Good' },
  { max: 100, key: 'satisfactory', label: 'Satisfactory' },
  { max: 200, key: 'moderate', label: 'Moderate' },
  { max: 300, key: 'poor', label: 'Poor' },
  { max: 400, key: 'veryPoor', label: 'Very Poor' },
  { max: Infinity, key: 'severe', label: 'Severe' },
];

const US_CATEGORIES = [
  { max: 50, key: 'good', label: 'Good' },
  { max: 100, key: 'moderate', label: 'Moderate' },
  { max: 150, key: 'usg', label: 'Unhealthy for Sensitive Groups' },
  { max: 200, key: 'unhealthy', label: 'Unhealthy' },
  { max: 300, key: 'veryUnhealthy', label: 'Very Unhealthy' },
  { max: Infinity, key: 'hazardous', label: 'Hazardous' },
];

const EU_CATEGORIES = [
  { max: 20, key: 'good', label: 'Good' },
  { max: 40, key: 'fair', label: 'Fair' },
  { max: 60, key: 'moderate', label: 'Moderate' },
  { max: 80, key: 'poor', label: 'Poor' },
  { max: 100, key: 'veryPoor', label: 'Very Poor' },
  { max: Infinity, key: 'extremelyPoor', label: 'Extremely Poor' },
];

const CATEGORY_TABLE = { CPCB: CPCB_CATEGORIES, US: US_CATEGORIES, EU: EU_CATEGORIES };

export function categorize(standard, value) {
  const table = CATEGORY_TABLE[standard];
  if (!table || !Number.isFinite(value)) return null;
  const found = table.find((entry) => value <= entry.max) || table[table.length - 1];
  return { key: found.key, label: found.label };
}

/** CPCB concentration breakpoints. CO is expressed in mg/m³ (CPCB convention). */
const CPCB_BREAKPOINTS = {
  pm2_5: [
    [0, 30, 0, 50],
    [30, 60, 51, 100],
    [60, 90, 101, 200],
    [90, 120, 201, 300],
    [120, 250, 301, 400],
    [250, 500, 401, 500],
  ],
  pm10: [
    [0, 50, 0, 50],
    [50, 100, 51, 100],
    [100, 250, 101, 200],
    [250, 350, 201, 300],
    [350, 430, 301, 400],
    [430, 600, 401, 500],
  ],
  nitrogen_dioxide: [
    [0, 40, 0, 50],
    [40, 80, 51, 100],
    [80, 180, 101, 200],
    [180, 280, 201, 300],
    [280, 400, 301, 400],
    [400, 800, 401, 500],
  ],
  sulphur_dioxide: [
    [0, 40, 0, 50],
    [40, 80, 51, 100],
    [80, 380, 101, 200],
    [380, 800, 201, 300],
    [800, 1600, 301, 400],
    [1600, 2000, 401, 500],
  ],
  ozone: [
    [0, 50, 0, 50],
    [50, 100, 51, 100],
    [100, 168, 101, 200],
    [168, 208, 201, 300],
    [208, 748, 301, 400],
    [748, 1000, 401, 500],
  ],
  carbon_monoxide: [
    [0, 1, 0, 50],
    [1, 2, 51, 100],
    [2, 10, 101, 200],
    [10, 17, 201, 300],
    [17, 34, 301, 400],
    [34, 50, 401, 500],
  ],
};

export function cpcbSubIndex(pollutant, concentration) {
  const table = CPCB_BREAKPOINTS[pollutant];
  if (!table || !Number.isFinite(concentration) || concentration < 0) return null;

  for (const [cLow, cHigh, iLow, iHigh] of table) {
    if (concentration <= cHigh) {
      const index = iLow + ((iHigh - iLow) / (cHigh - cLow)) * (Math.max(concentration, cLow) - cLow);
      return { value: Math.round(index), capped: false };
    }
  }
  return { value: 500, capped: true };
}

/** Averaging requirements per CPCB. minCount enforces enough hourly coverage for a valid average. */
const CPCB_RULES = [
  { key: 'pm2_5', hours: 24, minCount: 18 },
  { key: 'pm10', hours: 24, minCount: 18 },
  { key: 'nitrogen_dioxide', hours: 24, minCount: 18 },
  { key: 'sulphur_dioxide', hours: 24, minCount: 18 },
  { key: 'ozone', hours: 8, minCount: 6 },
  { key: 'carbon_monoxide', hours: 8, minCount: 6 },
];

function meanWindow(values, endIndex, hours, minCount) {
  const start = endIndex - hours + 1;
  if (start < 0) return null;
  const window = values.slice(start, endIndex + 1).filter((v) => Number.isFinite(v));
  if (window.length < minCount) return null;
  return {
    average: window.reduce((sum, v) => sum + v, 0) / window.length,
    count: window.length,
    expected: hours,
  };
}

/**
 * Compute a CPCB AQI only when CPCB validity requirements are met.
 * Returns { valid:false, reason } otherwise — it never guesses missing pollutants.
 */
export function computeCpcbAqi(series, endIndex) {
  if (!series || !Number.isFinite(endIndex) || endIndex < 0) {
    return { standard: 'CPCB', valid: false, reason: 'No hourly data is available for this location.' };
  }

  const subIndices = [];
  const missing = [];

  for (const rule of CPCB_RULES) {
    const values = series[rule.key];
    const meta = POLLUTANT_BY_KEY[rule.key];
    const window = values ? meanWindow(values, endIndex, rule.hours, rule.minCount) : null;
    if (!window) {
      missing.push({
        pollutant: rule.key,
        label: meta?.label || rule.key,
        reason: `Needs at least ${rule.minCount} of the last ${rule.hours} hourly values.`,
      });
      continue;
    }

    // Open-Meteo reports CO in µg/m³; CPCB breakpoints for CO are in mg/m³.
    const concentration = rule.key === 'carbon_monoxide' ? window.average / 1000 : window.average;
    const index = cpcbSubIndex(rule.key, concentration);
    if (!index) continue;

    subIndices.push({
      pollutant: rule.key,
      label: meta?.label || rule.key,
      name: meta?.name || rule.key,
      concentration: Number(concentration.toFixed(rule.key === 'carbon_monoxide' ? 2 : 1)),
      concentrationUnit: rule.key === 'carbon_monoxide' ? 'mg/m³' : 'µg/m³',
      averagingHours: rule.hours,
      hourlyCoverage: `${window.count}/${rule.hours} hours`,
      subIndex: index.value,
      capped: index.capped,
    });
  }

  const hasCoarseParticle = subIndices.some((entry) => entry.pollutant === 'pm2_5' || entry.pollutant === 'pm10');

  if (subIndices.length < 3 || !hasCoarseParticle) {
    return {
      standard: 'CPCB',
      valid: false,
      reason:
        'The CPCB AQI requires at least three valid pollutants including PM2.5 or PM10, with the required averaging periods.',
      availableSubIndices: subIndices,
      missing,
    };
  }

  const highest = subIndices.reduce((best, entry) => (entry.subIndex > best.subIndex ? entry : best), subIndices[0]);
  const category = categorize('CPCB', highest.subIndex);

  return {
    standard: 'CPCB',
    valid: true,
    value: highest.subIndex,
    category,
    dominant: {
      pollutant: highest.pollutant,
      label: highest.label,
      name: highest.name,
      subIndex: highest.subIndex,
      concentration: highest.concentration,
      unit: highest.concentrationUnit,
      averagingHours: highest.averagingHours,
      basis: 'highest CPCB sub-index',
    },
    subIndices,
    missing,
    averagedOverHours: 24,
    computedBy: 'AIR CUE (CPCB breakpoints)',
    cappingApplied: subIndices.some((entry) => entry.capped),
  };
}

/** Provider-supported US AQI attribution: the largest provided per-pollutant sub-index. */
export function computeUsDominant(series, endIndex) {
  const candidates = [
    ['pm2_5', 'us_aqi_pm2_5'],
    ['pm10', 'us_aqi_pm10'],
    ['nitrogen_dioxide', 'us_aqi_nitrogen_dioxide'],
    ['sulphur_dioxide', 'us_aqi_sulphur_dioxide'],
    ['ozone', 'us_aqi_ozone'],
    ['carbon_monoxide', 'us_aqi_carbon_monoxide'],
  ]
    .map(([pollutant, variable]) => {
      const values = series?.[variable];
      const value = values ? values[endIndex] : null;
      if (!Number.isFinite(value)) return null;
      const meta = POLLUTANT_BY_KEY[pollutant];
      return {
        pollutant,
        label: meta?.label || pollutant,
        name: meta?.name || pollutant,
        subIndex: Math.round(value),
        unit: 'index',
        basis: 'highest provider US AQI sub-index',
      };
    })
    .filter(Boolean);

  if (!candidates.length) return null;
  return candidates.reduce((best, entry) => (entry.subIndex > best.subIndex ? entry : best), candidates[0]);
}

/**
 * Trend from hourly values: mean of the most recent 6 hours vs the previous 6 hours.
 * Only describes the supplied series; does not explain causes.
 */
export function computeTrend(series, endIndex) {
  const key = ['pm2_5', 'pm10'].find((candidate) => {
    const values = series?.[candidate];
    return values && Number.isFinite(values[endIndex]) && Number.isFinite(values[endIndex - 1]);
  });
  if (!key || endIndex < 12) return null;

  const values = series[key];
  const recent = meanWindow(values, endIndex, 6, 4);
  const previous = meanWindow(values, endIndex - 6, 6, 4);
  if (!recent || !previous || previous.average <= 0) return null;

  const delta = recent.average - previous.average;
  const deltaPct = (delta / previous.average) * 100;
  let direction = 'stable';
  if (deltaPct >= 5) direction = 'rising';
  else if (deltaPct <= -5) direction = 'falling';

  return {
    pollutant: key,
    label: POLLUTANT_BY_KEY[key]?.label || key,
    unit: 'µg/m³',
    direction,
    deltaPct: Number(deltaPct.toFixed(1)),
    recentAverage: Number(recent.average.toFixed(1)),
    previousAverage: Number(previous.average.toFixed(1)),
    comparedHours: 'Last 6 hours vs the previous 6 hours',
  };
}

export function summarizeSeries(values, startIndex, endIndex) {
  if (!values || startIndex < 0 || endIndex < startIndex) return null;
  const window = values.slice(startIndex, endIndex + 1).filter((v) => Number.isFinite(v));
  if (!window.length) return null;
  const average = window.reduce((sum, v) => sum + v, 0) / window.length;
  return {
    average: Number(average.toFixed(1)),
    min: Number(Math.min(...window).toFixed(1)),
    max: Number(Math.max(...window).toFixed(1)),
    count: window.length,
  };
}
