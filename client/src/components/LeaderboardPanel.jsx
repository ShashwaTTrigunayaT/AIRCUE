import { ArrowUpRight, Trophy } from 'lucide-react';
import { Badge, SectionHeading } from './States.jsx';
import { categoryColor } from '../utils/aqi.js';
import { formatNumber } from '../utils/format.js';

function pm25Of(city) {
  const value = city.pollutants?.pm2_5;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export default function LeaderboardPanel({ cities = [], onSelectCity }) {
  const ranked = cities
    .map((city) => {
      const reading = city.aqi?.US?.valid ? city.aqi.US : null;
      return reading ? { ...city, reading } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.reading.value - a.reading.value);

  return (
    <section className="panel" aria-labelledby="leaderboard-title">
      <SectionHeading
        id="leaderboard-title"
        eyebrow="Pollution leaderboard"
        title="Nearby cities ranked by modelled US AQI"
        description="Highest predicted pollution first. Only cities with a valid provider US AQI are ranked, so every row uses the same scale and measurement type."
        action={<Badge tone="modelled" icon={Trophy}>US AQI only</Badge>}
      />

      {ranked.length ? (
        <ol className="leaderboard">
          {ranked.map((city, index) => {
            const pm25 = pm25Of(city);
            return (
              <li className="leaderboard-row" key={city.id}>
                <span className="leaderboard-rank">{index + 1}</span>
                <div className="leaderboard-city">
                  <strong>{city.name}</strong>
                  <small>{[city.admin1, city.country].filter(Boolean).join(', ')}</small>
                </div>
                <strong
                  className="leaderboard-aqi"
                  style={{ color: categoryColor('US', city.reading.category?.key) }}
                >
                  {city.reading.value}
                </strong>
                <span className="leaderboard-category">{city.reading.category?.label}</span>
                <span className="leaderboard-pm">
                  {pm25 !== null ? `PM2.5 ${formatNumber(pm25, 1)} µg/m³` : 'PM2.5 unavailable'}
                </span>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => onSelectCity?.(city)}>
                  Open <ArrowUpRight size={13} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="panel-note">No nearby city currently has a valid provider US AQI to rank.</p>
      )}

      <p className="panel-note">
        Modelled city-grid samples from Open-Meteo, not monitoring-station measurements. A lower or higher rank is
        relative information, not a safety guarantee or a statement about causes.
      </p>
    </section>
  );
}
