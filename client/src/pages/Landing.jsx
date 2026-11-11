import { Link } from 'react-router-dom';
import { Clock, Cpu, Droplets, Scale, Wind } from 'lucide-react';
import { useLocationContext } from '../context/LocationContext.jsx';
import { useAirQuality } from '../hooks/useAirQuality.js';
import {
  formatDateTime,
  formatNumber,
  locationSubtitle,
  locationTitle,
  timeAgo,
} from '../utils/format.js';
import { STANDARD_LABELS, categoryColor } from '../utils/aqi.js';
import heroImage from '../assets/hero-cityscape.png';

const POLLUTANT_ORDER = [
  { key: 'pm2_5', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
  { key: 'carbon_monoxide', label: 'CO' },
  { key: 'nitrogen_dioxide', label: 'NO₂' },
  { key: 'sulphur_dioxide', label: 'SO₂' },
  { key: 'ozone', label: 'O₃' },
];

const STATS = [
  {
    Icon: Scale,
    title: '3 AQI Standards',
    detail: 'CPCB, US EPA, EU',
  },
  {
    Icon: Droplets,
    title: '6 Pollutants Tracked',
    detail: 'PM2.5, PM10, CO, NO₂, SO₂, O₃',
  },
  {
    Icon: Clock,
    title: '48h Forecast & Best Outdoor Window',
    detail: 'Plan the cleaner hour ahead',
  },
  {
    Icon: Cpu,
    title: '13+ Advanced Features',
    detail: 'AI, ML, Alerts and more',
  },
];

function chooseStandard(current) {
  if (!current?.aqi) return 'CPCB';
  if (current.aqi.CPCB?.valid) return 'CPCB';
  if (current.aqi.US?.valid) return 'US';
  if (current.aqi.EU?.valid) return 'EU';
  return 'CPCB';
}

function findPollutant(pollutants, key) {
  return (pollutants || []).find((pollutant) => pollutant.key === key) || null;
}

export default function Landing() {
  const { location } = useLocationContext();
  const { current, status } = useAirQuality(location);
  const standard = chooseStandard(current);
  const block = current?.aqi?.[standard];
  const color = block?.valid ? categoryColor(standard, block.category?.key) : '#5eead4';
  const place = current?.location || location;
  const updated = current?.dataTimestamp || current?.fetchedAt;
  const timezone = place?.timezone || location?.timezone;
  const isReady = status === 'ready' || status === 'partial';
  const pollutants = POLLUTANT_ORDER.map((item) => {
    const match = findPollutant(current?.pollutants, item.key);
    return { ...item, ...match };
  });

  return (
    <div className="page landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <img className="landing-bg-image" src={heroImage} alt="" aria-hidden="true" />
        <div className="landing-bg-overlay" aria-hidden="true" />
        <div className="landing-bg-atmosphere" aria-hidden="true" />

        <nav className="landing-nav" aria-label="Landing navigation">
          <Link to="/" className="landing-nav-brand" aria-label="AIR CUE home">
            <span className="landing-nav-mark">
              <Wind size={18} aria-hidden="true" />
            </span>
            <span className="landing-nav-name">AIR CUE</span>
          </Link>

          <Link to="/overview" className="landing-nav-cta">
            Get Started
          </Link>
        </nav>

        <div className="landing-hero-main">
          <div className="landing-copy">
            <h1 id="landing-title" sty>
              Understand the air.
              <br />
              Own your decisions.
            </h1>

            <p className="landing-description">
              Real-time air quality intelligence, predictive insights, and cleaner-air recommendation helping you
              make smarter decisions about the air you breathe.
            </p>
          </div>

          <div className="landing-visual" aria-label="Current air quality visualization">
            <div className="landing-aqi-card" style={{ '--aqi-color': color }}>
              <div className="landing-aqi-glow" aria-hidden="true" />
              <div className="landing-aqi-ring" aria-hidden="true">
                <span className="landing-aqi-ring-track" />
                <span className="landing-aqi-ring-progress" />
              </div>
              <div className="landing-aqi-core">
                <p className="landing-aqi-kicker">Current AQI</p>
                <p className="landing-aqi-value">{block?.valid ? block.value : isReady ? '—' : '…'}</p>
                <p className="landing-aqi-category">
                  {block?.valid ? block.category?.label : isReady ? 'Unavailable' : 'Loading'}
                </p>
                <p className="landing-aqi-standard">
                  {block?.valid ? STANDARD_LABELS[standard]?.short || standard : 'AIR CUE'}
                </p>
              </div>

              <div className="landing-aqi-meta">
                <div>
                  <span>Location</span>
                  <strong>{locationTitle(place)}</strong>
                  <small>{locationSubtitle(place) || 'Selected coordinates'}</small>
                </div>
                <div>
                  <span>Last updated</span>
                  <strong>{updated ? formatDateTime(updated, timezone) : '—'}</strong>
                  <small>{current?.fetchedAt ? `Fetched ${timeAgo(current.fetchedAt)}` : 'Awaiting data'}</small>
                </div>
              </div>

              <div className="landing-pollutants" aria-label="Pollutant indicators">
                {pollutants.map((pollutant, index) => (
                  <article
                    key={pollutant.key}
                    className={`landing-pollutant landing-pollutant-${index + 1}`}
                    title={pollutant.name || pollutant.label}
                  >
                    <span className="landing-pollutant-label">{pollutant.label}</span>
                    <strong>
                      {pollutant?.available ? formatNumber(pollutant.value, pollutant.precision ?? 1) : '—'}
                    </strong>
                    <small>{pollutant?.available ? pollutant.unit : ''}</small>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div id="hero-stats" className="landing-stats-panel" aria-label="AIR CUE capabilities">
          {STATS.map((stat) => {
            const Icon = stat.Icon;
            return (
              <article key={stat.title} className="landing-stat-item">
                <span className="landing-stat-icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <div>
                  <strong>{stat.title}</strong>
                  <span>{stat.detail}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}