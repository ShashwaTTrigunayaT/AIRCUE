import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import ForecastChart, { FORECAST_METRICS } from '../charts/ForecastChart.jsx';
import { Badge, DataBadge, SectionHeading } from './States.jsx';
import { formatClock, formatDate, formatDateTime, formatNumber } from '../utils/format.js';

export default function ForecastPanel({ forecast, location, compact = false }) {
  const [metric, setMetric] = useState('us_aqi');
  const [hours, setHours] = useState(compact ? 24 : 48);

  const hourly = useMemo(() => (forecast?.hourly || []).slice(0, hours), [forecast, hours]);

  const peak = useMemo(() => {
    const valid = (forecast?.hourly || []).filter((hour) => typeof hour.us_aqi === 'number');
    if (!valid.length) return null;
    return valid.reduce((best, hour) => (hour.us_aqi > best.us_aqi ? hour : best), valid[0]);
  }, [forecast]);

  if (!forecast) {
    return (
      <section className="panel">
        <SectionHeading eyebrow="Forecast" title="AQI forecast" />
        <p className="chart-empty">Forecast data is unavailable. Current conditions are still shown above.</p>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="forecast-panel-title">
      <SectionHeading
        id="forecast-panel-title"
        eyebrow="AQI forecast"
        title="How conditions may change"
        description={`Modelled hourly forecast from ${forecast.provider}. Forecast values are projections, not observations.`}
        action={
          <div className="segmented" role="group" aria-label="Forecast horizon">
            <button type="button" className={hours === 24 ? 'is-active' : ''} onClick={() => setHours(24)}>
              24 h
            </button>
            <button type="button" className={hours === 48 ? 'is-active' : ''} onClick={() => setHours(48)}>
              48 h
            </button>
          </div>
        }
      />

      <div className="chart-toolbar">
        <label className="inline-select">
          <span>Show</span>
          <select value={metric} onChange={(event) => setMetric(event.target.value)} aria-label="Forecast pollutant">
            {Object.entries(FORECAST_METRICS).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>
        <div className="chart-toolbar-badges">
          <DataBadge type="forecast" />
          <Badge tone="muted">{FORECAST_METRICS[metric]?.unit}</Badge>
          {peak ? (
            <Badge tone="provenance" icon={TrendingUp}>
              Peak US AQI {Math.round(peak.us_aqi)} · {formatClock(peak.time, location?.timezone)}
            </Badge>
          ) : null}
        </div>
      </div>

      <ForecastChart hourly={hourly} metric={metric} timezone={location?.timezone} height={compact ? 260 : 320} />

      <p className="panel-note">
        Forecast period {formatDateTime(forecast.validFrom, location?.timezone)} →{' '}
        {formatDateTime(forecast.validTo, location?.timezone)} · {forecast.hourly.length} hourly values available ·{' '}
        {forecast.forecastType}
      </p>

      {!compact && forecast.daily?.length ? (
        <div className="daily-forecast">
          <h3>Daily summary</h3>
          <div className="daily-grid">
            {forecast.daily.slice(0, 5).map((day) => (
              <article key={day.date} className="daily-card">
                <h4>{formatDate(`${day.date}T12:00:00Z`, location?.timezone)}</h4>
                <dl>
                  <div>
                    <dt>PM2.5 mean</dt>
                    <dd>{formatNumber(day.pm2_5, 1)} µg/m³</dd>
                  </div>
                  <div>
                    <dt>PM10 mean</dt>
                    <dd>{formatNumber(day.pm10, 1)} µg/m³</dd>
                  </div>
                  <div>
                    <dt>US AQI max</dt>
                    <dd>{formatNumber(day.usAqiMax, 0)}</dd>
                  </div>
                </dl>
                <p>
                  {day.hoursCovered} hourly values · aggregated by AIR CUE
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
