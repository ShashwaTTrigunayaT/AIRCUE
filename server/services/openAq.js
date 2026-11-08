import { config } from '../config.js';
import { getOrSet } from '../utils/cache.js';
import { fetchJson } from '../utils/http.js';

const BASE_URL = 'https://api.openaq.org/v3';
const STATIONS_TTL_MS = 10 * 60 * 1000;
const MAX_STATIONS = 5;

const PARAMETER_MAP = {
  pm25: { key: 'pm2_5', label: 'PM2.5' },
  pm2p5: { key: 'pm2_5', label: 'PM2.5' },
  pm10: { key: 'pm10', label: 'PM10' },
  no2: { key: 'nitrogen_dioxide', label: 'NO₂' },
  so2: { key: 'sulphur_dioxide', label: 'SO₂' },
  o3: { key: 'ozone', label: 'O₃' },
  co: { key: 'carbon_monoxide', label: 'CO' },
};

function normalizeParameterName(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function stationReading(measurement, sensorMap) {
  const sensorId = measurement.sensorsId;
  const sensor = sensorMap.get(sensorId);
  // Some OpenAQ responses include the parameter directly on the measurement;
  // prefer the sensor metadata when present but accept either shape.
  const parameter = sensor?.parameter || measurement.parameter;
  const rawName = normalizeParameterName(parameter?.name);
  const mapped = PARAMETER_MAP[rawName];
  const numericValue = Number(measurement.value);

  return {
    pollutant: mapped?.key || null,
    label: mapped?.label || parameter?.displayName || parameter?.name || 'Unknown parameter',
    parameterName: parameter?.name || null,
    value: Number.isFinite(numericValue) ? numericValue : null,
    unit: (parameter?.units || '').replace(/\u03bc/g, '\u00b5') || null,
    at: measurement.datetime?.utc || measurement.datetime?.local || null,
  };
}

async function fetchLatestForLocation(location, headers) {
  const sensorMap = new Map((location.sensors || []).map((sensor) => [sensor.id, sensor]));
  const payload = await fetchJson(`${BASE_URL}/locations/${location.id}/latest`, { headers, provider: 'OpenAQ' });
  const readings = (payload.results || [])
    .map((measurement) => stationReading(measurement, sensorMap))
    .filter((reading) => reading.pollutant && reading.value !== null);

  return {
    id: location.id,
    name: location.name || 'Unnamed station',
    locality: location.locality || null,
    country: location.country?.name || null,
    countryCode: location.country?.code || null,
    latitude: location.coordinates?.latitude ?? null,
    longitude: location.coordinates?.longitude ?? null,
    distanceMeters: Number.isFinite(location.distance) ? Math.round(location.distance) : null,
    isMonitor: Boolean(location.isMonitor),
    isMobile: Boolean(location.isMobile),
    lastUpdated: location.lastUpdated || null,
    provider: 'OpenAQ',
    measurementType: 'observed',
    readings,
    note: 'Station readings are observations. AIR CUE does not compute an AQI from a single station reading in this build, so no AQI category is assigned to station markers.',
  };
}

export async function getStations({ lat, lon, radius }) {
  if (!config.openAqApiKey) {
    return {
      available: false,
      configured: false,
      provider: 'OpenAQ',
      fetchedAt: new Date().toISOString(),
      stations: [],
      reason:
        'OpenAQ station observations are optional in AIR CUE. This deployment has no OPENAQ_API_KEY configured, so only modelled city data is shown.',
      howToEnable:
        'Add OPENAQ_API_KEY to the server environment, obtain a free key from https://docs.openaq.org/using-the-api/api-key, then reload.',
    };
  }

  const cacheKey = `stations:${lat.toFixed(2)}:${lon.toFixed(2)}:${radius}`;

  return getOrSet(cacheKey, STATIONS_TTL_MS, async () => {
    const headers = { 'X-API-Key': config.openAqApiKey };
    const params = new URLSearchParams({
      coordinates: `${lat},${lon}`,
      radius: String(radius),
      limit: '10',
    });

    let payload;
    try {
      payload = await fetchJson(`${BASE_URL}/locations?${params.toString()}`, { headers, provider: 'OpenAQ' });
    } catch (error) {
      return {
        available: false,
        configured: true,
        provider: 'OpenAQ',
        fetchedAt: new Date().toISOString(),
        stations: [],
        reason:
          error?.status === 401 || error?.status === 403
            ? 'OpenAQ rejected the configured API key. Station observations are unavailable; modelled city data still works.'
            : error?.status === 429
              ? 'OpenAQ rate limit reached. Try again shortly; modelled city data still works.'
              : 'OpenAQ could not be reached. Modelled city data still works.',
      };
    }

    const nearest = (payload.results || [])
      .filter((location) => Number.isFinite(location.coordinates?.latitude) && Number.isFinite(location.coordinates?.longitude))
      .slice(0, MAX_STATIONS);

    const settled = await Promise.allSettled(nearest.map((location) => fetchLatestForLocation(location, headers)));
    const stations = settled
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);

    return {
      available: true,
      configured: true,
      provider: 'OpenAQ',
      fetchedAt: new Date().toISOString(),
      searchedRadiusMeters: radius,
      stations,
      reason: stations.length
        ? null
        : 'No OpenAQ monitoring stations with recent readings were found near this location.',
      attribution: 'Station data: OpenAQ (https://openaq.org)',
    };
  });
}
