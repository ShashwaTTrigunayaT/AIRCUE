import { categorize } from '../utils/aqi.js';

const HORIZON_HOURS = 24;
const HOLDOUT_HOURS = 24;
const MIN_TRAINING_ROWS = 72;
const RIDGE_LAMBDA = 0.1;

const round = (value, precision = 1) =>
  typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(precision)) : null;

function localHour(localTime) {
  const hour = Number(String(localTime || '').slice(11, 13));
  return Number.isFinite(hour) ? hour : 0;
}

function solveLinearSystem(matrix, vector) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];

    const divisor = augmented[column][column];
    for (let cell = column; cell <= size; cell += 1) augmented[column][cell] /= divisor;

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      if (factor === 0) continue;
      for (let cell = column; cell <= size; cell += 1) augmented[row][cell] -= factor * augmented[column][cell];
    }
  }

  return augmented.map((row) => row[size]);
}

function buildRows(series, values) {
  const rows = [];
  for (let index = 24; index <= series.currentIndex; index += 1) {
    const target = values[index];
    const lags = [
      values[index - 1],
      values[index - 2],
      values[index - 3],
      values[index - 4],
      values[index - 6],
      values[index - 24],
    ];
    const recent6 = values.slice(index - 6, index);
    const recent24 = values.slice(index - 24, index);
    const means = [
      recent6.every(Number.isFinite) ? recent6.reduce((sum, value) => sum + value, 0) / 6 : null,
      recent24.every(Number.isFinite) ? recent24.reduce((sum, value) => sum + value, 0) / 24 : null,
    ];
    if (!Number.isFinite(target) || ![...lags, ...means].every((value) => Number.isFinite(value))) continue;
    const angle = (2 * Math.PI * localHour(series.localTimes[index])) / 24;
    rows.push({ target, lags, means, sin: Math.sin(angle), cos: Math.cos(angle), index });
  }
  return rows;
}

function fitModel(series, key) {
  const values = series.series[key];
  if (!Array.isArray(values)) return null;

  const rows = buildRows(series, values);
  if (rows.length < MIN_TRAINING_ROWS + HOLDOUT_HOURS) {
    return { reason: `At least ${MIN_TRAINING_ROWS + HOLDOUT_HOURS} valid hourly values are needed for this model; only ${rows.length} were available.` };
  }

  const trainingRows = rows.slice(0, -HOLDOUT_HOURS);
  const holdoutRows = rows.slice(-HOLDOUT_HOURS);

  const numericCount = trainingRows[0].lags.length + trainingRows[0].means.length;
  const featureMeans = Array.from({ length: numericCount }, (_, position) =>
    trainingRows.reduce((sum, row) => sum + [...row.lags, ...row.means][position], 0) / trainingRows.length,
  );
  const featureStds = Array.from({ length: numericCount }, (_, position) =>
    Math.max(
      1e-6,
      Math.sqrt(
        trainingRows.reduce(
          (sum, row) => sum + ([...row.lags, ...row.means][position] - featureMeans[position]) ** 2,
          0,
        ) / trainingRows.length,
      ),
    ),
  );

  const features = (row) => [
    1,
    ...[...row.lags, ...row.means].map(
      (value, position) => (value - featureMeans[position]) / featureStds[position],
    ),
    row.sin,
    row.cos,
  ];

  const size = 1 + numericCount + 2;
  const matrix = Array.from({ length: size }, () => new Array(size).fill(0));
  const vector = new Array(size).fill(0);

  for (const row of trainingRows) {
    const x = features(row);
    // Model the hour-to-hour change rather than the absolute level. This keeps
    // the prediction anchored to the latest value while still learning the
    // diurnal and lag structure, and it is a fair baseline to report against.
    const delta = row.target - row.lags[0];
    for (let i = 0; i < size; i += 1) {
      vector[i] += x[i] * delta;
      for (let j = 0; j < size; j += 1) matrix[i][j] += x[i] * x[j];
    }
  }

  // Regularize the lag/time coefficients, not the intercept.
  for (let i = 1; i < size; i += 1) matrix[i][i] += RIDGE_LAMBDA;

  const coefficients = solveLinearSystem(matrix, vector);
  if (!coefficients) return { reason: 'The prediction model could not be fitted for this location.' };

  const predict = (x) => x.reduce((sum, value, index) => sum + value * coefficients[index], 0);

  let absoluteError = 0;
  let squaredError = 0;
  let persistenceError = 0;
  for (const row of holdoutRows) {
    const predicted = row.lags[0] + predict(features(row));
    const error = predicted - row.target;
    absoluteError += Math.abs(error);
    squaredError += error ** 2;
    persistenceError += Math.abs(row.lags[0] - row.target);
  }

  const mae = absoluteError / holdoutRows.length;
  const rmse = Math.sqrt(squaredError / holdoutRows.length);
  const persistenceMae = persistenceError / holdoutRows.length;

  if (!Number.isFinite(mae) || !Number.isFinite(rmse)) return null;

  // Recursive forecast: predicted values become the lags for later hours.
  const futureValues = values.slice(0, series.currentIndex + 1);
  const predictions = [];
  for (let step = 1; step <= HORIZON_HOURS; step += 1) {
    const index = series.currentIndex + step;
    if (index >= series.time.length) break;
    const lags = [
      futureValues[futureValues.length - 1],
      futureValues[futureValues.length - 2],
      futureValues[futureValues.length - 3],
      futureValues[futureValues.length - 4],
      futureValues[futureValues.length - 6],
      futureValues[futureValues.length - 24],
    ];
    const recent6 = futureValues.slice(-6);
    const recent24 = futureValues.slice(-24);
    const means = [
      recent6.reduce((sum, value) => sum + value, 0) / 6,
      recent24.reduce((sum, value) => sum + value, 0) / 24,
    ];
    if (![...lags, ...means].every((value) => Number.isFinite(value))) break;
    const angle = (2 * Math.PI * localHour(series.localTimes[index])) / 24;
    const x = [
      1,
      ...[...lags, ...means].map(
        (value, position) => (value - featureMeans[position]) / featureStds[position],
      ),
      Math.sin(angle),
      Math.cos(angle),
    ];
    const value = Math.max(0, lags[0] + predict(x));
    futureValues.push(value);
    predictions.push({ time: series.time[index], localTime: series.localTimes[index], value });
  }

  if (!predictions.length) return { reason: 'The provider did not return future hours for this location.' };

  return {
    predictions,
    model: {
      name: 'Ridge autoregression',
      target: key,
      trainingRows: trainingRows.length,
      holdoutRows: holdoutRows.length,
      mae: round(mae, 1),
      rmse: round(rmse, 1),
      persistenceMae: round(persistenceMae, 1),
      horizonHours: predictions.length,
      features: ['lag 1 h', 'lag 2 h', 'lag 3 h', 'lag 4 h', 'lag 6 h', 'lag 24 h', '6-hour mean', '24-hour mean', 'time of day'],
    },
  };
}

export function predictAqi(series, location) {
  const aqiModel = fitModel(series, 'us_aqi');
  if (!aqiModel || !aqiModel.predictions) {
    return {
      available: false,
      location: { name: location.name || 'Selected location', timezone: location.timezone || series.timezone },
      provider: series.provider,
      measurementType: 'modelled',
      reason: aqiModel?.reason || 'Not enough valid hourly history is available to train the prediction model.',
    };
  }

  const pmModel = fitModel(series, 'pm2_5');

  const predictions = aqiModel.predictions.map((entry, index) => {
    const usAqi = Math.round(entry.value);
    const rmse = aqiModel.model.rmse || 0;
    return {
      time: entry.time,
      localTime: entry.localTime,
      usAqi,
      usCategory: categorize('US', usAqi),
      lower: Math.max(0, Math.round(entry.value - rmse)),
      upper: Math.round(entry.value + rmse),
      pm25: pmModel?.predictions?.[index] ? round(pmModel.predictions[index].value, 1) : null,
    };
  });

  return {
    available: true,
    location: { name: location.name || 'Selected location', timezone: location.timezone || series.timezone },
    provider: series.provider,
    dataset: series.dataset,
    measurementType: 'modelled',
    generatedAt: series.fetchedAt,
    model: {
      ...aqiModel.model,
      description:
        'A ridge-regularised autoregressive model trained on this location’s recent hourly modelled history. It is not a pretrained model from another city, and it is not an official forecast.',
    },
    predictions,
    peak: predictions.reduce((best, entry) => (entry.usAqi > best.usAqi ? entry : best), predictions[0]),
    notes: [
      'Experimental statistical prediction, trained on modelled Open-Meteo history. It is not a measurement and not an official forecast.',
      'Predictions are recursive, so uncertainty grows with lead time. The shown range is based on holdout error and is not a guarantee.',
      'The model learns only this location’s recent pattern; it can miss events that were not present in the training window.',
    ],
  };
}
