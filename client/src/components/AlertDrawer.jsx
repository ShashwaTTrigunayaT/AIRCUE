import { useEffect, useState } from 'react';
import { Bell, BellOff, Trash2, X } from 'lucide-react';
import { useAlerts } from '../context/AlertsContext.jsx';
import { InlineNotice } from './States.jsx';
import { MONITORING_NOTE, STANDARD_LABELS } from '../utils/aqi.js';
import { formatDateTime, formatNumber } from '../utils/format.js';

function Toggle({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className={`toggle-row ${disabled ? 'is-disabled' : ''}`}>
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
    </label>
  );
}

export default function AlertDrawer() {
  const {
    drawerOpen,
    closeDrawer,
    config,
    saveConfig,
    requestNotifications,
    history,
    clearHistory,
    syncError,
    notificationsSupported,
  } = useAlerts();
  const [draft, setDraft] = useState(config);
  const [permissionNote, setPermissionNote] = useState(null);

  useEffect(() => {
    if (drawerOpen) {
      setDraft(config);
      setPermissionNote(null);
    }
  }, [drawerOpen, config]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));

  async function toggleNotifications(checked) {
    if (!checked) {
      update({ notifications: false });
      return;
    }
    if (!notificationsSupported) {
      setPermissionNote('This browser does not support notifications. In-app alerts still work.');
      return;
    }
    const permission = await requestNotifications();
    if (permission === 'granted') {
      update({ notifications: true });
      setPermissionNote('Browser notifications enabled for this device.');
    } else {
      update({ notifications: false });
      setPermissionNote(
        permission === 'denied'
          ? 'Notification permission was denied. In-app alerts still work while AIR CUE is open.'
          : 'Notification permission was not granted. In-app alerts still work.',
      );
    }
  }

  return (
    <div className="drawer-layer" role="presentation">
      <button type="button" className="drawer-backdrop" aria-label="Close alerts" onClick={closeDrawer} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="alerts-title">
        <header className="drawer-header">
          <div>
            <p className="eyebrow">Notifications</p>
            <h2 id="alerts-title">Pollution alerts</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close alerts" onClick={closeDrawer}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="drawer-body">
          <InlineNotice tone="info" title="In-app monitoring only">
            {MONITORING_NOTE}
          </InlineNotice>
          {syncError ? <InlineNotice tone="warning">{syncError}</InlineNotice> : null}

          <section className="drawer-section">
            <Toggle
              checked={draft.enabled}
              onChange={(value) => update({ enabled: value })}
              label="Enable alerts"
              description="Evaluate your rules whenever fresh data loads in this browser."
            />

            <div className="setting-group">
              <Toggle
                checked={draft.aqi.enabled}
                onChange={(value) => update({ aqi: { ...draft.aqi, enabled: value } })}
                label="AQI threshold"
                description="Alert when the selected AQI standard crosses your threshold."
              />
              <div className="setting-controls">
                <select
                  value={draft.aqi.standard}
                  aria-label="AQI standard for alerts"
                  onChange={(event) => update({ aqi: { ...draft.aqi, standard: event.target.value } })}
                >
                  {Object.entries(STANDARD_LABELS).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.short}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="50"
                  max="500"
                  step="10"
                  value={draft.aqi.threshold}
                  aria-label="AQI alert threshold"
                  onChange={(event) => update({ aqi: { ...draft.aqi, threshold: Number(event.target.value) } })}
                />
              </div>
            </div>

            <div className="setting-group">
              <Toggle
                checked={draft.pm25.enabled}
                onChange={(value) => update({ pm25: { ...draft.pm25, enabled: value } })}
                label="PM2.5 threshold"
                description="Alert when the current PM2.5 concentration reaches your threshold."
              />
              <div className="setting-controls">
                <input
                  type="number"
                  min="5"
                  max="500"
                  step="5"
                  value={draft.pm25.threshold}
                  aria-label="PM2.5 alert threshold in micrograms per cubic metre"
                  onChange={(event) => update({ pm25: { ...draft.pm25, threshold: Number(event.target.value) } })}
                />
                <span className="setting-unit">µg/m³</span>
              </div>
            </div>

            <Toggle
              checked={draft.categoryChange.enabled}
              onChange={(value) => update({ categoryChange: { enabled: value } })}
              label="Category changes"
              description="Alert when the AQI category moves up or down."
            />
            <Toggle
              checked={draft.suddenIncrease.enabled}
              onChange={(value) => update({ suddenIncrease: { ...draft.suddenIncrease, enabled: value } })}
              label="Sudden increase"
              description={`Alert when PM concentration rises by ${draft.suddenIncrease.percent}% or more over six hours.`}
            />
            <Toggle
              checked={draft.forecastPeak.enabled}
              onChange={(value) => update({ forecastPeak: { ...draft.forecastPeak, enabled: value } })}
              label="Unhealthy forecast ahead"
              description="Alert when the next 24-hour forecast (US AQI) reaches your threshold."
            />
            <Toggle
              checked={draft.notifications}
              onChange={toggleNotifications}
              label="Browser notifications"
              description="Requires permission. In-app history always records alerts."
              disabled={!notificationsSupported}
            />
            {permissionNote ? <p className="setting-note">{permissionNote}</p> : null}
          </section>

          <div className="drawer-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                saveConfig(draft);
                closeDrawer();
              }}
            >
              <Bell size={15} aria-hidden="true" /> Save alert settings
            </button>
          </div>

          <section className="drawer-section">
            <div className="drawer-section-head">
              <h3>Alert history</h3>
              {history.length ? (
                <button type="button" className="btn btn-ghost btn-small" onClick={clearHistory}>
                  <Trash2 size={14} aria-hidden="true" /> Clear
                </button>
              ) : null}
            </div>

            {history.length ? (
              <ul className="alert-history">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <div className="alert-history-head">
                      <strong>{entry.title}</strong>
                      <time>{formatDateTime(entry.at)}</time>
                    </div>
                    <p>{entry.message}</p>
                    <small>
                      {entry.location?.name || 'Selected location'}
                      {entry.standard ? ` · ${STANDARD_LABELS[entry.standard]?.short || entry.standard}` : ''}
                      {typeof entry.value === 'number' ? ` · ${formatNumber(entry.value, 1)}` : ''}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="drawer-empty">
                <BellOff size={18} aria-hidden="true" />
                No alerts recorded yet. Alerts appear here when a rule is met while the app is open.
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
