import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api.js';

const LOCATION_KEY = 'aircue.location';
const SAVED_KEY = 'aircue.savedLocations';

export const DEFAULT_LOCATION = {
  name: 'Delhi',
  admin1: 'Delhi',
  country: 'India',
  countryCode: 'IN',
  latitude: 28.6139,
  longitude: 77.209,
  timezone: 'Asia/Kolkata',
  source: 'default',
};

function isValidLocation(value) {
  return (
    value &&
    typeof value === 'object' &&
    Number.isFinite(Number(value.latitude)) &&
    Number.isFinite(Number(value.longitude)) &&
    Number(value.latitude) >= -90 &&
    Number(value.latitude) <= 90 &&
    Number(value.longitude) >= -180 &&
    Number(value.longitude) <= 180
  );
}

function normalizeLocation(value) {
  return {
    name: value.name || 'Selected location',
    admin1: value.admin1 || null,
    country: value.country || null,
    countryCode: value.countryCode || null,
    latitude: Number(Number(value.latitude).toFixed(4)),
    longitude: Number(Number(value.longitude).toFixed(4)),
    timezone: value.timezone || null,
    source: value.source || 'search',
  };
}

function readStoredLocation() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCATION_KEY) || 'null');
    return isValidLocation(parsed) ? normalizeLocation(parsed) : DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
  }
}

function readSavedLocations() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isValidLocation).map(normalizeLocation).slice(0, 12) : [];
  } catch {
    return [];
  }
}

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState(readStoredLocation);
  const [savedLocations, setSavedLocations] = useState(readSavedLocations);
  const syncTimer = useRef(null);

  const persist = useCallback((nextLocation, nextSaved) => {
    try {
      localStorage.setItem(LOCATION_KEY, JSON.stringify(nextLocation));
      localStorage.setItem(SAVED_KEY, JSON.stringify(nextSaved));
    } catch {
      /* storage can be unavailable in private modes; the app still works in memory */
    }

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      api.preferences.save({ savedLocations: nextSaved, lastLocation: nextLocation }).catch(() => {});
    }, 700);
  }, []);

  const setLocation = useCallback(
    (next) => {
      if (!isValidLocation(next)) return;
      const normalized = normalizeLocation(next);
      setLocationState(normalized);
      persist(normalized, savedLocations);
    },
    [persist, savedLocations],
  );

  const addSavedLocation = useCallback(
    (next) => {
      if (!isValidLocation(next)) return;
      const normalized = normalizeLocation({ ...next, source: 'saved' });
      setSavedLocations((current) => {
        const exists = current.some(
          (entry) =>
            Math.abs(entry.latitude - normalized.latitude) < 0.01 &&
            Math.abs(entry.longitude - normalized.longitude) < 0.01,
        );
        if (exists) return current;
        const nextSaved = [normalized, ...current].slice(0, 12);
        persist(location, nextSaved);
        return nextSaved;
      });
    },
    [location, persist],
  );

  const removeSavedLocation = useCallback(
    (next) => {
      setSavedLocations((current) => {
        const nextSaved = current.filter(
          (entry) => !(Math.abs(entry.latitude - next.latitude) < 0.01 && Math.abs(entry.longitude - next.longitude) < 0.01),
        );
        persist(location, nextSaved);
        return nextSaved;
      });
    },
    [location, persist],
  );

  const isSaved = useCallback(
    (candidate) =>
      Boolean(
        candidate &&
          savedLocations.some(
            (entry) =>
              Math.abs(entry.latitude - candidate.latitude) < 0.01 &&
              Math.abs(entry.longitude - candidate.longitude) < 0.01,
          ),
      ),
    [savedLocations],
  );

  // Pull server-saved preferences once, without overwriting anything chosen locally.
  useEffect(() => {
    let active = true;
    api.preferences
      .get()
      .then((preferences) => {
        if (!active || !preferences) return;
        if (Array.isArray(preferences.savedLocations) && preferences.savedLocations.length) {
          setSavedLocations((current) => (current.length ? current : preferences.savedLocations.filter(isValidLocation).map(normalizeLocation)));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({ location, setLocation, savedLocations, addSavedLocation, removeSavedLocation, isSaved }),
    [location, setLocation, savedLocations, addSavedLocation, removeSavedLocation, isSaved],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocationContext must be used inside LocationProvider');
  return context;
}
