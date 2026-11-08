import { useEffect, useState } from 'react';
import { ArrowUpRight, MapPin, Star, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocationContext } from '../context/LocationContext.jsx';
import { useAirQuality } from '../hooks/useAirQuality.js';
import LocationSearch from '../components/LocationSearch.jsx';
import AqiHero from '../components/AqiHero.jsx';
import PollutantGrid from '../components/PollutantGrid.jsx';
import HealthAdvisory from '../components/HealthAdvisory.jsx';
import InsightsPanel from '../components/InsightsPanel.jsx';
import BestWindow from '../components/BestWindow.jsx';
import CleanAirFinder from '../components/CleanAirFinder.jsx';
import ForecastPanel from '../components/ForecastPanel.jsx';
import ProvenancePanel from '../components/ProvenancePanel.jsx';
import AlertMonitor from '../components/AlertMonitor.jsx';
import { InlineNotice, LoadingState, ErrorState, SectionHeading } from '../components/States.jsx';

export default function Overview() {
  const { location, setLocation, savedLocations, removeSavedLocation, isSaved, addSavedLocation } = useLocationContext();
  const { status, current, forecast, history, error, errors, refreshing, reload, updatedAt } = useAirQuality(location);
  const [standard, setStandard] = useState('US');

  useEffect(() => {
    if (current?.primaryStandard) setStandard(current.primaryStandard);
  }, [current?.primaryStandard, location.latitude, location.longitude]);

  const saved = isSaved(location);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Know the air before you go out.</h1>
          <p className="page-lead">
            Live pollution intelligence, health guidance, forecasts and cleaner alternatives — with the source and
            measurement type always visible.
          </p>
        </div>
        <div className="location-panel">
          <LocationSearch placeholder="Search a city to inspect its air…" />
          {savedLocations.length ? (
            <div className="saved-locations">
              <span className="saved-label">Saved</span>
              {savedLocations.map((entry) => (
                <span key={`${entry.latitude}-${entry.longitude}`} className="saved-chip">
                  <button type="button" className="saved-chip-main" onClick={() => setLocation(entry)}>
                    <MapPin size={12} aria-hidden="true" /> {entry.name}
                  </button>
                  <button
                    type="button"
                    className="saved-chip-remove"
                    aria-label={`Remove ${entry.name} from saved locations`}
                    onClick={() => removeSavedLocation(entry)}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <AlertMonitor current={current} forecast={forecast} />

      {status === 'loading' && !current ? <LoadingState label="Loading the latest air-quality data…" rows={4} /> : null}

      {status === 'error' && !current ? (
        <ErrorState
          title="Air-quality data could not be loaded"
          message={error}
          hint="The Open-Meteo provider may be temporarily unavailable. Your last selected location is kept; try again in a moment."
          onRetry={reload}
        />
      ) : null}

      {current ? (
        <>
          <AqiHero
            current={current}
            standard={standard}
            onSelectStandard={setStandard}
            onRefresh={reload}
            refreshing={refreshing}
            onSave={() => (saved ? removeSavedLocation(location) : addSavedLocation(location))}
            isSaved={saved}
          />

          {(errors.forecast || errors.history) && (
            <InlineNotice tone="warning" title="Some sections did not refresh">
              {[errors.forecast, errors.history].filter(Boolean).join(' ')} Current conditions are still shown.
            </InlineNotice>
          )}

          <div className="two-column">
            <HealthAdvisory current={current} standard={standard} />
            <InsightsPanel location={location} compact />
          </div>

          <PollutantGrid current={current} />

          <div className="two-column two-column-wide">
            {forecast ? <ForecastPanel forecast={forecast} location={location} compact /> : null}
            {history ? (
              <section className="panel" aria-labelledby="quick-trend-title">
                <SectionHeading
                  id="quick-trend-title"
                  eyebrow="Last 24 hours"
                  title="Recent PM2.5 trend"
                  description="Modelled historical values. Full analytics are on the Historical Trends page."
                  action={
                    <Link className="btn btn-ghost btn-small" to="/trends">
                      Full analytics <ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                  }
                />
                <div className="quick-stats">
                  <div>
                    <span>Average PM2.5</span>
                    <strong>{history.current24.pm2_5?.average ?? '—'} µg/m³</strong>
                  </div>
                  <div>
                    <span>Highest</span>
                    <strong>{history.current24.pm2_5?.max ?? '—'} µg/m³</strong>
                  </div>
                  <div>
                    <span>Lowest</span>
                    <strong>{history.current24.pm2_5?.min ?? '—'} µg/m³</strong>
                  </div>
                  <div>
                    <span>vs previous 24 h</span>
                    <strong
                      className={
                        typeof history.change24h?.pm2_5 === 'number'
                          ? history.change24h.pm2_5 > 0
                            ? 'is-worse'
                            : 'is-better'
                          : ''
                      }
                    >
                      {typeof history.change24h?.pm2_5 === 'number'
                        ? `${history.change24h.pm2_5 > 0 ? '+' : ''}${history.change24h.pm2_5}%`
                        : 'n/a'}
                    </strong>
                  </div>
                </div>
                <p className="panel-note">
                  Change is shown only when both 24-hour periods have enough modelled hourly values. Updated{' '}
                  {updatedAt ? new Date(updatedAt).toLocaleTimeString() : '—'}.
                </p>
              </section>
            ) : null}
          </div>

          {forecast ? <BestWindow forecast={forecast} location={location} compact /> : null}

          <CleanAirFinder location={location} compact />

          <ProvenancePanel current={current} />
        </>
      ) : null}
    </div>
  );
}
