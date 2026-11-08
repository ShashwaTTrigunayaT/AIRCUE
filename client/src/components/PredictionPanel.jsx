import { BrainCircuit, RefreshCw } from 'lucide-react';
import { usePrediction } from '../hooks/usePrediction.js';
import { Badge, ErrorState, InlineNotice, LoadingState, SectionHeading } from './States.jsx';
import { categoryColor } from '../utils/aqi.js';
import { formatClock, formatNumber } from '../utils/format.js';

export default function PredictionPanel({ location }) {
  const { status, data, error, reload } = usePrediction(location);

  return (
    <section className="panel" aria-labelledby="prediction-title">
      <SectionHeading
        id="prediction-title"
        eyebrow="ML-based AQI prediction"
        title="A statistical look at the next 24 hours"
        description="A ridge-autoregression model trained on this location's recent modelled hourly history. Experimental: it is not an official forecast and not a measurement."
        action={
          <button type="button" className="btn btn-ghost btn-small" onClick={reload} disabled={status === 'loading'}>
            <RefreshCw size={14} className={status === 'loading' ? 'spin' : ''} aria-hidden="true" /> Retrain
          </button>
        }
      />

      {status === 'loading' ? <LoadingState label="Training the prediction model on recent hourly data…" rows={2} /> : null}

      {status === 'error' ? (
        <ErrorState
          title="The prediction model could not run"
          message={error}
          hint="The standard forecast from Open-Meteo is unaffected."
          onRetry={reload}
        />
      ) : null}

      {status === 'ready' && data && !data.available ? (
        <InlineNotice tone="info" title="Not enough history for this model">
          {data.reason} Open-Meteo's standard forecast is still available elsewhere on this page.
        </InlineNotice>
      ) : null}

      {status === 'ready' && data?.available ? (
        <>
          <div className="prediction-stats">
            <div>
              <span>Predicted peak (US AQI)</span>
              <strong style={{ color: categoryColor('US', data.peak?.usCategory?.key) }}>{data.peak?.usAqi}</strong>
              <small>{data.peak?.usCategory?.label || 'Unavailable'}</small>
            </div>
            <div>
              <span>Holdout MAE</span>
              <strong>{data.model.mae}</strong>
              <small>US AQI points · persistence baseline {data.model.persistenceMae}</small>
            </div>
            <div>
              <span>Holdout RMSE</span>
              <strong>{data.model.rmse}</strong>
              <small>Range in the table uses this error</small>
            </div>
            <div>
              <span>Training rows</span>
              <strong>{data.model.trainingRows}</strong>
              <small>{data.model.features.length} features · {data.model.horizonHours} h horizon</small>
            </div>
          </div>

          <div className="prediction-table" role="table" aria-label="Predicted hourly US AQI">
            <div className="prediction-head" role="row">
              <span role="columnheader">Hour</span>
              <span role="columnheader">Predicted AQI</span>
              <span role="columnheader">Category</span>
              <span role="columnheader">Range</span>
              <span role="columnheader">Predicted PM2.5</span>
            </div>
            {data.predictions.map((entry) => (
              <div className="prediction-row" role="row" key={entry.time}>
                <span className="prediction-time" role="cell">
                  {formatClock(entry.time, data.location?.timezone)}
                </span>
                <strong
                  className="prediction-aqi"
                  role="cell"
                  style={{ color: categoryColor('US', entry.usCategory?.key) }}
                >
                  {entry.usAqi}
                </strong>
                <span className="prediction-category" role="cell">
                  {entry.usCategory?.label}
                </span>
                <span className="prediction-range" role="cell">
                  {entry.lower}–{entry.upper}
                </span>
                <span className="prediction-pm" role="cell">
                  {entry.pm25 !== null ? `${formatNumber(entry.pm25, 1)} µg/m³` : '—'}
                </span>
              </div>
            ))}
          </div>

          {data.model.mae > data.model.persistenceMae ? (
            <InlineNotice tone="info" title="Model vs persistence baseline">
              On this holdout, carrying the latest value forward scored a lower error ({data.model.persistenceMae}{' '}
              MAE) than the trained model ({data.model.mae} MAE). The prediction is shown as an experimental
              comparison, not a guaranteed improvement.
            </InlineNotice>
          ) : null}

          <p className="panel-note">
            <Badge tone="forecast" icon={BrainCircuit}>Experimental model</Badge> {data.model.description}
          </p>
          <ul className="limitation-list">
            {data.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
