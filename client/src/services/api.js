const BASE = import.meta.env.VITE_API_BASE || '';
const CLIENT_ID_KEY = 'aircue.clientId';

export class ApiError extends Error {
  constructor(message, { code, status, hint, provider } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.hint = hint;
    this.provider = provider;
  }
}

/** Anonymous device id — AIR CUE has no accounts. */
export function getClientId() {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const generated =
      globalThis.crypto?.randomUUID?.() || `aircue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(CLIENT_ID_KEY, generated);
    return generated;
  } catch {
    return 'aircue-anonymous-local';
  }
}

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function locationParams(location) {
  if (!location) return {};
  return {
    lat: location.latitude,
    lon: location.longitude,
    name: location.name,
    admin1: location.admin1,
    country: location.country,
    countryCode: location.countryCode,
    timezone: location.timezone,
  };
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Id': getClientId(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('Could not reach the AIR CUE server. Check your connection and try again.', {
      code: 'NETWORK_ERROR',
    });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(payload?.error?.message || `Request failed with HTTP ${response.status}.`, {
      code: payload?.error?.code,
      status: response.status,
      hint: payload?.error?.hint,
      provider: payload?.error?.provider,
    });
  }

  return payload;
}

export const api = {
  health: () => request('/api/health'),

  current: (location, options) => request(`/api/air/current${query(locationParams(location))}`, options),
  forecast: (location, options) => request(`/api/air/forecast${query(locationParams(location))}`, options),
  history: (location, options) => request(`/api/air/history${query(locationParams(location))}`, options),
  anomalies: (location, options) => request(`/api/air/anomalies${query(locationParams(location))}`, options),
  prediction: (location, options) => request(`/api/air/prediction${query(locationParams(location))}`, options),

  compare: (locations) =>
    request(
      `/api/air/compare${query({
        locations: locations.map((entry) => `${entry.latitude},${entry.longitude},${entry.name}`).join(';'),
      })}`,
    ),

  map: (center) => request(`/api/air/map${query(center ? { lat: center.latitude, lon: center.longitude } : {})}`),

  search: (text, options) => request(`/api/locations/search${query({ q: text })}`, options),
  nearby: (location, radius, options) =>
    request(`/api/locations/nearby${query({ ...locationParams(location), radius })}`, options),

  assistant: (location, question, options) =>
    request('/api/ai/assistant', { method: 'POST', body: { location, question }, ...options }),
  insights: (location, options) => request('/api/ai/insights', { method: 'POST', body: { location }, ...options }),

  alerts: {
    get: (options) => request('/api/alerts', options),
    save: (config, options) => request('/api/alerts', { method: 'POST', body: { config }, ...options }),
    addEvents: (events, options) => request('/api/alerts/events', { method: 'POST', body: { events }, ...options }),
    clear: (options) => request('/api/alerts/events', { method: 'DELETE', ...options }),
  },

  preferences: {
    get: (options) => request('/api/preferences', options),
    save: (preferences, options) => request('/api/preferences', { method: 'PUT', body: preferences, ...options }),
  },
};
