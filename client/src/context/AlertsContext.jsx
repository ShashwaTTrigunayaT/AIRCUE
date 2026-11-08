import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const CONFIG_KEY = 'aircue.alertConfig';
const SEEN_KEY = 'aircue.alertsSeenAt';

export const DEFAULT_ALERT_CONFIG = {
  enabled: true,
  aqi: { enabled: true, threshold: 200, standard: 'US' },
  pm25: { enabled: true, threshold: 60 },
  categoryChange: { enabled: true },
  suddenIncrease: { enabled: true, percent: 25 },
  forecastPeak: { enabled: false, threshold: 200, standard: 'US' },
  notifications: false,
};

export function mergeAlertConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    ...DEFAULT_ALERT_CONFIG,
    ...source,
    aqi: { ...DEFAULT_ALERT_CONFIG.aqi, ...(source.aqi || {}) },
    pm25: { ...DEFAULT_ALERT_CONFIG.pm25, ...(source.pm25 || {}) },
    categoryChange: { ...DEFAULT_ALERT_CONFIG.categoryChange, ...(source.categoryChange || {}) },
    suddenIncrease: { ...DEFAULT_ALERT_CONFIG.suddenIncrease, ...(source.suddenIncrease || {}) },
    forecastPeak: { ...DEFAULT_ALERT_CONFIG.forecastPeak, ...(source.forecastPeak || {}) },
  };
}

function readLocalConfig() {
  try {
    return mergeAlertConfig(JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'));
  } catch {
    return DEFAULT_ALERT_CONFIG;
  }
}

function readSeenAt() {
  try {
    return localStorage.getItem(SEEN_KEY) || null;
  } catch {
    return null;
  }
}

const AlertsContext = createContext(null);

export function AlertsProvider({ children }) {
  const [config, setConfig] = useState(readLocalConfig);
  const [history, setHistory] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [seenAt, setSeenAt] = useState(readSeenAt);

  useEffect(() => {
    let active = true;
    api.alerts
      .get()
      .then((payload) => {
        if (!active || !payload) return;
        if (Array.isArray(payload.history)) setHistory(payload.history);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const saveConfig = useCallback((nextConfig) => {
    const merged = mergeAlertConfig(nextConfig);
    setConfig(merged);
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
    } catch {
      /* ignore storage failures */
    }
    api.alerts
      .save(merged)
      .then(() => setSyncError(null))
      .catch(() => setSyncError('Alert settings are saved on this device but could not be synced to the server.'));
    return merged;
  }, []);

  const addEvents = useCallback((events) => {
    if (!events?.length) return;
    setHistory((current) => {
      const ids = new Set(current.map((entry) => entry.id));
      return [...events.filter((entry) => !ids.has(entry.id)), ...current].slice(0, 25);
    });
    api.alerts
      .addEvents(events)
      .then((payload) => {
        if (Array.isArray(payload?.history)) setHistory(payload.history);
      })
      .catch(() => {});
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    api.alerts.clear().catch(() => {});
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    const now = new Date().toISOString();
    setSeenAt(now);
    try {
      localStorage.setItem(SEEN_KEY, now);
    } catch {
      /* ignore */
    }
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const requestNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }, []);

  const unreadCount = useMemo(
    () => history.filter((entry) => !seenAt || entry.at > seenAt).length,
    [history, seenAt],
  );

  const value = useMemo(
    () => ({
      config,
      history,
      drawerOpen,
      openDrawer,
      closeDrawer,
      saveConfig,
      addEvents,
      clearHistory,
      requestNotifications,
      syncError,
      unreadCount,
      notificationsSupported: typeof Notification !== 'undefined',
    }),
    [
      config,
      history,
      drawerOpen,
      openDrawer,
      closeDrawer,
      saveConfig,
      addEvents,
      clearHistory,
      requestNotifications,
      syncError,
      unreadCount,
    ],
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) throw new Error('useAlerts must be used inside AlertsProvider');
  return context;
}
