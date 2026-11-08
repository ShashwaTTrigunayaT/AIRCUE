const round = (value, precision = 1) =>
  typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(precision)) : null;

const METRICS = [
  { key: 'pm2_5', label: 'PM2.5', unit: 'µg/m³', precision: 1, absoluteChangeFloor: 10 },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', precision: 1, absoluteChangeFloor: 20 },
  { key: 'us_aqi', label: 'US AQI', unit: 'index', precision: 0, absoluteChangeFloor: 15 },
];

const MIN_BASELINE_SAMPLES = 48;
const BASELINE_EXCLUDED_HOURS = 24;
const Z_THRESHOLD = 2;
const RAPID_CHANGE_PERCENT = 30;

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length < 2) return null;
  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function valueLabel(value, unit, precision) {
  const rounded = round(value, precision);
  return unit === 'index' ? String(rounded) : `${rounded} ${unit}`;
}

function findPreviousValid(values, fromIndex, lookback = 3) {
  for (let i = fromIndex - 1; i >= Math.max(0, fromIndex - lookback); i -= 1) {
    if (isNumber(values[i])) return i;
  }
  return -1;
}

function findCurrentValid(values, currentIndex, lookback = 3) {
  for (let i = currentIndex; i >= Math.max(0, currentIndex - lookback); i -= 1) {
    if (isNumber(values[i])) return i;
  }
  return -1;
}

/**
 * Detect statistical anomalies in the modelled hourly series.
 *
 * Two independent checks are used:
 *  - baseline deviation: current value vs the 7-day mean/SD, excluding the last
 *    24 hours so an ongoing episode does not hide itself;
 *  - rapid change: current value vs the previous available hour.
 *
 * These are statistical flags about the supplied series, not causes, health
 * diagnoses or evidence that a reading is wrong.
 */
export function detectAnomalies(series, location = {}) {
  const currentIndex = Number.isInteger(series.currentIndex) ? series.currentIndex : 0;
  const baselineEnd = Math.max(0, currentIndex - BASELINE_EXCLUDED_HOURS);
  const checkedMetrics = [];
  const candidates = [];

  for (const meta of METRICS) {
    const values = series.series?.[meta.key] || [];
    const unit = series.units?.[meta.key] || meta.unit;
    const baselineValues = values
      .slice(0, baselineEnd + 1)
      .filter((value) => isNumber(value));

    const currentValueIndex = findCurrentValid(values, currentIndex);
    const currentValue = currentValueIndex >= 0 ? values[currentValueIndex] : null;

    const metricReport = {
      key: meta.key,
      label: meta.label,
      unit,
      checked: false,
      baselineSamples: baselineValues.length,
      currentValue: isNumber(currentValue) ? round(currentValue, meta.precision) : null,
      reason: null,
    };

    if (baselineValues.length < MIN_BASELINE_SAMPLES) {
      metricReport.reason = `Needs at least ${MIN_BASELINE_SAMPLES} valid baseline hours; found ${baselineValues.length}.`;
      checkedMetrics.push(metricReport);
      continue;
    }
    if (!isNumber(currentValue)) {
      metricReport.reason = 'No valid value for the current modelled hour.';
      checkedMetrics.push(metricReport);
      continue;
    }

    metricReport.checked = true;
    const baselineMean = mean(baselineValues);
    const baselineSd = standardDeviation(baselineValues);
    const zScore = baselineSd && baselineSd > 0 ? (currentValue - baselineMean) / baselineSd : null;
    const percentVsBaseline = baselineMean > 0 ? ((currentValue - baselineMean) / baselineMean) * 100 : null;

    if (zScore !== null && Math.abs(zScore) >= Z_THRESHOLD) {
      const severity = Math.abs(zScore) >= 3 ? 'high' : 'moderate';
      candidates.push({
        id: `${meta.key}:baseline:${series.time[currentValueIndex]}`,
        metric: meta.key,
        label: meta.label,
        unit,
        kind: 'baseline-deviation',
        severity,
        direction: zScore > 0 ? 'above' : 'below',
        observed: round(currentValue, meta.precision),
        baselineMean: round(baselineMean, meta.precision),
        baselineSd: round(baselineSd, meta.precision),
        percentVsBaseline: round(percentVsBaseline, 1),
        zScore: round(zScore, 2),
        at: series.time[currentValueIndex],
        explanation: `${meta.label} is ${valueLabel(currentValue, unit, meta.precision)}, ${Math.abs(zScore).toFixed(1)} standard deviations ${zScore > 0 ? 'above' : 'below'} the 7-day baseline mean of ${valueLabel(baselineMean, unit, meta.precision)}.`,
      });
    }

    const previousIndex = findPreviousValid(values, currentValueIndex);
    if (previousIndex >= 0) {
      const previousValue = values[previousIndex];
      const difference = currentValue - previousValue;
      const percentChange = previousValue > 0 ? (difference / previousValue) * 100 : null;

      if (
        percentChange !== null &&
        Math.abs(percentChange) >= RAPID_CHANGE_PERCENT &&
        Math.abs(difference) >= meta.absoluteChangeFloor
      ) {
        const severity = Math.abs(percentChange) >= 60 ? 'high' : 'moderate';
        candidates.push({
          id: `${meta.key}:rapid:${series.time[currentValueIndex]}`,
          metric: meta.key,
          label: meta.label,
          unit,
          kind: 'rapid-change',
          severity,
          direction: difference > 0 ? 'above' : 'below',
          observed: round(currentValue, meta.precision),
          previousValue: round(previousValue, meta.precision),
          percentChange: round(percentChange, 1),
          absoluteChange: round(difference, meta.precision),
          at: series.time[currentValueIndex],
          explanation: `${meta.label} changed ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}% between the last two available hours, from ${valueLabel(previousValue, unit, meta.precision)} to ${valueLabel(currentValue, unit, meta.precision)}.`,
        });
      }
    }

    checkedMetrics.push(metricReport);
  }

  const severityRank = { high: 0, moderate: 1 };
  const anomalies = candidates
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || Math.abs(b.zScore || b.percentChange || 0) - Math.abs(a.zScore || a.percentChange || 0))
    .slice(0, 4);

  const available = checkedMetrics.some((metric) => metric.checked);

  return {
    available,
    location: {
      name: location.name || 'Selected location',
      latitude: series.latitude ?? location.lat ?? null,
      longitude: series.longitude ?? location.lon ?? null,
      timezone: location.timezone || series.timezone || 'UTC',
    },
    provider: series.provider,
    dataset: series.dataset,
    measurementType: 'modelled',
    dataTimestamp: series.time[currentIndex] || null,
    generatedAt: new Date().toISOString(),
    baseline: {
      excludedRecentHours: BASELINE_EXCLUDED_HOURS,
      minimumSamples: MIN_BASELINE_SAMPLES,
      baselineHours: checkedMetrics.reduce((max, metric) => Math.max(max, metric.baselineSamples), 0),
    },
    thresholds: {
      zScore: Z_THRESHOLD,
      rapidChangePercent: RAPID_CHANGE_PERCENT,
    },
    checkedMetrics,
    anomalies,
    method:
      'Each metric is compared with a 7-day modelled baseline that excludes the most recent 24 hours (minimum 48 valid hourly values). A baseline deviation is flagged at |z| ≥ 2. A rapid change is flagged when the last two available hours differ by at least 30% and by a minimum absolute amount. Flags are descriptive statistics, not causes or health diagnoses.',
    reason: available
      ? null
      : `Not enough historical modelled hours were available to build a baseline for any metric (needs at least ${MIN_BASELINE_SAMPLES} valid values per metric).`,
    notes: [
      'Flags describe the supplied modelled series; they do not identify pollution sources or prove that a value is incorrect.',
      'A flag is not a health warning. Use the current AQI category and health guidance for decisions.',
      'Baseline statistics exclude the most recent 24 hours so that an ongoing episode does not mask itself.',
    ],
  };
}
