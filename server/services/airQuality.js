import { POLLUTANTS, POLLUTANT_BY_KEY } from '../utils/pollutants.js';
import {
  AQI_STANDARDS,
  categorize,
  computeCpcbAqi,
  computeTrend,
  computeUsDominant,
  summarizeSeries,
} from '../utils/aqi.js';
import { computeOutdoorWindows } from '../utils/windows.js';
import { getAirQualitySeries } from './openMeteo.js';

const round = (value, precision = 1) =>
  typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(precision)) : null;

const at = (series, key, index) => {
  const value = series[key]?.[index];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

function localDate(localTime) {
  return localTime.slice(0, 10);
}

function buildAqiBlocks(series, index, location) {
  const usRaw = at(series.series, 'us_aqi', index);
  const euRaw = at(series.series, 'european_aqi', index);
  const cpcb = computeCpcbAqi(series.series, index);

  const us = Number.isFinite(usRaw)
    ? {
        standard: 'US',
        valid: true,
        value: Math.round(usRaw),
        category: categorize('US', usRaw),
        dominant: computeUsDominant(series.series, index),
        source: 'Open-Meteo (US EPA AQI, provider-computed)',
        averaging: AQI_STANDARDS.US.averaging,
        periodEnd: series.time[index],
      }
    : {
        standard: 'US',
        valid: false,
        reason: 'The provider did not return a US AQI value for this hour.',
      };

  const eu = Number.isFinite(euRaw)
    ? {
        standard: 'EU',
        valid: true,
        value: Math.round(euRaw),
        category: categorize('EU', euRaw),
        source: 'Open-Meteo (European AQI, provider-computed)',
        averaging: AQI_STANDARDS.EU.averaging,
        periodEnd: series.time[index],
      }
    : {
        standard: 'EU',
        valid: false,
        reason: 'The provider did not return a European AQI value for this hour.',
      };

  const india = location.countryCode === 'IN' || series.timezone === 'Asia/Kolkata';
  const preference = india ? ['CPCB', 'US', 'EU'] : ['US', 'EU', 'CPCB'];
  const blocks = { CPCB: cpcb, US: us, EU: eu };
  const primaryStandard = preference.find((id) => blocks[id]?.valid) || null;

  return { blocks, primaryStandard };
}

const COMMON_LIMITATIONS = [
  'Open-Meteo air-quality values are gridded CAMS model output, not readings from a monitoring station near this location.',
  'Model values represent a grid cell, so they cannot capture street-level, indoor or hyper-local variation.',
  'Forecasts are modelled projections, not guarantees. Forecast uncertainty grows with lead time.',
  'AIR CUE does not invent missing pollutant values; unavailable readings are shown as unavailable.',
];

export function buildCurrentPayload(series, location) {
  const index = series.currentIndex;
  const dataTimestamp = series.time[index];
  const { blocks, primaryStandard } = buildAqiBlocks(series, index, location);
  const cpcb = blocks.CPCB;

  const pollutants = POLLUTANTS.map((def) => {
    const value = at(series.series, def.key, index);
    return {
      key: def.key,
      label: def.label,
      name: def.name,
      unit: series.units[def.key] || def.unit,
      precision: def.key === 'carbon_monoxide' ? 0 : def.precision,
      value: value === null ? null : round(value, def.key === 'carbon_monoxide' ? 0 : 1),
      available: value !== null,
      observedAt: dataTimestamp,
      provider: series.provider,
      measurementType: 'modelled',
      aqiStandard: null,
      blurb: def.blurb,
    };
  });

  const dataAgeMinutes = Math.max(0, Math.round((Date.now() - Date.parse(dataTimestamp)) / 60000));

  return {
    location: {
      name: location.name || 'Selected location',
      admin1: location.admin1 || null,
      country: location.country || null,
      countryCode: location.countryCode || null,
      latitude: series.latitude ?? location.lat,
      longitude: series.longitude ?? location.lon,
      timezone: location.timezone || series.timezone,
      timezoneAbbreviation: series.timezoneAbbreviation,
    },
    provider: series.provider,
    dataset: series.dataset,
    measurementType: 'modelled',
    dataTimestamp,
    fetchedAt: series.fetchedAt,
    cached: Boolean(series.cached),
    dataAgeMinutes,
    stale: dataAgeMinutes > 180,
    pollutants,
    aqi: blocks,
    primaryStandard,
    standards: AQI_STANDARDS,
    trend: computeTrend(series.series, index),
    provenance: {
      provider: series.provider,
      dataset: series.dataset,
      measurementType: 'modelled',
      stationName: null,
      stationId: null,
      dataTimestamp,
      fetchedAt: series.fetchedAt,
      spatialResolution: series.spatialResolution,
      aqiStandards: {
        CPCB: cpcb.valid ? 'Computed by AIR CUE from modelled hourly concentrations using CPCB breakpoints' : 'Not available',
        US: 'Open-Meteo provider US AQI',
        EU: 'Open-Meteo provider European AQI',
      },
      limitations: [
        ...COMMON_LIMITATIONS,
        'The CPCB AQI displayed here is computed by AIR CUE from modelled hourly concentrations and is not an official CPCB monitoring value.',
      ],
    },
  };
}

export function buildForecastPayload(series, location) {
  const start = series.currentIndex;
  const lastHour = Math.min(series.time.length - 1, start + 47);
  const hourly = [];

  for (let i = start; i <= lastHour; i += 1) {
    const local = series.localTimes[i];
    hourly.push({
      time: series.time[i],
      localTime: local,
      isCurrentHour: i === start,
      period: 'forecast',
      us_aqi: at(series.series, 'us_aqi', i),
      european_aqi: at(series.series, 'european_aqi', i),
      pm2_5: at(series.series, 'pm2_5', i),
      pm10: at(series.series, 'pm10', i),
      nitrogen_dioxide: at(series.series, 'nitrogen_dioxide', i),
      sulphur_dioxide: at(series.series, 'sulphur_dioxide', i),
      ozone: at(series.series, 'ozone', i),
      carbon_monoxide: at(series.series, 'carbon_monoxide', i),
    });
  }

  const byDay = new Map();
  for (let i = start; i < series.time.length; i += 1) {
    const day = localDate(series.localTimes[i]);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(i);
  }

  const daily = [...byDay.entries()].map(([date, indices]) => {
    const mean = (key) => {
      const values = indices.map((i) => at(series.series, key, i)).filter((v) => v !== null);
      return values.length ? round(values.reduce((sum, v) => sum + v, 0) / values.length, 1) : null;
    };
    const max = (key) => {
      const values = indices.map((i) => at(series.series, key, i)).filter((v) => v !== null);
      return values.length ? Math.round(Math.max(...values)) : null;
    };
    return {
      date,
      pm2_5: mean('pm2_5'),
      pm10: mean('pm10'),
      usAqiMean: mean('us_aqi'),
      usAqiMax: max('us_aqi'),
      hoursCovered: indices.length,
      computedBy: 'AIR CUE daily aggregation of hourly modelled values',
    };
  });

  return {
    location: { name: location.name || 'Selected location', timezone: location.timezone || series.timezone },
    provider: series.provider,
    dataset: series.dataset,
    measurementType: 'modelled',
    forecastType: 'modelled-hourly-forecast',
    generatedAt: series.fetchedAt,
    validFrom: series.time[start] || null,
    validTo: series.time[lastHour] || null,
    hourly,
    daily,
    outdoorWindows: computeOutdoorWindows(series),
    units: series.units,
    limitations: [
      'Hourly values are model projections from Open-Meteo/CAMS, not measured station readings.',
      'The forecast describes an area, not one exact street address.',
      'Daily summaries are aggregated by AIR CUE from the hourly forecast.',
    ],
  };
}

export function buildHistoryPayload(series, location) {
  const end = series.currentIndex;
  const start24 = Math.max(0, end - 23);
  const start48 = Math.max(0, end - 47);

  const hourly = [];
  for (let i = start24; i <= end; i += 1) {
    hourly.push({
      time: series.time[i],
      us_aqi: at(series.series, 'us_aqi', i),
      european_aqi: at(series.series, 'european_aqi', i),
      pm2_5: at(series.series, 'pm2_5', i),
      pm10: at(series.series, 'pm10', i),
      nitrogen_dioxide: at(series.series, 'nitrogen_dioxide', i),
      ozone: at(series.series, 'ozone', i),
    });
  }

  const weeklyHourly = [];
  for (let i = Math.max(0, end - 167); i <= end; i += 1) {
    weeklyHourly.push({
      time: series.time[i],
      pm2_5: at(series.series, 'pm2_5', i),
      pm10: at(series.series, 'pm10', i),
      us_aqi: at(series.series, 'us_aqi', i),
    });
  }

  const byDay = new Map();
  for (let i = Math.max(0, end - 167); i <= end; i += 1) {
    const day = localDate(series.localTimes[i]);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(i);
  }

  const daily = [...byDay.entries()]
    .slice(-7)
    .map(([date, indices]) => {
      const mean = (key, precision = 1) => {
        const values = indices.map((i) => at(series.series, key, i)).filter((v) => v !== null);
        return values.length ? round(values.reduce((sum, v) => sum + v, 0) / values.length, precision) : null;
      };
      const max = (key) => {
        const values = indices.map((i) => at(series.series, key, i)).filter((v) => v !== null);
        return values.length ? Math.round(Math.max(...values)) : null;
      };
      return {
        date,
        pm2_5: mean('pm2_5'),
        pm10: mean('pm10'),
        nitrogen_dioxide: mean('nitrogen_dioxide'),
        ozone: mean('ozone'),
        usAqiMean: mean('us_aqi'),
        usAqiMax: max('us_aqi'),
        hoursCovered: indices.length,
        computedBy: 'AIR CUE daily aggregation of hourly modelled values',
      };
    });

  const summarize = (key, startIndex) => summarizeSeries(series.series[key], startIndex, end);
  const current24 = {
    pm2_5: summarize('pm2_5', start24),
    pm10: summarize('pm10', start24),
    nitrogen_dioxide: summarize('nitrogen_dioxide', start24),
    ozone: summarize('ozone', start24),
  };
  const previous24 = {
    pm2_5: summarize('pm2_5', start48),
    pm10: summarize('pm10', start48),
  };

  const changePct = (current, previous) =>
    current && previous && previous.average > 0
      ? Number((((current.average - previous.average) / previous.average) * 100).toFixed(1))
      : null;

  const weekly = {
    pm2_5: summarize('pm2_5', Math.max(0, end - 167)),
    pm10: summarize('pm10', Math.max(0, end - 167)),
    daysCovered: daily.length,
  };

  return {
    location: { name: location.name || 'Selected location', timezone: location.timezone || series.timezone },
    provider: series.provider,
    dataset: series.dataset,
    measurementType: 'modelled',
    generatedAt: series.fetchedAt,
    hourly,
    weeklyHourly,
    daily,
    current24,
    weekly,
    change24h: {
      pm2_5: changePct(current24.pm2_5, previous24.pm2_5),
      pm10: changePct(current24.pm10, previous24.pm10),
      comparison: 'Last 24 hours vs the previous 24 hours',
    },
    units: series.units,
    limitations: [
      'All values are modelled historical estimates from Open-Meteo/CAMS, not verified monitoring-station observations.',
      'Values before the current hour are model reanalysis/analysis fields and can differ from local measurements.',
      'Percentage changes are shown only when both comparison periods contain enough hourly values.',
      'Daily aggregates are computed by AIR CUE from hourly modelled values.',
    ],
  };
}

export function summarizeCurrentForComparison(series, location) {
  const index = series.currentIndex;
  const { blocks, primaryStandard } = buildAqiBlocks(series, index, location);

  return {
    name: location.name || 'Selected location',
    latitude: series.latitude,
    longitude: series.longitude,
    timezone: location.timezone || series.timezone,
    provider: series.provider,
    measurementType: 'modelled',
    dataTimestamp: series.time[index],
    fetchedAt: series.fetchedAt,
    aqi: blocks,
    primaryStandard,
    pollutants: {
      pm2_5: round(at(series.series, 'pm2_5', index), 1),
      pm10: round(at(series.series, 'pm10', index), 1),
      nitrogen_dioxide: round(at(series.series, 'nitrogen_dioxide', index), 1),
      ozone: round(at(series.series, 'ozone', index), 1),
    },
  };
}

export async function buildComparison(locations) {
  const seriesList = await Promise.all(
    locations.map((location) => getAirQualitySeries(location.lat, location.lon)),
  );

  const entries = seriesList.map((series, i) => summarizeCurrentForComparison(series, locations[i]));
  const usComparable = entries.every((entry) => entry.aqi.US?.valid);
  const cpcbComparable = entries.every((entry) => entry.aqi.CPCB?.valid);

  const notes = [
    'Every row uses the same provider (Open-Meteo) and the same measurement type (modelled), so the values are comparable with that caveat.',
    'Comparison uses the provider US EPA AQI for each location, keeping a single AQI scale across rows.',
    'These are gridded model estimates for the selected coordinates, not monitoring-station observations.',
  ];

  if (!cpcbComparable) {
    notes.push('A CPCB comparison is not shown because a valid CPCB AQI could not be computed for every location.');
  }
  if (!usComparable) {
    notes.push('At least one location is missing a provider US AQI value; avoid ranking the incomplete rows.');
  }

  return {
    locations: entries,
    comparisonStandard: usComparable ? 'US' : null,
    cpcbComparison: cpcbComparable
      ? entries.map((entry) => ({
          name: entry.name,
          value: entry.aqi.CPCB.value,
          category: entry.aqi.CPCB.category,
        }))
      : null,
    notes,
    provider: 'Open-Meteo',
    measurementType: 'modelled',
    fetchedAt: new Date().toISOString(),
  };
}

export function dominantForStandard(current, standard) {
  const block = current?.aqi?.[standard];
  if (!block?.valid) return null;
  if (block.dominant) return { ...block.dominant, standard, attribution: block.dominant.basis };
  return null;
}

export function pollutantLabel(key) {
  return POLLUTANT_BY_KEY[key]?.label || key;
}
