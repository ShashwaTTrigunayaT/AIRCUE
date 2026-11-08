import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Bell, Menu, Wind, X } from 'lucide-react';
import LocationSearch from './LocationSearch.jsx';
import { useAlerts } from '../context/AlertsContext.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/map', label: 'Live Map' },
  { to: '/trends', label: 'Historical Trends' },
  { to: '/compare', label: 'Compare' },
  { to: '/health', label: 'Health & Safety' },
  { to: '/forecast', label: 'Forecast' },
  { to: '/assistant', label: 'AI Assistant' },
];

export default function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { openDrawer, unreadCount } = useAlerts();

  return (
    <header className="top-bar">
      <div className="top-bar-inner">
        <Link to="/" className="brand" aria-label="AIR CUE home">
          <span className="brand-mark">
            <Wind size={20} aria-hidden="true" />
          </span>
          <span className="brand-text">
            <span className="brand-name">AIR CUE</span>
            <span className="brand-tagline">Breathe smarter</span>
          </span>
        </Link>

        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="top-bar-actions">
          
          <button
            type="button"
            className="icon-button"
            aria-label={`Open alerts${unreadCount ? `, ${unreadCount} unread` : ''}`}
            onClick={openDrawer}
          >
            <Bell size={19} aria-hidden="true" />
            {unreadCount ? <span className="notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
          </button>
          <button
            type="button"
            className="icon-button mobile-menu-button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
