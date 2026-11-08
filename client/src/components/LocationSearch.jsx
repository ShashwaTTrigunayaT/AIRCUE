import { useEffect, useRef, useState } from 'react';
import { Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { api } from '../services/api.js';
import { useLocationContext } from '../context/LocationContext.jsx';
import { shortCoords } from '../utils/format.js';

export default function LocationSearch({ compact = false, autoFocus = false, placeholder }) {
  const { location, setLocation } = useLocationContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');
  const [geoMessage, setGeoMessage] = useState(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setStatus('idle');
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus('loading');
      api
        .search(trimmed, { signal: controller.signal })
        .then((payload) => {
          setResults(payload?.results || []);
          setStatus('ready');
          setError(null);
          setOpen(true);
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          setStatus('error');
          setError(err?.message || 'Location search failed.');
        });
    }, 320);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function choose(place) {
    setLocation({
      name: place.name,
      admin1: place.admin1,
      country: place.country,
      countryCode: place.countryCode,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone,
      source: 'search',
    });
    setQuery('');
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoMessage('This browser does not support location access. Search for a city instead.');
      return;
    }

    setGeoStatus('locating');
    setGeoMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lon = Number(position.coords.longitude.toFixed(4));
        setLocation({
          name: 'My location',
          admin1: null,
          country: null,
          countryCode: null,
          latitude: lat,
          longitude: lon,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
          source: 'geolocation',
        });
        setGeoStatus('idle');
        setGeoMessage(`Using coordinates ${shortCoords(lat, lon)}. AIR CUE does not invent a place name for GPS coordinates.`);
        setOpen(false);
      },
      (geoError) => {
        setGeoStatus('error');
        setGeoMessage(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location permission was denied. Search for a city instead.'
            : 'Your location could not be determined. Search for a city instead.',
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || !results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[activeIndex >= 0 ? activeIndex : 0]);
    }
  }

  return (
    <div className={`location-search ${compact ? 'is-compact' : ''}`} ref={wrapRef}>
      <div className="search-field">
        <Search size={16} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder || `Search a city or place…`}
          aria-label="Search for a city or place"
          role="combobox"
          aria-expanded={open}
          aria-controls="location-search-results"
          aria-autocomplete="list"
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button type="button" className="plain-icon" aria-label="Clear search" onClick={() => setQuery('')}>
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          className="plain-icon locate"
          aria-label="Use my current location"
          onClick={useMyLocation}
          title="Use my current location"
        >
          {geoStatus === 'locating' ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <LocateFixed size={15} aria-hidden="true" />}
        </button>
      </div>

      {!compact ? (
        <p className="current-location">
          <MapPin size={13} aria-hidden="true" />
          Showing {location ? location.name : 'Delhi'}
          {location?.latitude !== undefined ? ` · ${shortCoords(location.latitude, location.longitude)}` : ''}
        </p>
      ) : null}

      {geoMessage ? (
        <p className={`search-note ${geoStatus === 'error' ? 'is-error' : ''}`} role={geoStatus === 'error' ? 'alert' : 'status'}>
          {geoMessage}
        </p>
      ) : null}

      {open && (status !== 'idle' || error) ? (
        <div className="search-results" id="location-search-results" role="listbox">
          {status === 'loading' ? <p className="search-hint">Searching…</p> : null}
          {status === 'error' ? <p className="search-hint is-error">{error}</p> : null}
          {status === 'ready' && !results.length ? <p className="search-hint">No matching place found. Try a nearby city or district.</p> : null}
          {results.map((place, index) => (
            <button
              key={`${place.id}-${place.latitude}-${place.longitude}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={`search-result ${index === activeIndex ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(place)}
            >
              <MapPin size={15} aria-hidden="true" />
              <span>
                <strong>{place.name}</strong>
                <small>{[place.admin1, place.country].filter(Boolean).join(', ')}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
