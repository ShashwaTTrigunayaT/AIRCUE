import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useNearby(location, radius = 10000, { enabled = true } = {}) {
  const key = location ? `${location.latitude},${location.longitude}` : null;
  const [state, setState] = useState({ status: 'idle', data: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled || !location || !key) {
      setState({ status: 'idle', data: null, error: null });
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    setState((previous) => ({ status: previous.data ? previous.status : 'loading', data: previous.data, error: null, refreshing: true }));

    api
      .nearby(location, radius, { signal: controller.signal })
      .then((data) => {
        if (active) setState({ status: 'ready', data, error: null, refreshing: false });
      })
      .catch((error) => {
        if (!active || error?.name === 'AbortError') return;
        setState({ status: 'error', data: null, error: error?.message || 'Cleaner nearby locations could not be loaded.' });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, radius, enabled, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state, reload };
}
