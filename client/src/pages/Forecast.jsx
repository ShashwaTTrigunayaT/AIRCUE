import { useAirQuality } from '../hooks/useAirQuality.js';
import { useLocationContext } from '../context/LocationContext.jsx';
import { useAlerts } from '../context/AlertsContext.jsx';
import LocationSearch from '../components/LocationSearch.jsx';
import ForecastPanel from '../components/ForecastPanel.jsx';
import PredictionPanel from '../components/PredictionPanel.jsx';
import BestWindow from '../components/BestWindow.jsx';
import AlertMonitor from '../components/AlertMonitor.jsx';
import { Badge, DataBadge, ErrorState, InlineNotice, LoadingState, SectionHeading } from '../components/States.jsx';
import { formatClock, formatDateTime } from '../utils/format.js';
import { STANDARD_LABELS } from '../utils/aqi.js';

export default function Forecast() {
  const { location } = useLocationContext();
  const { openDrawer } = useAlerts();
  const { status, current, forecast, error, errors, reload } = useAirQuality(location);

  const peak = forecast?.hourly?.length
    ? forecast.hourly
        .filter((hour) => typeof hour.us_aqi === 'number')
        .reduce((best, hour) => (hour.us_aqi > best.us_aqi ? hour : best), forecast.hourly[0])
    : null;

  const bestWindow = forecast?.outdoorWindows?.durations?.['60']?.windows?.[0] || null;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Forecast</p>
          <h1>Plan around the forecast, not the guesswork.</h1>
          <p className="page-lead">
            Modelled hourly projections, expected peaks and ranked outdoor windows. Forecasts are not guarantees, and
            they are always kept visually separate from current conditions.
          </p>
        </div>
        <div className="location-panel">
          <LocationSearch placeholder="Forecast for another city…" />
        </div>
      </div>

      <AlertMonitor current={current} forecast={forecast} />

      {status === 'loading' && !forecast ? <LoadingState label="Loading the air-quality forecast…" /> : null}
      {status === 'error' && !forecast ? (
        <ErrorState title="The forecast could not be loaded" message={error || errors.forecast} onRetry={reload} />
      ) : null}

      {forecast ? (
        <>
          <div className="stat-strip">
            <article className="stat-card">
              <span>Forecast peak (US AQI)</span>
              <strong>{peak ? Math.round(peak.us_aqi) : '—'}</strong>
              <p>{peak ? `${formatClock(peak.time, location?.timezone)} on ${formatDateTime(peak.time, location?.timezone)}` : 'No valid forecast hours'}</p>
            </article>
            <article className="stat-card">
              <span>Forecast coverage</span>
              <strong>{forecast.hourly.length} <small>hours</small></strong>
              <p>{formatDateTime(forecast.validFrom, location?.timezone)} → {formatDateTime(forecast.validTo, location?.timezone)}</p>
            </article>
            <article className="stat-card">
              <span>Best 60-minute window</span>
              <strong>{bestWindow ? formatClock(bestWindow.startTime, location?.timezone) : '—'}</strong>
              <p>{bestWindow ? `Mean PM2.5 ${bestWindow.meanPm25} µg/m³ · relative ranking` : 'Insufficient forecast data'}</p>
            </article>
            <article className="stat-card">
              <span>AQI standard shown</span>
              <strong>{STANDARD_LABELS[current?.primaryStandard]?.short || 'US AQI'}</strong>
              <p>Current conditions: {current?.aqi?.[current?.primaryStandard]?.value ?? 'n/a'} ({current?.aqi?.[current?.primaryStandard]?.category?.label || 'unavailable'})</p>
            </article>
          </div>

          <ForecastPanel forecast={forecast} location={location} />

          <PredictionPanel location={location} />

          <BestWindow forecast={forecast} location={location} />

          <section className="panel">
            <SectionHeading
              eyebrow="Peaks & expectations"
              title="What the forecast suggests"
              action={<DataBadge type="forecast" />}
            />
            <ul className="limitation-list">
              {forecast.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
            <div className="forecast-actions">
              <button type="button" className="btn btn-secondary" onClick={openDrawer}>
                Set an alert for the forecast peak
              </button>
              <Badge tone="muted">Alerts only run while AIR CUE is open</Badge>
            </div>
          </section>

          <InlineNotice tone="info" title="Observations vs forecast">
            The current-condition cards elsewhere in AIR CUE use the current modelled hour. This page shows future hours
            and clearly labels them as forecasts. No observation is presented as a forecast, or the reverse.
          </InlineNotice>
        </>
      ) : null}
    </div>
  );
}
