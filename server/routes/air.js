import { Router } from 'express';
import { getAirQualitySeries } from '../services/openMeteo.js';
import {
  buildComparison,
  buildCurrentPayload,
  buildForecastPayload,
  buildHistoryPayload,
} from '../services/airQuality.js';
import { buildMapPayload } from '../services/nearby.js';
import { parseLocationList, parseLocationQuery } from '../middleware/validate.js';

const router = Router();

router.get('/current', async (req, res) => {
  const location = parseLocationQuery(req.query);
  const series = await getAirQualitySeries(location.lat, location.lon);
  res.json(buildCurrentPayload(series, location));
});

router.get('/forecast', async (req, res) => {
  const location = parseLocationQuery(req.query);
  const series = await getAirQualitySeries(location.lat, location.lon);
  res.json(buildForecastPayload(series, location));
});

router.get('/history', async (req, res) => {
  const location = parseLocationQuery(req.query);
  const series = await getAirQualitySeries(location.lat, location.lon);
  res.json(buildHistoryPayload(series, location));
});

router.get('/compare', async (req, res) => {
  const locations = parseLocationList(req.query.locations);
  res.json(await buildComparison(locations));
});

router.get('/map', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const hasCenter = Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  res.json(
    await buildMapPayload(
      hasCenter ? { lat, lon, includeStations: true } : { includeStations: false },
    ),
  );
});

export default router;
