import { useState } from 'react';
import { Clock, RefreshCw, Share2, Star, TriangleAlert } from 'lucide-react';
import { Badge, DataBadge } from './States.jsx';
import ShareCard from './ShareCard.jsx';
import { STANDARD_LABELS, categoryColor, guidanceFor } from '../utils/aqi.js';
import { formatDateTime, formatNumber, locationSubtitle, locationTitle, timeAgo } from '../utils/format.js';

const SCALE_MAX = { CPCB: 500, US: 500, EU: 100 };

function AqiGauge({ value, standard, color, label }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const maximum = SCALE_MAX[standard] || 500;
  const progress = Math.min(Math.max(value / maximum, 0), 1);
  const dash = circumference * progress;

  return (
    <div className="aqi-gauge" style={{ '--gauge-color': color }}>
      <svg viewBox="0 0 128 128" role="img" aria-label={`${label} ${value} out of ${maximum}`}>
        <circle className="gauge-track" cx="64" cy="64" r={radius} />
        <circle
          className="gauge-progress"
          cx="64"
          cy="64"
          r={radius}
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="gauge-content">
        <span className="gauge-value">{value}</span>
        <span className="gauge-caption">{STANDARD_LABELS[standard]?.short || standard}</span>
      </div>
    </div>
  );
}

export default function AqiHero({ current, standard, onSelectStandard, onSave, isSaved, onRefresh, refreshing }) {
  const block = current.aqi?.[standard];
  const availableStandards = Object.keys(current.aqi).filter((key) => current.aqi[key]?.valid);
  const category = block?.valid ? block.category : null;
  const color = category ? categoryColor(standard, category.key) : '#64748b';
  const guidance = category ? guidanceFor(standard, category.key) : null;
  const standardMeta = STANDARD_LABELS[standard];
  const [shareOpen, setShareOpen] = useState(false);
  const provenance = [
    block?.source || current.provider,
    block?.averaging ? `averaging: ${block.averaging}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="panel hero-panel" aria-labelledby="aqi-hero-title">
      <div className="hero-top">
        <div>
          <p className="eyebrow">Current air quality</p>
          <h1 id="aqi-hero-title">{locationTitle(current.location)}</h1>
          <p className="hero-subtitle">
            {locationSubtitle(current.location) || 'Selected coordinates'}
            {current.stale ? <span className="stale-flag">Stale data</span> : null}
          </p>
        </div>
        <div className="hero-actions">
          {block?.valid ? (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setShareOpen(true)}>
              <Share2 size={15} aria-hidden="true" /> Share
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost btn-small" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} aria-hidden="true" />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
          <button
            type="button"
            className={`btn btn-ghost btn-small ${isSaved ? 'is-saved' : ''}`}
            onClick={onSave}
            aria-pressed={isSaved}
          >
            <Star size={15} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
            {isSaved ? 'Saved' : 'Save location'}
          </button>
        </div>
      </div>

      {block?.valid ? (
        <div className="hero-main">
          <AqiGauge value={block.value} standard={standard} color={color} label={standardMeta?.long || standard} />
          <div className="hero-reading">
            <div className="hero-category" style={{ color }}>
              {category.label}
            </div>
            <p className="hero-standard">
              {standardMeta?.long || standard} · scale {standardMeta?.short === 'EU AQI' ? '0–100+' : '0–500'}
            </p>
            <p className="hero-guidance">{guidance?.headline}</p>
            <div className="hero-meta">
              <Badge tone="provenance" icon={Clock}>
                Data hour {formatDateTime(current.dataTimestamp, current.location.timezone)}
              </Badge>
              <DataBadge type={current.measurementType} />
              <Badge tone="muted">Fetched {timeAgo(current.fetchedAt)}</Badge>
            </div>
            <p className="hero-provenance">{provenance}</p>
          </div>
        </div>
      ) : (
        <div className="hero-unavailable">
          <TriangleAlert size={22} aria-hidden="true" />
          <div>
            <h3>No valid {standardMeta?.short || standard} is available for this hour</h3>
            <p>{block?.reason || 'The provider did not return enough data to calculate this index.'}</p>
            {availableStandards.length ? (
              <button type="button" className="btn btn-secondary btn-small" onClick={() => onSelectStandard(availableStandards[0])}>
                Show {STANDARD_LABELS[availableStandards[0]]?.short || availableStandards[0]} instead
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div className="standard-switcher" role="group" aria-label="AQI standard">
        <span className="standard-switcher-label">AQI standard</span>
        {Object.keys(current.aqi).map((key) => {
          const option = current.aqi[key];
          return (
            <button
              key={key}
              type="button"
              className={`chip ${standard === key ? 'is-selected' : ''}`}
              onClick={() => onSelectStandard(key)}
              aria-pressed={standard === key}
              disabled={!option?.valid}
              title={option?.valid ? STANDARD_LABELS[key]?.note : option?.reason}
            >
              {STANDARD_LABELS[key]?.short || key}
              {option?.valid ? <span className="chip-value">{option.value}</span> : <span className="chip-value">n/a</span>}
            </button>
          );
        })}
      </div>

      {block?.valid && block.dominant ? (
        <div className="dominant-note">
          <strong>Dominant pollutant:</strong> {block.dominant.label}
          <span>
            {block.dominant.basis === 'highest CPCB sub-index'
              ? ` (highest CPCB sub-index: ${block.dominant.subIndex})`
              : block.dominant.basis === 'highest provider US AQI sub-index'
                ? ` (highest provider US AQI sub-index: ${block.dominant.subIndex})`
                : ''}
          </span>
          {block.dominant.concentration !== undefined ? (
            <span className="dominant-conc">
              {' '}
              · {formatNumber(block.dominant.concentration, 1)} {block.dominant.unit}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="dominant-note is-muted">
          Dominant-pollutant attribution requires provider sub-index data or a valid CPCB calculation. It is not shown
          when the data does not support that conclusion.
        </p>
      )}

      <div className="hero-footnote">
        <p>
          <strong>What this is:</strong> {current.measurementType} data from {current.dataset}. “Modelled” means gridded
          model output, not a nearby monitoring station.
        </p>
        <p>
          <strong>What this is not:</strong> a medical assessment or a guarantee that conditions are safe. See{' '}
          <em>Data sources & limitations</em> in the footer.
        </p>
      </div>

      <ShareCard open={shareOpen} onClose={() => setShareOpen(false)} current={current} standard={standard} />
    </section>
  );
}
