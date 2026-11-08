import { Lightbulb, RefreshCw } from 'lucide-react';
import { useInsights } from '../hooks/useInsights.js';
import { Badge, ErrorState, LoadingState, SectionHeading } from './States.jsx';
import { formatDateTime } from '../utils/format.js';

export default function InsightsPanel({ location, compact = false }) {
  const { status, data, error, reload } = useInsights(location);

  return (
    <section className={`panel ${compact ? 'panel-compact' : ''}`} aria-labelledby="insights-title">
      <SectionHeading
        id="insights-title"
        eyebrow="Pollution insights"
        title={compact ? 'Signals worth knowing' : 'What the data is telling you'}
        description="Generated only from the readings, forecast and trend already loaded for this location."
        action={
          <button type="button" className="btn btn-ghost btn-small" onClick={reload} disabled={status === 'loading'}>
            <RefreshCw size={14} className={status === 'loading' ? 'spin' : ''} aria-hidden="true" /> Refresh
          </button>
        }
      />

      {status === 'loading' ? <LoadingState label="Generating grounded insights…" rows={2} /> : null}
      {status === 'error' ? <ErrorState title="Insights are unavailable" message={error} onRetry={reload} /> : null}

      {status === 'ready' && data ? (
        <>
          <div className="insights-toolbar">
            <Badge tone={data.source === 'groq' ? 'ai' : 'rules'} icon={Lightbulb}>
              {data.source === 'groq' ? 'AIRCUE Copilot' : 'Rule-based'}
            </Badge>
            <span className="insight-meta">
              {data.provider} · {data.measurementType} · data hour {formatDateTime(data.dataTimestamp, location?.timezone)}
            </span>
          </div>

          <ul className="insight-list">
            {data.insights.map((insight, index) => (
              <li key={`${insight.title}-${index}`}>
                <span className="insight-index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{insight.title}</h3>
                  <p>{insight.detail}</p>
                  {insight.basis ? <p className="insight-basis">Basis: {insight.basis}</p> : null}
                </div>
              </li>
            ))}
          </ul>

          <p className="panel-note">{data.note}</p>
          {data.aiError ? <p className="panel-note is-warning">Copilot note: {data.aiError}</p> : null}
        </>
      ) : null}
    </section>
  );
}
