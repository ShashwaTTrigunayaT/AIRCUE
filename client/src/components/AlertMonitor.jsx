import { useEffect, useRef } from 'react';
import { useAlerts } from '../context/AlertsContext.jsx';
import { STANDARD_LABELS } from '../utils/aqi.js';

const RULE_STATE_KEY = 'aircue.alertRuleState';

function readRuleState() {
  try {
    return JSON.parse(localStorage.getItem(RULE_STATE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeRuleState(state) {
  try {
    localStorage.setItem(RULE_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/**
 * Air-quality alerts are evaluated only while the app is open, against data
 * already fetched for the selected location. IDs are deterministic per data
 * hour so a rule cannot fire twice for the same hour.
 */
export default function AlertMonitor({ current, forecast }) {
  const { config, addEvents } = useAlerts();
  const processed = useRef(new Set());

  useEffect(() => {
    if (!current || !config.enabled) return;

    const standard = config.aqi.standard;
    const block = current.aqi?.[standard];
    const shortLabel = STANDARD_LABELS[standard]?.short || standard;
    const locationKey = `${current.location.latitude.toFixed(2)},${current.location.longitude.toFixed(2)}`;
    const hourKey = (current.dataTimestamp || '').slice(0, 13);
    const ruleState = readRuleState();
    const previous = ruleState[locationKey] || {};
    const events = [];

    const push = (rule, title, message, meta = {}) => {
      const id = `${locationKey}:${rule}:${hourKey}`;
      if (processed.current.has(id)) return;
      events.push({
        id,
        rule,
        title,
        message,
        at: new Date().toISOString(),
        standard: meta.standard || null,
        value: meta.value ?? null,
        threshold: meta.threshold ?? null,
        location: {
          name: current.location.name,
          latitude: current.location.latitude,
          longitude: current.location.longitude,
        },
      });
    };

    if (config.aqi.enabled && block?.valid && block.value >= config.aqi.threshold) {
      push(
        'aqi-threshold',
        `${shortLabel} ${block.value} is above your alert threshold`,
        `${current.location.name} is in the ${block.category.label} category. Your ${shortLabel} threshold is ${config.aqi.threshold}. Data: ${current.provider}, ${current.measurementType}.`,
        { standard, value: block.value, threshold: config.aqi.threshold },
      );
    }

    if (config.pm25.enabled) {
      const pm = current.pollutants.find((pollutant) => pollutant.key === 'pm2_5');
      if (pm?.available && pm.value >= config.pm25.threshold) {
        push(
          'pm25-threshold',
          `PM2.5 is ${pm.value} ${pm.unit}`,
          `Above your PM2.5 threshold of ${config.pm25.threshold} ${pm.unit}. Modelled value for the current hour from ${pm.provider}.`,
          { value: pm.value, threshold: config.pm25.threshold },
        );
      }
    }

    if (config.categoryChange.enabled && block?.valid && previous.standard === standard && previous.categoryKey) {
      if (previous.categoryKey !== block.category.key) {
        push(
          'category-change',
          `${shortLabel} category changed to ${block.category.label}`,
          `Previously ${previous.categoryLabel}. ${shortLabel} is now ${block.value}. Source: ${current.provider} (${current.measurementType}).`,
          { standard, value: block.value },
        );
      }
    }

    if (
      config.suddenIncrease.enabled &&
      current.trend?.direction === 'rising' &&
      current.trend.deltaPct >= config.suddenIncrease.percent
    ) {
      push(
        'sudden-increase',
        `${current.trend.label} rose ${Math.abs(current.trend.deltaPct)}% in six hours`,
        `${current.trend.label} averaged ${current.trend.recentAverage} µg/m³ over the last 6 hours versus ${current.trend.previousAverage} µg/m³ in the previous 6 hours. Modelled hourly data.`,
        { value: current.trend.recentAverage, threshold: config.suddenIncrease.percent },
      );
    }

    if (config.forecastPeak.enabled && forecast?.hourly?.length) {
      const upcoming = forecast.hourly.slice(0, 24).filter((hour) => typeof hour.us_aqi === 'number');
      const peak = upcoming.length
        ? upcoming.reduce((best, hour) => (hour.us_aqi > best.us_aqi ? hour : best), upcoming[0])
        : null;
      if (peak && peak.us_aqi >= config.forecastPeak.threshold) {
        push(
          'forecast-peak',
          `Forecast US AQI reaches ${Math.round(peak.us_aqi)} in the next 24 hours`,
          `Higher than your forecast threshold of ${config.forecastPeak.threshold}. This is a modelled forecast for ${peak.time}, not an observation.`,
          { standard: 'US', value: Math.round(peak.us_aqi), threshold: config.forecastPeak.threshold },
        );
      }
    }

    ruleState[locationKey] = {
      standard,
      categoryKey: block?.valid ? block.category.key : previous.categoryKey || null,
      categoryLabel: block?.valid ? block.category.label : previous.categoryLabel || null,
      updatedAt: current.dataTimestamp,
    };
    writeRuleState(ruleState);

    if (!events.length) return;

    events.forEach((event) => processed.current.add(event.id));
    addEvents(events);

    if (config.notifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      events.slice(0, 2).forEach((event) => {
        try {
          new Notification(event.title, { body: event.message, tag: event.id });
        } catch {
          /* notifications can fail silently; in-app history still records the event */
        }
      });
    }
  }, [current, forecast, config, addEvents]);

  return null;
}
