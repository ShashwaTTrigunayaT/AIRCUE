import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const STATS = [
  { value: '3', label: 'AQI standards' },
  { value: '6', label: 'pollutants tracked' },
  { value: '48h', label: 'forecast range' },
];

const PARTICLES = [
  { label: 'O₂', tone: 'cyan', position: 'one' },
  { label: 'PM2.5', tone: 'amber', position: 'two' },
  { label: 'NO₂', tone: 'red', position: 'three' },
  { label: 'PM10', tone: 'orange', position: 'four' },
  { label: 'SO₂', tone: 'mint', position: 'five' },
  { label: 'O₃', tone: 'teal', position: 'six' },
  { label: 'CO', tone: 'slate', position: 'seven' },
  { label: 'O₂', tone: 'cyan', position: 'eight' },
  { label: 'PM2.5', tone: 'amber', position: 'nine' },
  { label: 'NO₂', tone: 'red', position: 'ten' },
  { label: 'SO₂', tone: 'mint', position: 'eleven' },
  { label: 'O₃', tone: 'teal', position: 'twelve' },
  { label: 'CO', tone: 'slate', position: 'thirteen' },
  { label: 'PM10', tone: 'orange', position: 'fourteen' },
  { label: 'O₂', tone: 'cyan', position: 'fifteen' },
  { label: 'PM2.5', tone: 'amber', position: 'sixteen' },
  { label: 'O₃', tone: 'teal', position: 'seventeen' },
  { label: 'PM10', tone: 'orange', position: 'eighteen' },
  { label: 'NO₂', tone: 'red', position: 'nineteen' },
  { label: 'SO₂', tone: 'mint', position: 'twenty' },
];

export default function Landing() {
  return (
    <div className="page landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-particles" aria-hidden="true">
          {PARTICLES.map((particle, index) => (
            <span
              key={`${particle.label}-${index}`}
              className={`landing-particle landing-particle-${particle.position} landing-particle-${particle.tone}`}
            >
              {particle.label}
            </span>
          ))}
        </div>

        <div className="landing-hero-main">
          <div className="landing-copy">
            <p className="landing-brand">AIRCUE</p>
            <h1 id="landing-title">
              The air has
              <br />
              a story.
            </h1>
            <div className="landing-stats">
              {STATS.map((stat) => (
                <div className="landing-stat" key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
            <div className="landing-actions">
              <Link className="btn btn-primary" to="/overview">
                Get started <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="landing-atmosphere" aria-hidden="true">
            <span className="landing-orb landing-orb-one" />
            <span className="landing-orb landing-orb-two" />
            <span className="landing-halo landing-halo-one" />
            <span className="landing-halo landing-halo-two" />
            <div className="landing-dial">
              <strong>
                Read
                <br />
                <em>the air.</em>
              </strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
