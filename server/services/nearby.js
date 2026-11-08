import { CITIES } from '../data/cities.js';
import { getAirQualitySeriesBatch } from './openMeteo.js';
import { summarizeCurrentForComparison } from './airQuality.js';
import { getStations } from './openAq.js';

const RING_FRACTIONS = [0.35, 0.7, 1];
const BEARINGS = [0, 45, 90, 135, 180, 225, 270, 315];
const BEARING_LABELS = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
const MAX_SAMPLES = 24;

function offsetPoint(lat, lon, distanceKm, bearingDeg) {
  const earthRadiusKm = 6371;
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const angular = distanceKm / earthRadiusKm;

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing));
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: Number(((lat2 * 180) / Math.PI).toFixed(4)),
    lon: Number(((((lon2 * 180) / Math.PI) + 540) % 360 - 180).toFixed(4)),
  };
}

function haversineKm(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export async function buildNearbyPayload({ lat, lon, radiusMeters, originName }) {
  const radiusKm = radiusMeters / 1000;
  const points = [{ lat, lon, name: originName || 'Current location', isOrigin: true }];

  for (const fraction of RING_FRACTIONS) {
    for (const bearing of BEARINGS) {
      const distanceKm = Number((radiusKm * fraction).toFixed(1));
      const point = offsetPoint(lat, lon, distanceKm, bearing);
      points.push({
        ...point,
        distanceKm,
        bearing,
        bearingLabel: BEARING_LABELS[bearing],
        name: `${distanceKm} km ${BEARING_LABELS[bearing]}`,
        isOrigin: false,
      });
    }
  }

  const limited = points.slice(0, MAX_SAMPLES + 1);
  const { series, fetchedAt, cached } = await getAirQualitySeriesBatch(limited);

  const entries = series.map((item, index) => {
    const point = limited[index];
    const summary = summarizeCurrentForComparison(item, {
      name: point.name,
      lat: point.lat,
      lon: point.lon,
      countryCode: null,
      timezone: item.timezone,
    });

    return {
      name: point.name,
      isOrigin: Boolean(point.isOrigin),
      latitude: summary.latitude,
      longitude: summary.longitude,
      distanceKm: point.isOrigin ? 0 : Number(haversineKm({ lat, lon }, { lat: point.lat, lon: point.lon }).toFixed(1)),
      bearing: point.bearing ?? null,
      bearingLabel: point.bearingLabel ?? null,
      usAqi: summary.aqi.US?.valid ? summary.aqi.US.value : null,
      usCategory: summary.aqi.US?.valid ? summary.aqi.US.category : null,
      cpcbAqi: summary.aqi.CPCB?.valid ? summary.aqi.CPCB.value : null,
      cpcbCategory: summary.aqi.CPCB?.valid ? summary.aqi.CPCB.category : null,
      pm25: summary.pollutants.pm2_5,
      pm10: summary.pollutants.pm10,
      dataTimestamp: summary.dataTimestamp,
      provider: summary.provider,
      measurementType: summary.measurementType,
    };
  });

  const origin = entries.find((entry) => entry.isOrigin) || null;
  const samples = entries.filter((entry) => !entry.isOrigin);
  const comparableSamples = samples.filter((sample) => sample.usAqi !== null);
  const originAqi = origin?.usAqi ?? null;

  const cleaner = comparableSamples
    .filter((sample) => originAqi !== null && sample.usAqi <= originAqi - 5)
    .sort((a, b) => a.usAqi - b.usAqi)
    .slice(0, 5);

  const distinctValues = new Set(comparableSamples.map((sample) => sample.usAqi));
  const gridResolutionNote =
    comparableSamples.length && distinctValues.size <= 1
      ? 'Every sampled point returned the same US AQI. The model grid cell is coarser than this search radius, so the sampler cannot resolve nearby variation. Try a larger radius; this model cannot resolve street-level differences.'
      : null;

  return {
    origin,
    samples: comparableSamples.sort((a, b) => a.usAqi - b.usAqi),
    cleaner,
    // Even when no point clears the "cleaner" threshold, show the lowest-ranked
    // samples so the user can see the relative picture instead of only an empty state.
    lowestSamples: comparableSamples.slice(0, 5),
    comparisonStandard: 'US',
    standardLabel: 'US EPA AQI (provider-computed)',
    provider: 'Open-Meteo',
    dataset: 'CAMS atmospheric composition model',
    measurementType: 'modelled',
    fetchedAt,
    cached: Boolean(cached),
    searchedRadiusMeters: radiusMeters,
    method: `AIR CUE sampled ${BEARING_LABELS[0]}–${BEARING_LABELS[315]} points at 35%, 70% and 100% of the selected radius using the same provider and AQI standard. Samples are not interpolated between grid cells.`,
    gridResolutionNote,
    notes: [
      'These are modelled grid samples, not monitoring stations. They show where the model indicates comparatively lower AQI nearby.',
      'Only samples with a valid provider US AQI are ranked, so all rows share one AQI scale.',
      'A lower AQI nearby does not guarantee that a location is healthy or accessible.',
    ],
  };
}

function trimAqiBlock(block) {
  if (!block?.valid) {
    return { valid: false, reason: block?.reason || 'Not available for this location.' };
  }
  return {
    valid: true,
    value: block.value,
    category: block.category,
    dominant: block.dominant
      ? { label: block.dominant.label, pollutant: block.dominant.pollutant, subIndex: block.dominant.subIndex }
      : null,
    averaging: block.averaging || null,
  };
}

export async function buildMapPayload({ lat, lon, includeStations = true } = {}) {
  const points = CITIES.map((city) => ({ lat: city.lat, lon: city.lon }));
  const { series, fetchedAt, cached } = await getAirQualitySeriesBatch(points);

  const cities = series.map((item, index) => {
    const city = CITIES[index];
    const summary = summarizeCurrentForComparison(item, {
      name: city.name,
      lat: city.lat,
      lon: city.lon,
      countryCode: city.countryCode,
      timezone: item.timezone,
    });

    return {
      id: city.id,
      name: city.name,
      admin1: city.admin1,
      country: city.country,
      countryCode: city.countryCode,
      latitude: summary.latitude,
      longitude: summary.longitude,
      timezone: summary.timezone,
      primaryStandard: summary.primaryStandard,
      aqi: {
        US: trimAqiBlock(summary.aqi.US),
        CPCB: trimAqiBlock(summary.aqi.CPCB),
      },
      pollutants: summary.pollutants,
      dataTimestamp: summary.dataTimestamp,
      provider: 'Open-Meteo',
      measurementType: 'modelled',
      displayType: 'modelled-city-sample',
    };
  });

  const stations =
    includeStations && Number.isFinite(lat) && Number.isFinite(lon)
      ? await getStations({ lat, lon, radius: 15000 })
      : {
          available: false,
          configured: false,
          provider: 'OpenAQ',
          fetchedAt: new Date().toISOString(),
          stations: [],
          reason: 'Select a location on the map to load nearby station observations.',
        };

  return {
    cities,
    stations,
    provider: 'Open-Meteo',
    measurementType: 'modelled',
    fetchedAt,
    cached: Boolean(cached),
    notes: [
      'City markers are modelled grid samples at each city centre, not city-wide averages and not station readings.',
      'Markers are coloured only where a valid US AQI or computed CPCB AQI exists. Station markers show concentrations without an AQI category.',
    ],
  };
}
