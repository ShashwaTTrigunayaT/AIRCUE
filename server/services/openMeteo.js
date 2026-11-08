import { getOrSet } from '../utils/cache.js';
import { fetchJson } from '../utils/http.js';
import { HttpError } from '../utils/errors.js';
import { US_SUBINDEX_VARS } from '../utils/pollutants.js';

const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const CORE_VARS = [
  'pm2_5',
  'pm10',
  'nitrogen_dioxide',
  'sulphur_dioxide',
  'ozone',
  'carbon_monoxide',
  'us_aqi',
  'european_aqi',
];

export const HOURLY_VARS = [...CORE_VARS, ...Object.keys(US_SUBINDEX_VARS)];

const PAST_DAYS = 7;
const FORECAST_DAYS = 4;
const AIR_TTL_MS = 5 * 60 * 1000;
const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000;

const DEFAULT_UNITS = {
  pm2_5: 'µg/m³',
  pm10: 'µg/m³',
  nitrogen_dioxide: 'µg/m³',
  sulphur_dioxide: 'µg/m³',
  ozone: 'µg/m³',
  carbon_monoxide: 'µg/m³',
  us_aqi: 'index',
  european_aqi: 'index',
};

function cleanUnit(unit) {
  if (!unit) return null;
  // Open-Meteo returns U+03BC (Greek mu); normalize to U+00B5 for consistent display.
  return unit.replace(/\u03bc/g, '\u00b5');
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Convert the provider payload into a normalized series with absolute ISO timestamps.
 * Open-Meteo returns naive local timestamps plus utc_offset_seconds, so we convert
 * to UTC ISO strings and keep the provider timezone for display.
 */
export function normalizeSeries(data) {
  if (!data || !Array.isArray(data.hourly?.time)) {
    throw new HttpError(502, 'MALFORMED_PROVIDER_DATA', 'The air-quality provider returned no hourly data for this location.');
  }

  const utcOffsetSeconds = Number(data.utc_offset_seconds) || 0;
  const localTimes = data.hourly.time;
  const time = localTimes.map((entry) => new Date(Date.parse(`${entry}:00Z`) - utcOffsetSeconds * 1000).toISOString());

  const series = {};
  const units = {};
  for (const key of HOURLY_VARS) {
    const values = data.hourly[key];
    series[key] = Array.isArray(values) ? values.map(numberOrNull) : new Array(localTimes.length).fill(null);
    units[key] = cleanUnit(data.hourly_units?.[key]) || DEFAULT_UNITS[key] || null;
  }

  const now = Date.now();
  let currentIndex = -1;
  for (let i = 0; i < time.length; i += 1) {
    if (Date.parse(time[i]) <= now + 15 * 60 * 1000) currentIndex = i;
    else break;
  }
  if (currentIndex < 0) currentIndex = 0;

  return {
    provider: 'Open-Meteo',
    dataset: 'CAMS atmospheric composition model (served by the Open-Meteo air-quality API)',
    measurementType: 'modelled',
    spatialResolution:
      'Gridded model output. Resolution depends on the CAMS domain (roughly 11 km over Europe, ~40 km globally). This is not a local monitoring station.',
    latitude: data.latitude,
    longitude: data.longitude,
    elevation: data.elevation,
    timezone: data.timezone || 'UTC',
    timezoneAbbreviation: data.timezone_abbreviation || null,
    utcOffsetSeconds,
    time,
    localTimes,
    units,
    series,
    currentIndex,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getAirQualitySeries(lat, lon, { pastDays = PAST_DAYS, forecastDays = FORECAST_DAYS } = {}) {
  const cacheKey = `air:${lat.toFixed(3)}:${lon.toFixed(3)}:${pastDays}:${forecastDays}`;

  return getOrSet(cacheKey, AIR_TTL_MS, async () => {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      timezone: 'auto',
      past_days: String(pastDays),
      forecast_days: String(forecastDays),
      hourly: HOURLY_VARS.join(','),
    });

    const payload = await fetchJson(`${AIR_URL}?${params.toString()}`, { provider: 'Open-Meteo' });
    return normalizeSeries(payload);
  });
}

/** Batch fetch used by the map's modelled city layer. */
export async function getAirQualitySeriesBatch(points) {
  if (!points.length) return { fetchedAt: new Date().toISOString(), series: [], cached: false };

  const cacheKey = `air-batch:${points.map((p) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`).join('|')}`;

  return getOrSet(cacheKey, AIR_TTL_MS, async () => {
    const params = new URLSearchParams({
      latitude: points.map((p) => p.lat).join(','),
      longitude: points.map((p) => p.lon).join(','),
      timezone: 'auto',
      past_days: '2',
      forecast_days: '1',
      hourly: HOURLY_VARS.join(','),
    });

    const payload = await fetchJson(`${AIR_URL}?${params.toString()}`, { provider: 'Open-Meteo' });
    const items = Array.isArray(payload) ? payload : [payload];
    return {
      fetchedAt: new Date().toISOString(),
      series: items.map((item) => normalizeSeries(item)),
    };
  });
}

export async function geocode(query, count = 8) {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (trimmed.length < 2) {
    throw new HttpError(400, 'QUERY_TOO_SHORT', 'Enter at least two characters to search for a place.');
  }

  const params = new URLSearchParams({
    name: trimmed,
    count: String(Math.min(Math.max(count, 1), 10)),
    language: 'en',
    format: 'json',
  });

  return getOrSet(`geo:${trimmed.toLowerCase()}:${count}`, GEOCODE_TTL_MS, async () => {
    const payload = await fetchJson(`${GEOCODING_URL}?${params.toString()}`, { provider: 'Open-Meteo Geocoding' });
    const results = (payload.results || []).map((place) => ({
      id: place.id,
      name: place.name,
      admin1: place.admin1 || null,
      admin2: place.admin2 || null,
      country: place.country || null,
      countryCode: place.country_code || null,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone || null,
      population: place.population ?? null,
      elevation: place.elevation ?? null,
      featureCode: place.feature_code || null,
    }));

    return {
      fetchedAt: new Date().toISOString(),
      query: trimmed,
      results,
      provider: 'Open-Meteo Geocoding',
    };
  });
}
