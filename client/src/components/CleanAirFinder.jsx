import { Link } from 'react-router-dom';
import { ArrowRight, Compass, MapPin, RefreshCw, Wind } from 'lucide-react';
import { useNearby } from '../hooks/useNearby.js';
import { Badge, EmptyState, ErrorState, InlineNotice, LoadingState, SectionHeading } from './States.jsx';
import { categoryColor } from '../utils/aqi.js';
import { formatNumber, shortCoords } from '../utils/format.js';

const RADIUS_OPTIONS = [
  { value: 5000, label: '5 km' },
  { value: 15000, label: '15 km' },
  { value: 25000, label: '25 km' },
  { value: 50000, label: '50 km' },
];

export default function CleanAirFinder({ location, radius, onRadiusChange, compact = false }) {
  const selectedRadius = radius || 25000;
  const { status, data, error, reload, refreshing } = useNearby(location, selectedRadius);
  const hasCleaner = Boolean(data?.cleaner?.length);
  const shownSamples = hasCleaner ? data.cleaner : (data?.lowestSamples || []).slice(0, 3);

  return (
    <section className="panel" aria-labelledby="finder-title">
      <SectionHeading
        id="finder-title"
        eyebrow="Clean Air Finder"
        title="Is the air better nearby?"
        description="Samples the same model in eight directions around your location and ranks points with a lower US AQI. These are modelled grid points, not monitoring stations."
        action={
          <div className="finder-actions">
            {onRadiusChange ? (
              <select
                value={selectedRadius}
                aria-label="Clean Air Finder search radius"
                onChange={(event) => onRadiusChange(Number(event.target.value))}
              >
                {RADIUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}
            <button type="button" className="btn btn-ghost btn-small" onClick={reload} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} aria-hidden="true" /> Rescan
            </button>
          </div>
        }
      />

      {status === 'loading' ? <LoadingState label="Sampling nearby model grid points…" rows={2} /> : null}
      {status === 'error' ? (
        <ErrorState title="Clean Air Finder is unavailable" message={error} hint="Modelled air-quality data for the selected location is unaffected." onRetry={reload} />
      ) : null}

      {status === 'ready' && data ? (
        <>
          {data.gridResolutionNote ? (
            <InlineNotice tone="info" title="Model resolution limit">
              {data.gridResolutionNote}
            </InlineNotice>
          ) : null}

          <div className="finder-baseline">
            <div>
              <span className="finder-label">Your location</span>
              <strong>{data.origin?.name || location?.name}</strong>
              <small>{shortCoords(data.origin?.latitude, data.origin?.longitude)} · radius {data.searchedRadiusMeters / 1000} km</small>
            </div>
            <div className="finder-baseline-aqi">
              <span>US AQI</span>
              <strong style={{ color: data.origin?.usCategory ? categoryColor('US', data.origin.usCategory.key) : undefined }}>
                {data.origin?.usAqi ?? '—'}
              </strong>
              <small>
                PM2.5 {formatNumber(data.origin?.pm25, 1)} µg/m³
                <br />
                {data.comparisonStandard} · modelled
              </small>
            </div>
          </div>

          {shownSamples.length ? (
            <>
              <div className="finder-results-head">
                <h3>
                  {hasCleaner
                    ? `Lower-AQI samples within ${data.searchedRadiusMeters / 1000} km`
                    : `Lowest-AQI samples within ${data.searchedRadiusMeters / 1000} km`}
                </h3>
                <Badge tone="modelled" icon={Wind}>
                  Modelled samples · {data.comparisonStandard} AQI
                </Badge>
              </div>
              {!hasCleaner ? (
                <p className="panel-note">
                  No sampled point had a US AQI at least 5 index points lower than the origin. These are the
                  lowest-ranked samples, not necessarily cleaner air.
                </p>
              ) : null}
              <ol className="finder-list">
                {shownSamples.map((sample, index) => (
                  <li key={`${sample.latitude}-${sample.longitude}`}>
                    <span className="finder-rank">{index + 1}</span>
                    <div className="finder-place">
                      <strong>
                        {sample.distanceKm} km {sample.bearingLabel}
                      </strong>
                      <small>
                        <MapPin size={12} aria-hidden="true" /> {shortCoords(sample.latitude, sample.longitude)}
                      </small>
                    </div>
                    <div className="finder-values">
                      <span className="finder-aqi" style={{ color: categoryColor('US', sample.usCategory?.key) }}>
                        {sample.usAqi}
                      </span>
                      <small>
                        US AQI · {sample.usCategory?.label}
                        <br />
                        PM2.5 {formatNumber(sample.pm25, 1)} µg/m³
                      </small>
                    </div>
                    <Link
                      className="btn btn-ghost btn-small"
                      to={`/map?lat=${sample.latitude}&lon=${sample.longitude}&name=${encodeURIComponent(`${sample.distanceKm} km ${sample.bearingLabel} of ${location?.name || 'location'}`)}`}
                    >
                      View on map <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <EmptyState
              title="No comparably cleaner sample found"
              message={`None of the sampled points within ${data.searchedRadiusMeters / 1000} km had a US AQI at least 5 points lower than the origin. That does not mean the air is uniform — it means the model does not show a meaningfully lower nearby reading.`}
            />
          )}

          {!compact ? (
            <div className="finder-method">
              <Compass size={16} aria-hidden="true" />
              <div>
                <p>{data.method}</p>
                {data.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
                <p>
                  Sampling grid: 24 points (8 directions × 3 distances). All values come from {data.provider} (
                  {data.dataset}), measurement type {data.measurementType}.
                </p>
              </div>
            </div>
          ) : (
            <p className="panel-note">
              Modelled grid samples from {data.provider} · US AQI only, so every ranked row shares one scale.
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
