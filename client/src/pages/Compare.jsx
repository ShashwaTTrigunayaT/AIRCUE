import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MapPin, Plus, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useLocationContext } from '../context/LocationContext.jsx';
import { Badge, DataBadge, ErrorState, InlineNotice, LoadingState, SectionHeading } from '../components/States.jsx';
import { STANDARD_LABELS, categoryColor } from '../utils/aqi.js';
import { formatDateTime, formatNumber } from '../utils/format.js';

function CitySearch({ onPick, disabled }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setStatus('idle');
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
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          setStatus('error');
          setError(err?.message || 'Search failed.');
        });
    }, 320);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="compare-search">
      <div className="search-field">
        <Search size={15} aria-hidden="true" />
        <input
          type="text"
          value={query}
          disabled={disabled}
          placeholder={disabled ? 'Maximum of three locations' : 'Add a city to compare…'}
          aria-label="Search a city to compare"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {status === 'loading' ? <p className="search-hint">Searching…</p> : null}
      {status === 'error' ? <p className="search-hint is-error">{error}</p> : null}
      {status === 'ready' && results.length ? (
        <div className="search-results search-results-static">
          {results.slice(0, 5).map((place) => (
            <button
              key={`${place.id}-${place.latitude}`}
              type="button"
              className="search-result"
              onClick={() => {
                onPick(place);
                setQuery('');
                setResults([]);
                setStatus('idle');
              }}
            >
              <MapPin size={14} aria-hidden="true" />
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

export default function Compare() {
  const { location, savedLocations } = useLocationContext();
  const [slots, setSlots] = useState([location]);
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSlots((current) => {
      if (!current.length) return [location];
      return current.map((entry, index) =>
        index === 0
          ? location
          : entry,
      );
    });
    // Reset the comparison when the primary location changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.latitude, location.longitude]);

  const signature = useMemo(
    () => slots.map((entry) => `${entry.latitude},${entry.longitude}`).join(';'),
    [slots],
  );

  useEffect(() => {
    if (slots.length < 2) {
      setStatus('idle');
      setData(null);
      return undefined;
    }
    let active = true;
    setStatus('loading');
    setError(null);
    api
      .compare(slots)
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Comparison failed.');
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [signature, slots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function addLocation(place) {
    setSlots((current) =>
      current.length >= 3
        ? current
        : [
            ...current,
            {
              name: place.name,
              admin1: place.admin1,
              country: place.country,
              countryCode: place.countryCode,
              latitude: place.latitude,
              longitude: place.longitude,
              timezone: place.timezone,
            },
          ],
    );
  }

  function removeSlot(index) {
    setSlots((current) => current.filter((_, position) => position !== index || index === 0));
  }

  const comparison = data;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Location comparison</p>
          <h1>Compare the air, fairly.</h1>
          <p className="page-lead">
            Every row uses the same provider, measurement type and AQI standard. AIR CUE does not rank mixed standards
            or mixed data types against each other.
          </p>
        </div>
      </div>

      <section className="panel">
        <SectionHeading
          eyebrow="Selected locations"
          title={`Comparing ${slots.length} location${slots.length === 1 ? '' : 's'}`}
          description="Add up to three locations. The first row follows your selected dashboard location."
          action={<Badge tone="provenance">{comparison?.comparisonStandard ? STANDARD_LABELS[comparison.comparisonStandard]?.short : 'Awaiting locations'}</Badge>}
        />

        <div className="compare-slots">
          {slots.map((slot, index) => (
            <div className="compare-slot" key={`${slot.latitude}-${slot.longitude}-${index}`}>
              <div>
                <strong>{slot.name}</strong>
                <small>{[slot.admin1, slot.country].filter(Boolean).join(', ')}</small>
                {index === 0 ? <Badge tone="muted">Primary</Badge> : null}
              </div>
              {index > 0 ? (
                <button type="button" className="plain-icon" aria-label={`Remove ${slot.name}`} onClick={() => removeSlot(index)}>
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}
          <div className="compare-add">
            <CitySearch onPick={addLocation} disabled={slots.length >= 3} />
            {savedLocations.length ? (
              <div className="compare-saved">
                <span className="saved-label">Saved</span>
                {savedLocations.slice(0, 4).map((entry) => (
                  <button
                    key={`${entry.latitude}-${entry.longitude}`}
                    type="button"
                    className="chip chip-button"
                    onClick={() => addLocation(entry)}
                    disabled={slots.length >= 3}
                  >
                    <Plus size={12} aria-hidden="true" /> {entry.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {slots.length < 2 ? (
        <InlineNotice tone="info" title="Add a second location">
          Search for a city above, or use a saved location, to start a like-for-like comparison.
        </InlineNotice>
      ) : null}

      {status === 'loading' ? <LoadingState label="Fetching comparable data for each location…" rows={3} /> : null}
      {status === 'error' ? <ErrorState title="Comparison could not be loaded" message={error} /> : null}

      {status === 'ready' && comparison ? (
        <>
          <section className="panel">
            <SectionHeading
              eyebrow="AQI comparison"
              title={`${STANDARD_LABELS[comparison.comparisonStandard]?.long || 'AQI'} by location`}
              description={comparison.notes[1]}
              action={<DataBadge type={comparison.measurementType} />}
            />
            <div className="compare-chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={comparison.locations.map((entry) => {
                    const block = entry.aqi?.[comparison.comparisonStandard];
                    return {
                      name: entry.name,
                      value: block?.valid ? block.value : null,
                      color: block?.valid ? categoryColor(comparison.comparisonStandard, block.category.key) : '#94a3b8',
                    };
                  })}
                  margin={{ top: 16, right: 12, bottom: 8, left: -8 }}
                >
                  <CartesianGrid stroke="rgba(15,92,84,0.12)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#5a736f', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'rgba(15,92,84,0.2)' }} />
                  <YAxis tick={{ fill: '#5a736f', fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="chart-tooltip">
                          <p className="chart-tooltip-time">{payload[0].payload.name}</p>
                          <p className="chart-tooltip-value">
                            {STANDARD_LABELS[comparison.comparisonStandard]?.short}: <strong>{payload[0].value ?? 'n/a'}</strong>
                          </p>
                          <p className="chart-tooltip-note">Same provider and measurement type across bars.</p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={90}>
                    {comparison.locations.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.aqi?.[comparison.comparisonStandard]?.valid
                            ? categoryColor(
                                comparison.comparisonStandard,
                                entry.aqi[comparison.comparisonStandard].category.key,
                              )
                            : '#94a3b8'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel">
            <SectionHeading eyebrow="Like-for-like detail" title="Pollutant comparison" />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>{STANDARD_LABELS[comparison.comparisonStandard]?.short || 'AQI'}</th>
                    <th>Category</th>
                    <th>PM2.5</th>
                    <th>PM10</th>
                    <th>NO₂</th>
                    <th>O₃</th>
                    <th>Data hour</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.locations.map((entry) => {
                    const block = entry.aqi?.[comparison.comparisonStandard];
                    return (
                      <tr key={`${entry.latitude}-${entry.longitude}`}>
                        <td>
                          <strong>{entry.name}</strong>
                          <br />
                          <small>{entry.provider} · {entry.measurementType}</small>
                        </td>
                        <td>{block?.valid ? block.value : 'n/a'}</td>
                        <td style={{ color: block?.valid ? categoryColor(comparison.comparisonStandard, block.category.key) : undefined }}>
                          {block?.valid ? block.category.label : 'Unavailable'}
                        </td>
                        <td>{formatNumber(entry.pollutants.pm2_5, 1)} µg/m³</td>
                        <td>{formatNumber(entry.pollutants.pm10, 1)} µg/m³</td>
                        <td>{formatNumber(entry.pollutants.nitrogen_dioxide, 1)} µg/m³</td>
                        <td>{formatNumber(entry.pollutants.ozone, 1)} µg/m³</td>
                        <td>{formatDateTime(entry.dataTimestamp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {comparison.cpcbComparison ? (
              <div className="cpcb-comparison">
                <h3>
                  CPCB AQI (India) comparison <Badge tone="provenance">Computed by AIR CUE</Badge>
                </h3>
                <p>
                  A valid CPCB AQI was computed for every location, so these values share the CPCB scale:{' '}
                  {comparison.cpcbComparison
                    .map((entry) => `${entry.name} ${entry.value} (${entry.category.label})`)
                    .join(' · ')}
                  .
                </p>
              </div>
            ) : (
              <div className="cpcb-comparison is-warning">
                <ShieldAlert size={16} aria-hidden="true" />
                <p>
                  A CPCB comparison is intentionally not shown: a valid CPCB AQI could not be computed for every
                  location from the available hourly data. The US AQI comparison above uses one consistent scale.
                </p>
              </div>
            )}

            <ul className="limitation-list">
              {comparison.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
