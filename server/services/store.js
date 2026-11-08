import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const FILE_PATH = path.join(DATA_DIR, 'store.json');
const MAX_ALERT_HISTORY = 25;
const MAX_SAVED_LOCATIONS = 12;

let readyPromise = null;
let mode = 'file';
let mongoClient = null;
let profiles = null;
let fileCache = null;
let writeChain = Promise.resolve();

function emptyProfile() {
  return {
    alerts: {
      config: null,
      history: [],
    },
    preferences: {
      savedLocations: [],
      lastLocation: null,
    },
  };
}

function normalizeProfile(doc) {
  const base = emptyProfile();
  if (!doc) return base;
  return {
    alerts: {
      config: doc.alerts?.config || null,
      history: Array.isArray(doc.alerts?.history) ? doc.alerts.history.slice(0, MAX_ALERT_HISTORY) : [],
    },
    preferences: {
      savedLocations: Array.isArray(doc.preferences?.savedLocations)
        ? doc.preferences.savedLocations.slice(0, MAX_SAVED_LOCATIONS)
        : [],
      lastLocation: doc.preferences?.lastLocation || null,
    },
  };
}

async function readFileStore() {
  if (fileCache) return fileCache;
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf8');
    fileCache = JSON.parse(raw);
  } catch {
    fileCache = {};
  }
  return fileCache;
}

function writeFileStore(data) {
  writeChain = writeChain.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tempPath = `${FILE_PATH}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tempPath, FILE_PATH);
  });
  return writeChain;
}

export function initStore() {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    if (!config.mongodbUri) {
      mode = 'file';
      console.log('[air-cue] MONGODB_URI not set — preferences and alerts use the local JSON store.');
      return mode;
    }

    try {
      mongoClient = new MongoClient(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
      await mongoClient.connect();
      await mongoClient.db(config.mongodbDb).command({ ping: 1 });
      profiles = mongoClient.db(config.mongodbDb).collection('profiles');
      await profiles.createIndex({ clientId: 1 }, { unique: true });
      mode = 'mongodb';
      console.log('[air-cue] MongoDB connected — storing preferences and alerts in MongoDB.');
    } catch (error) {
      mode = 'file';
      console.warn(
        `[air-cue] MongoDB unavailable (${error.message}). Falling back to the local JSON store; the app remains functional.`,
      );
    }
    return mode;
  })();

  return readyPromise;
}

export function storeStatus() {
  return {
    mode,
    mongodbConfigured: Boolean(config.mongodbUri),
    alertHistoryLimit: MAX_ALERT_HISTORY,
    savedLocationLimit: MAX_SAVED_LOCATIONS,
  };
}

export async function getProfile(clientId) {
  await initStore();

  if (mode === 'mongodb') {
    const doc = await profiles.findOne({ clientId });
    return normalizeProfile(doc);
  }

  const data = await readFileStore();
  return normalizeProfile(data[clientId]);
}

async function persistProfile(clientId, updater) {
  await initStore();

  if (mode === 'mongodb') {
    const current = await profiles.findOne({ clientId });
    const next = normalizeProfile(updater(normalizeProfile(current)));
    await profiles.updateOne(
      { clientId },
      { $set: { ...next, clientId, updatedAt: new Date() } },
      { upsert: true },
    );
    return next;
  }

  const data = await readFileStore();
  const next = normalizeProfile(updater(normalizeProfile(data[clientId])));
  data[clientId] = next;
  await writeFileStore(data);
  return next;
}

export async function saveAlertConfig(clientId, alertConfig) {
  return persistProfile(clientId, (profile) => ({
    ...profile,
    alerts: { ...profile.alerts, config: alertConfig },
  }));
}

export async function appendAlertEvents(clientId, events) {
  return persistProfile(clientId, (profile) => {
    const existingIds = new Set(profile.alerts.history.map((entry) => entry.id));
    const fresh = events.filter((entry) => !existingIds.has(entry.id));
    return {
      ...profile,
      alerts: {
        ...profile.alerts,
        history: [...fresh, ...profile.alerts.history].slice(0, MAX_ALERT_HISTORY),
      },
    };
  });
}

export async function clearAlertHistory(clientId) {
  return persistProfile(clientId, (profile) => ({
    ...profile,
    alerts: { ...profile.alerts, history: [] },
  }));
}

export async function savePreferences(clientId, preferences) {
  return persistProfile(clientId, (profile) => ({
    ...profile,
    preferences: { ...profile.preferences, ...preferences },
  }));
}

/** Anonymous device identifier — AIR CUE has no accounts. */
export function resolveClientId(req) {
  const raw = req.get('X-Client-Id') || req.query.clientId;
  return typeof raw === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(raw) ? raw : null;
}
