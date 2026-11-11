import { Link } from 'react-router-dom';
import { ArrowUp, ExternalLink } from 'lucide-react';

const EXPLORE_LINKS = [
  { to: '/overview', label: 'Live dashboard' },
  { to: '/map', label: 'Live map' },
  { to: '/trends', label: 'Historical trends' },
  { to: '/compare', label: 'Compare locations' },
  { to: '/health', label: 'Health & safety' },
  { to: '/forecast', label: 'Forecast' },
  { to: '/assistant', label: 'AIRCUE Copilot' },
];

const RESOURCE_LINKS = [
  { to: '/report', label: 'Impact report' },
  { to: '/methodology', label: 'Methodology & limitations' },
];

const SOURCE_LINKS = [
  { href: 'https://open-meteo.com/en/docs/air-quality-api', label: 'Open-Meteo air quality' },
  { href: 'https://docs.openaq.org/', label: 'OpenAQ' },
  { href: 'https://www.openstreetmap.org/copyright', label: '© OpenStreetMap contributors' },
];

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand-name">AIR CUE</span>
          <p>From air-quality data to everyday decisions.</p>
        </div>

        <div className="footer-group">
          <p className="footer-heading">Explore</p>
          <nav className="footer-links" aria-label="Explore AIR CUE">
            {EXPLORE_LINKS.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="footer-group">
          <p className="footer-heading">Reports</p>
          <nav className="footer-links" aria-label="Reports and methodology">
            {RESOURCE_LINKS.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="footer-group">
          <p className="footer-heading">Data sources</p>
          <nav className="footer-links" aria-label="Data sources">
            {SOURCE_LINKS.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer noopener">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="footer-note">
        <span>
          Data refreshes on request and alerts run only while the app is open. AQI values are information, not medical
          advice.
        </span>
        <a
          className="footer-github"
          href="https://github.com/ShashwaTTrigunayaT/AIRCUE"
          target="_blank"
          rel="noreferrer noopener"
        >
          <ExternalLink size={14} aria-hidden="true" /> Source on GitHub
        </a>
        <button type="button" className="footer-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Back to top <ArrowUp size={14} aria-hidden="true" />
        </button>
      </div>
    </footer>
  );
}
