import { ChevronDown, Database } from 'lucide-react';
import { formatDateTime } from '../utils/format.js';

export default function ProvenancePanel({ current, compact = false }) {
  if (!current) return null;
  const provenance = current.provenance || {};

  return (
    <details className={`panel provenance-panel ${compact ? 'panel-compact' : ''}`}>
      <summary>
        <span className="provenance-summary">
          <Database size={17} aria-hidden="true" />
          <span>
            <strong>Data provenance & limitations</strong>
            <small>
              {current.provider} · {current.measurementType} · fetched {formatDateTime(current.fetchedAt, current.location.timezone)}
            </small>
          </span>
        </span>
        <ChevronDown size={17} className="details-chevron" aria-hidden="true" />
      </summary>

      <div className="provenance-body">
        <dl className="provenance-grid">
          <div>
            <dt>Provider</dt>
            <dd>{provenance.provider || current.provider}</dd>
          </div>
          <div>
            <dt>Dataset / model</dt>
            <dd>{provenance.dataset || current.dataset}</dd>
          </div>
          <div>
            <dt>Measurement type</dt>
            <dd>{provenance.measurementType || current.measurementType} (not a station observation)</dd>
          </div>
          <div>
            <dt>Station</dt>
            <dd>{provenance.stationName ? `${provenance.stationName} (${provenance.stationId || 'no id'})` : 'Not applicable — modelled grid value'}</dd>
          </div>
          <div>
            <dt>Data hour</dt>
            <dd>{formatDateTime(provenance.dataTimestamp || current.dataTimestamp, current.location.timezone)}</dd>
          </div>
          <div>
            <dt>Fetched</dt>
            <dd>{formatDateTime(provenance.fetchedAt || current.fetchedAt, current.location.timezone)}</dd>
          </div>
          <div>
            <dt>Spatial resolution</dt>
            <dd>{provenance.spatialResolution || 'Provider/model dependent'}</dd>
          </div>
          <div>
            <dt>AQI standards</dt>
            <dd>
              {Object.entries(provenance.aqiStandards || {})
                .map(([standard, note]) => `${standard}: ${note}`)
                .join(' · ')}
            </dd>
          </div>
        </dl>

        <h3>Known limitations</h3>
        <ul className="limitation-list">
          {(provenance.limitations || []).map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>

        <p className="panel-note">
          AIR CUE keeps raw provider data intact for debugging. Estimated or missing values are never substituted for
          observations.
        </p>
      </div>
    </details>
  );
}
