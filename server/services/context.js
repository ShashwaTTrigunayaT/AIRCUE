import { buildCurrentPayload, buildForecastPayload, buildHistoryPayload } from './airQuality.js';
import { getAirQualitySeries } from './openMeteo.js';
import { AQI_STANDARDS } from '../utils/aqi.js';

function primaryBlock(current) {
  if (!current.primaryStandard) return null;
  const block = current.aqi[current.primaryStandard];
  if (!block?.valid) return null;
  return {
    standard: current.primaryStandard,
    standardLabel: AQI_STANDARDS[current.primaryStandard]?.label,
    value: block.value,
    category: block.category,
    averaging: block.averaging,
    source: block.source,
  };
}

/** Only real readings and computed values are placed in the context. */
export function buildContextObject({ current, forecast, history }) {
  const availablePollutants = current.pollutants
    .filter((pollutant) => pollutant.available)
    .map((pollutant) => ({
      name: pollutant.label,
      value: pollutant.value,
      unit: pollutant.unit,
      provider: pollutant.provider,
      measurementType: pollutant.measurementType,
      at: pollutant.observedAt,
    }));

  const aqiStandards = Object.entries(current.aqi)
    .filter(([, block]) => block?.valid)
    .map(([id, block]) => ({
      standard: id,
      label: AQI_STANDARDS[id]?.label,
      value: block.value,
      category: block.category,
      averaging: block.averaging,
      source: block.source,
    }));

  const forecastHours = forecast.hourly.slice(0, 24);
  const aqiHours = forecast.hourly.filter((hour) => typeof hour.us_aqi === 'number');
  const peak = aqiHours.length
    ? aqiHours.reduce((best, hour) => (hour.us_aqi > best.us_aqi ? hour : best), aqiHours[0])
    : null;

  const bestWindows = ['60', '120']
    .map((duration) => {
      const window = forecast.outdoorWindows?.durations?.[duration]?.windows?.[0];
      if (!window) return null;
      return {
        durationMinutes: Number(duration),
        startTime: window.startTime,
        endTime: window.endTime,
        meanPm25: window.meanPm25,
        peakPm25: window.peakPm25,
        meanUsAqi: window.meanUsAqi,
        basis: 'forecast PM2.5 ranking',
      };
    })
    .filter(Boolean);

  return {
    location: current.location,
    data: {
      provider: current.provider,
      dataset: current.dataset,
      measurementType: current.measurementType,
      spatialResolution: current.provenance.spatialResolution,
      dataTimestamp: current.dataTimestamp,
      fetchedAt: current.fetchedAt,
      stale: current.stale,
    },
    aqi: {
      primary: primaryBlock(current),
      allAvailable: aqiStandards,
    },
    pollutants: availablePollutants,
    dominantPollutant: current.primaryStandard ? current.aqi[current.primaryStandard]?.dominant || null : null,
    trend: current.trend,
    forecast: peak
      ? {
          horizonHours: aqiHours.length,
          peakUsAqi: { value: Math.round(peak.us_aqi), at: peak.time },
          firstTwelveHours: forecastHours.slice(0, 12).map((hour) => ({
            time: hour.time,
            usAqi: hour.us_aqi,
            pm25: hour.pm2_5,
            pm10: hour.pm10,
            type: 'forecast',
          })),
          daily: forecast.daily.slice(0, 3).map((day) => ({
            date: day.date,
            pm25Mean: day.pm2_5,
            pm10Mean: day.pm10,
            usAqiMean: day.usAqiMean,
            usAqiMax: day.usAqiMax,
            computedByAirCue: true,
          })),
          bestWindows,
          windowMethod: forecast.outdoorWindows?.method,
        }
      : null,
    history: {
      last24Hours: history.current24,
      change24h: history.change24h,
      last7Days: history.weekly,
      note: 'All history values are modelled estimates from Open-Meteo/CAMS, not station observations.',
    },
    limitations: current.provenance.limitations,
  };
}

export async function buildLocationContext(location) {
  const series = await getAirQualitySeries(location.lat, location.lon);
  const current = buildCurrentPayload(series, location);
  const forecast = buildForecastPayload(series, location);
  const history = buildHistoryPayload(series, location);

  return {
    series,
    current,
    forecast,
    history,
    context: buildContextObject({ current, forecast, history }),
  };
}
