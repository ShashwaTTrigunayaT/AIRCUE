import { Link } from 'react-router-dom';
import { Satellite } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand-name">AIR CUE</span>
          <p>From air-quality data to everyday decisions.</p>
        </div>
        <div className="footer-links">
          <Link to="/methodology">Data sources, methodology & limitations</Link>
          <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer noopener">
            Open-Meteo air quality
          </a>
          <a href="https://docs.openaq.org/" target="_blank" rel="noreferrer noopener">
            OpenAQ
          </a>
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">
            © OpenStreetMap contributors
          </a>
        </div>
      </div>
      
    </footer>
  );
}
