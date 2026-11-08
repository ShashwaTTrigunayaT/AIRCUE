import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

const initialState = {
  status: 'loading',
  key: null,
  current: null,
  forecast: null,
  history: null,
  errors: {},
  error: null,
  updatedAt: null,
  refreshing: false,
};

export function useAirQuality(location, { autoRefreshMs = 10 * 60 * 1000 } = {}) {
  const key = location ? `${location.latitude},${location.longitude}` : null;
  const [state, setState] = useState(initialState);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!location || !key) return undefined;

    const controller = new AbortController();
    let active = true;

    setState((previous) => ({
      ...(previous.key === key ? previous : initialState),
      status: previous.key === key && (previous.current || previous.forecast) ? previous.status : 'loading',
      key,
      refreshing: true,
      error: null,
    }));

    Promise.allSettled([
      api.current(location, { signal: controller.signal }),
      api.forecast(location, { signal: controller.signal }),
      api.history(location, { signal: controller.signal }),
    ]).then(([currentResult, forecastResult, historyResult]) => {
      if (!active) return;

      const errors = {};
      const current = currentResult.status === 'fulfilled' ? currentResult.value : null;
      const forecast = forecastResult.status === 'fulfilled' ? forecastResult.value : null;
      const history = historyResult.status === 'fulfilled' ? historyResult.value : null;

      if (currentResult.status === 'rejected' && currentResult.reason?.name !== 'AbortError') {
        errors.current = currentResult.reason?.message || 'Current air quality could not be loaded.';
      }
      if (forecastResult.status === 'rejected' && forecastResult.reason?.name !== 'AbortError') {
        errors.forecast = forecastResult.reason?.message || 'The forecast could not be loaded.';
      }
      if (historyResult.status === 'rejected' && historyResult.reason?.name !== 'AbortError') {
        errors.history = historyResult.reason?.message || 'History could not be loaded.';
      }

      const hasData = Boolean(current || forecast || history);
      const firstError = errors.current || errors.forecast || errors.history || null;

      setState({
        status: hasData ? (current ? 'ready' : 'partial') : 'error',
        key,
        current,
        forecast,
        history,
        errors,
        error: firstError,
        updatedAt: new Date().toISOString(),
        refreshing: false,
      });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, version]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoRefreshMs) return undefined;
    const timer = setInterval(() => setVersion((value) => value + 1), autoRefreshMs);
    return () => clearInterval(timer);
  }, [autoRefreshMs]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { ...state, reload };
}
