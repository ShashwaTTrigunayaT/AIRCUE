import { useState } from 'react';
import { ArrowUpRight, Clock, Compass, Info } from 'lucide-react';
import { Badge, EmptyState, SectionHeading } from './States.jsx';
import { ACTIVITIES, DURATIONS, categoryColor } from '../utils/aqi.js';
import { formatClock, formatDateTime } from '../utils/format.js';

export default function BestWindow({ forecast, location, compact = false }) {
  const [activityKey, setActivityKey] = useState('walking');
  const activity = ACTIVITIES.find((entry) => entry.key === activityKey) || ACTIVITIES[0];
  const [duration, setDuration] = useState(activity.defaultDuration);

  const windows = forecast?.outdoorWindows;
  const durationData = windows?.durations?.[String(duration)];
  const best = durationData?.windows?.[0] || null;
  const alternatives = (durationData?.windows || []).slice(1);
  const timezone = location?.timezone;

  function changeActivity(key) {
    const next = ACTIVITIES.find((entry) => entry.key === key) || ACTIVITIES[0];
    setActivityKey(key);
    setDuration(next.defaultDuration);
  }

  return (
    <section className="panel" aria-labelledby="best-window-title">
      <SectionHeading
        id="best-window-title"
        eyebrow="Best outdoor window"
        title="Find a comparatively cleaner time outside"
        description="Ranks upcoming whole-hour forecast windows by PM2.5. The activity sets your planned time outside; the ranking itself is based on pollution, not on health guarantees. Sub-hour precision is not claimed from hourly data."
      />

      <div className="planner-controls">
        <label>
          <span>Activity</span>
          <select value={activityKey} onChange={(event) => changeActivity(event.target.value)}>
            {ACTIVITIES.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Duration</span>
          <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="planner-activity-note">{activity.note}</p>

      {best ? (
        <>
          <div className="best-window-card">
            <div className="best-window-time">
              <p className="eyebrow">Best-ranked forecast window</p>
              <p className="window-clock">
                <Clock size={18} aria-hidden="true" />
                {formatClock(best.startTime, timezone)} – {formatClock(best.endTime, timezone)}
              </p>
              <p className="window-day">{formatDateTime(best.startTime, timezone)}</p>
            </div>
            <div className="best-window-metrics">
              <div>
                <span>Mean PM2.5</span>
                <strong>{best.meanPm25} µg/m³</strong>
              </div>
              <div>
                <span>Peak PM2.5</span>
                <strong>{best.peakPm25} µg/m³</strong>
              </div>
              <div>
                <span>Mean US AQI</span>
                <strong>
                  {best.meanUsAqi ?? '—'}
                  {best.usAqiCategory ? (
                    <em
                      className="window-category"
                      style={{ color: categoryColor('US', best.usAqiCategory.key) }}
                    >
                      {best.usAqiCategory.label}
                    </em>
                  ) : null}
                </strong>
              </div>
            </div>
          </div>

          {!compact && alternatives.length ? (
            <div className="alternative-windows">
              <h3>Next-best windows</h3>
              <ul>
                {alternatives.map((window) => (
                  <li key={window.startTime}>
                    <span className="alt-time">
                      {formatClock(window.startTime, timezone)} – {formatClock(window.endTime, timezone)}
                    </span>
                    <span>{window.meanPm25} µg/m³ mean</span>
                    <span className="alt-peak">{window.peakPm25} µg/m³ peak</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="window-method">
            <Info size={16} aria-hidden="true" />
            <div>
              <p>{windows.method}</p>
              <p>{windows.rankingBasis}</p>
              <p>
                <strong>{windows.disclaimer}</strong> The US AQI shown alongside is a separate standard and is not used
                for ranking.
              </p>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          title="Not enough forecast data for this window"
          message={`AIR CUE did not find ${duration} contiguous forecast hours with complete PM2.5 values. It will not recommend a window from incomplete data.`}
        />
      )}

      <p className="panel-note">
        <Compass size={13} aria-hidden="true" /> Forecast horizon: {windows?.horizonHours || 48} hours ·{' '}
        {durationData?.availableWindows || 0} candidate windows evaluated ·{' '}
        <a href="/forecast" className="inline-link">
          See the full forecast <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </p>
    </section>
  );
}
