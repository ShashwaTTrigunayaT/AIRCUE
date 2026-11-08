import { Router } from 'express';
import {
  appendAlertEvents,
  clearAlertHistory,
  getProfile,
  resolveClientId,
  saveAlertConfig,
} from '../services/store.js';
import { HttpError } from '../utils/errors.js';

const router = Router();

export const DEFAULT_ALERT_CONFIG = {
  enabled: true,
  aqi: { enabled: true, threshold: 200, standard: 'US' },
  pm25: { enabled: true, threshold: 60 },
  categoryChange: { enabled: true },
  suddenIncrease: { enabled: true, percent: 25 },
  forecastPeak: { enabled: false, threshold: 200, standard: 'US' },
  notifications: false,
};

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.round(number), min), max);
};

export function normalizeAlertConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    enabled: source.enabled !== false,
    aqi: {
      enabled: source.aqi?.enabled !== false,
      threshold: clamp(source.aqi?.threshold, 50, 500, 200),
      standard: ['CPCB', 'US', 'EU'].includes(source.aqi?.standard) ? source.aqi.standard : 'US',
    },
    pm25: {
      enabled: source.pm25?.enabled !== false,
      threshold: clamp(source.pm25?.threshold, 5, 500, 60),
    },
    categoryChange: { enabled: source.categoryChange?.enabled !== false },
    suddenIncrease: {
      enabled: source.suddenIncrease?.enabled !== false,
      percent: clamp(source.suddenIncrease?.percent, 10, 200, 25),
    },
    forecastPeak: {
      enabled: source.forecastPeak?.enabled === true,
      threshold: clamp(source.forecastPeak?.threshold, 50, 500, 200),
      standard: 'US',
    },
    notifications: source.notifications === true,
  };
}

function requireClientId(req) {
  const clientId = resolveClientId(req);
  if (!clientId) {
    throw new HttpError(400, 'CLIENT_ID_REQUIRED', 'A client identifier is required for saved alert settings.');
  }
  return clientId;
}

function sanitizeEvents(input) {
  if (!Array.isArray(input)) {
    throw new HttpError(400, 'INVALID_EVENTS', 'Events must be an array.');
  }

  return input.slice(0, 5).map((event) => {
    const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
    const id = text(event?.id, 80);
    const title = text(event?.title, 140);
    if (!id || !title) {
      throw new HttpError(400, 'INVALID_EVENT', 'Each alert event needs an id and a title.');
    }

    return {
      id,
      rule: text(event?.rule, 40) || 'custom',
      title,
      message: text(event?.message, 320),
      at: text(event?.at, 40) || new Date().toISOString(),
      standard: text(event?.standard, 8) || null,
      value: Number.isFinite(Number(event?.value)) ? Number(event.value) : null,
      threshold: Number.isFinite(Number(event?.threshold)) ? Number(event.threshold) : null,
      location: {
        name: text(event?.location?.name, 120) || 'Selected location',
        latitude: Number(event?.location?.latitude) || null,
        longitude: Number(event?.location?.longitude) || null,
      },
    };
  });
}

router.get('/', async (req, res) => {
  const clientId = requireClientId(req);
  const profile = await getProfile(clientId);
  res.json({
    config: profile.alerts.config || DEFAULT_ALERT_CONFIG,
    history: profile.alerts.history,
    defaults: DEFAULT_ALERT_CONFIG,
    monitorNote:
      'Alerts are checked while AIR CUE is open or refreshed. There is no background notification service, so nothing is monitored while the browser is closed.',
  });
});

router.post('/', async (req, res) => {
  const clientId = requireClientId(req);
  const config = normalizeAlertConfig(req.body?.config ?? req.body);
  const profile = await saveAlertConfig(clientId, config);
  res.json({ config: profile.alerts.config, history: profile.alerts.history });
});

router.post('/events', async (req, res) => {
  const clientId = requireClientId(req);
  const events = sanitizeEvents(req.body?.events);
  const profile = await appendAlertEvents(clientId, events);
  res.json({ history: profile.alerts.history });
});

router.delete('/events', async (req, res) => {
  const clientId = requireClientId(req);
  const profile = await clearAlertHistory(clientId);
  res.json({ history: profile.alerts.history });
});

export default router;
