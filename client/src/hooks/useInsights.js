import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useInsights(location) {
  const key = location ? `${location.latitude},${location.longitude}` : null;
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!location || !key) return undefined;
    const controller = new AbortController();
    let active = true;
    setState({ status: 'loading', data: null, error: null });

    api
      .insights(location, { signal: controller.signal })
      .then((data) => {
        if (active) setState({ status: 'ready', data, error: null });
      })
      .catch((error) => {
        if (!active || error?.name === 'AbortError') return;
        setState({ status: 'error', data: null, error: error?.message || 'Insights could not be generated.' });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state, reload };
}
