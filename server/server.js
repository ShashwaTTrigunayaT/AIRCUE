import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { rateLimit } from './middleware/rateLimit.js';
import { initStore, storeStatus } from './services/store.js';
import { copilotStatus } from './services/copilot.js';
import airRoutes from './routes/air.js';
import locationRoutes from './routes/locations.js';
import alertRoutes from './routes/alerts.js';
import preferenceRoutes from './routes/preferences.js';
import aiRoutes from './routes/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../client/dist');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  cors(
    config.corsOrigin
      ? { origin: config.corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean) }
      : { origin: true },
  ),
);
app.use(express.json({ limit: '16kb' }));

app.use('/api', rateLimit({ windowMs: 60_000, max: 240, scope: 'api' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: config.version,
    environment: config.nodeEnv,
    now: new Date().toISOString(),
    store: storeStatus(),
    features: {
      airQuality: { enabled: true, provider: 'Open-Meteo', measurementType: 'modelled' },
      geocoding: { enabled: true, provider: 'Open-Meteo Geocoding' },
      stationObservations: { enabled: Boolean(config.openAqApiKey), provider: 'OpenAQ' },
      aiAssistant: copilotStatus(),
    },
    monitoringNote:
      'Air-quality data refreshes when requested and is cached briefly on the server. Alerts are evaluated only while the app is open.',
  });
});

app.use('/api/air', airRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/ai', aiRoutes);

app.use('/api', notFoundHandler);

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get('/', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res
      .status(200)
      .type('html')
      .send(
        '<h1>AIR CUE API</h1><p>The client build was not found. Run <code>npm run build</code> and restart, or use <code>npm run dev</code> for the Vite dev server.</p>',
      );
  });
}

app.use(errorHandler);

const mode = await initStore();

const copilotLabel = config.groqApiKeys.length
  ? `enabled (${config.groqApiKeys.length} key${config.groqApiKeys.length === 1 ? '' : 's'})`
  : 'disabled';

const server = app.listen(config.port, () => {
  console.log(`[air-cue] API listening on http://localhost:${config.port} (${config.nodeEnv})`);
  console.log(`[air-cue] Store: ${mode}. AIRCUE Copilot: ${copilotLabel}. OpenAQ: ${config.openAqApiKey ? 'enabled' : 'disabled'}.`);
  if (fs.existsSync(clientDist)) console.log('[air-cue] Serving built client from client/dist');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[air-cue] Port ${config.port} is already in use. Set PORT to a free port.`);
    process.exit(1);
  }
  throw error;
});
