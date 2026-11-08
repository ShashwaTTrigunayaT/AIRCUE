import { Router } from 'express';
import { getProfile, resolveClientId, savePreferences } from '../services/store.js';
import { HttpError } from '../utils/errors.js';

const router = Router();

function requireClientId(req) {
  const clientId = resolveClientId(req);
  if (!clientId) {
    throw new HttpError(400, 'CLIENT_ID_REQUIRED', 'A client identifier is required for saved locations.');
  }
  return clientId;
}

function sanitizeLocation(input) {
  if (!input || typeof input !== 'object') return null;
  const lat = Number(input.latitude ?? input.lat);
  const lon = Number(input.longitude ?? input.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }
  const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : null);

  return {
    name: text(input.name, 120) || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    admin1: text(input.admin1, 120),
    country: text(input.country, 120),
    countryCode: text(input.countryCode, 2)?.toUpperCase() || null,
    latitude: Number(lat.toFixed(4)),
    longitude: Number(lon.toFixed(4)),
    timezone: text(input.timezone, 64),
    source: text(input.source, 20) || 'saved',
  };
}

router.get('/', async (req, res) => {
  const clientId = requireClientId(req);
  const profile = await getProfile(clientId);
  res.json(profile.preferences);
});

router.put('/', async (req, res) => {
  const clientId = requireClientId(req);

  const savedLocations = Array.isArray(req.body?.savedLocations)
    ? req.body.savedLocations.map(sanitizeLocation).filter(Boolean).slice(0, 12)
    : [];
  const lastLocation = sanitizeLocation(req.body?.lastLocation);

  const profile = await savePreferences(clientId, { savedLocations, lastLocation });
  res.json(profile.preferences);
});

export default router;
