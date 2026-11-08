import { Router } from 'express';
import { geocode } from '../services/openMeteo.js';
import { buildNearbyPayload } from '../services/nearby.js';
import { parseCoordinates, parseRadius } from '../middleware/validate.js';

const router = Router();

router.get('/search', async (req, res) => {
  const count = Number(req.query.count) || 8;
  const payload = await geocode(req.query.q, count);
  res.json(payload);
});

router.get('/nearby', async (req, res) => {
  const { lat, lon } = parseCoordinates(req.query);
  const radius = parseRadius(req.query.radius, 10000);
  const originName = typeof req.query.name === 'string' ? req.query.name.slice(0, 120) : null;
  res.json(await buildNearbyPayload({ lat, lon, radiusMeters: radius, originName }));
});

export default router;
