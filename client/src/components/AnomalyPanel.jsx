import { Activity, ArrowDownRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useAnomalies } from '../hooks/useAnomalies.js';
import { Badge, EmptyState, ErrorState, InlineNotice, LoadingState, SectionHeading } from './States.jsx';
import { formatDateTime } from '../utils/format.js';

const KIND_LABELS = {
  'baseline-deviation': 'Baseline deviation',
  'rapid-change': 'Rapid change',
};

function AnomalyValue({ anomaly }) {
  const unit = anomaly.unit === 'index' ? '' : ` ${anomaly.unit}`;
  return (
    <span className="anomaly-value">
      {anomaly.observed}
      {unit}
    </span>
  );
}

export default function AnomalyPanel({ location }) {
  const { status, data, error, reload } = useAnomalies(location);
  const timezone = location?.timezone;

  return (
    <section className="panel" aria-labelledby="anomaly-title">
      <SectionHeading
        id="anomaly-title"
        eyebrow="Anomaly detection"
        title="Unusual changes in the modelled series"
        description="Compares the current hour with a seven-day baseline and with the previous available hour. Flags are statistical, not explanations of cause."
        action={<Badge tone="provenance" icon={Activity}>Baseline z-score</Badge>}
      />

      {status === 'loading' ? <LoadingState label="Checking for unusual pollution changes…" rows={2} /> : null}

      {status === 'error' ? (
        <ErrorState
          title="Anomaly analysis is unavailable"
          message={error}
          hint="The rest of the historical data is unaffected."
          onRetry={reload}
        />
      ) : null}

      {status === 'ready' && data ? (
        <>
          {!data.available ? (
            <InlineNotice tone="info" title="Not enough history for a baseline">
              {data.reason}
            </InlineNotice>
          ) : data.anomalies.length ? (
            <div className="anomaly-grid">
              {data.anomalies.map((anomaly) => (
                <article key={anomaly.id} className={`anomaly-card anomaly-${anomaly.severity}`}>
                  <header>
                    <Badge tone={anomaly.severity === 'high' ? 'rules' : 'forecast'}>
                      {anomaly.severity === 'high' ? 'High deviation' : 'Moderate deviation'}
                    </Badge>
                    <span className="anomaly-kind">{KIND_LABELS[anomaly.kind] || anomaly.kind}</span>
                  </header>
                  <h3>
                    {anomaly.label} is {anomaly.direction === 'above' ? 'above' : 'below'} its usual range
                  </h3>
                  <p className="anomaly-explanation">{anomaly.explanation}</p>
                  <dl className="anomaly-metrics">
                    <div>
                      <dt>Current</dt>
                      <dd><AnomalyValue anomaly={anomaly} /></dd>
                    </div>
                    {anomaly.kind === 'baseline-deviation' ? (
                      <>
                        <div>
                          <dt>7-day baseline</dt>
                          <dd>
                            {anomaly.baselineMean}
                            {anomaly.unit === 'index' ? '' : ` ${anomaly.unit}`}
                          </dd>
                        </div>
                        <div>
                          <dt>z-score</dt>
                          <dd>{anomaly.zScore}</dd>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <dt>Previous hour</dt>
                          <dd>
                            {anomaly.previousValue}
                            {anomaly.unit === 'index' ? '' : ` ${anomaly.unit}`}
                          </dd>
                        </div>
                        <div>
                          <dt>Change</dt>
                          <dd>
                            {anomaly.percentChange > 0 ? (
                              <ArrowUpRight size={14} aria-hidden="true" />
                            ) : (
                              <ArrowDownRight size={14} aria-hidden="true" />
                            )}
                            {anomaly.percentChange > 0 ? '+' : ''}
                            {anomaly.percentChange}%
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                  <footer>
                    {formatDateTime(anomaly.at, timezone)} · modelled · Open-Meteo
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No unusual statistical change detected"
              message="The current modelled values are within the configured baseline and rapid-change limits. That does not mean the air is safe — check the AQI category and health guidance."
              action={
                <button type="button" className="btn btn-ghost btn-small" onClick={reload}>
                  <RefreshCw size={14} aria-hidden="true" /> Recheck
                </button>
              }
            />
          )}

          <p className="panel-note">
            {data.method} Baseline: {data.baseline.baselineHours} hourly values; thresholds: |z| ≥{' '}
            {data.thresholds.zScore}, change ≥ {data.thresholds.rapidChangePercent}%. Values come from{' '}
            {data.provider} ({data.measurementType}).
          </p>
        </>
      ) : null}
    </section>
  );
}
