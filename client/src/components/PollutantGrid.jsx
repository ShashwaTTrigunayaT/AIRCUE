import { Info } from 'lucide-react';
import { Badge, SectionHeading } from './States.jsx';
import { formatDateTime, formatNumber } from '../utils/format.js';
import { POLLUTANT_HEALTH } from '../utils/aqi.js';

export default function PollutantGrid({ current }) {
  return (
    <section className="panel" aria-labelledby="pollutants-title">
      <SectionHeading
        id="pollutants-title"
        eyebrow="Pollutant indicators"
        title="What is in the air"
        description={`Hourly modelled concentrations for ${formatDateTime(current.dataTimestamp, current.location.timezone)}. Units are shown per pollutant; CO is displayed in the provider's µg/m³ unit.`}
      />
      <div className="pollutant-grid">
        {current.pollutants.map((pollutant) => (
          <article
            key={pollutant.key}
            className={`pollutant-card ${pollutant.available ? '' : 'is-unavailable'}`}
            aria-label={`${pollutant.name} (${pollutant.label})`}
          >
            <header>
              <div>
                <h3>{pollutant.label}</h3>
                <p className="pollutant-name">{pollutant.name}</p>
              </div>
              <Badge tone="modelled">Modelled</Badge>
            </header>

            {pollutant.available ? (
              <p className="pollutant-value">
                {formatNumber(pollutant.value, pollutant.precision)}
                <span className="pollutant-unit">{pollutant.unit}</span>
              </p>
            ) : (
              <p className="pollutant-value is-missing">
                Not available
                <span className="pollutant-unit">no value returned</span>
              </p>
            )}

            <p className="pollutant-blurb">{pollutant.blurb}</p>
            <p className="pollutant-health">{POLLUTANT_HEALTH[pollutant.key]}</p>
            <footer>
              {pollutant.available ? (
                <span>
                  {pollutant.provider} · {formatDateTime(pollutant.observedAt, current.location.timezone)}
                </span>
              ) : (
                <span>
                  <Info size={12} aria-hidden="true" /> Missing values are not replaced with zero.
                </span>
              )}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
