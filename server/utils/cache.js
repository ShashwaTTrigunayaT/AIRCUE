/**
 * Tiny in-memory TTL cache with in-flight request de-duplication.
 * Deliberately not a database: the app only needs to avoid hammering
 * public providers while keeping data fresh enough for the UI.
 */
const store = new Map();
const inflight = new Map();
const MAX_ENTRIES = 400;

function prune() {
  if (store.size <= MAX_ENTRIES) return;
  const entries = [...store.entries()].sort((a, b) => a[1].at - b[1].at);
  for (const [key] of entries.slice(0, store.size - MAX_ENTRIES)) store.delete(key);
}

export function getOrSet(key, ttlMs, loader) {
  const existing = store.get(key);
  if (existing && Date.now() - existing.at < ttlMs) {
    return Promise.resolve({ ...existing.value, cached: true });
  }

  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    try {
      const value = await loader();
      const record = { ...value, cached: false };
      store.set(key, { at: Date.now(), value: record });
      prune();
      return record;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function cacheStats() {
  return { entries: store.size, inflight: inflight.size };
}
