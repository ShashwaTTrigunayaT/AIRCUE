import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, LineChart as LineChartIcon, Minus } from 'lucide-react';
import { useLocationContext } from '../context/LocationContext.jsx';
import { useAirQuality } from '../hooks/useAirQuality.js';
import TrendChart from '../charts/TrendChart.jsx';
import { Badge, DataBadge, ErrorState, LoadingState, SectionHeading } from '../components/States.jsx';
import ProvenancePanel from '../components/ProvenancePanel.jsx';
import AnomalyPanel from '../components/AnomalyPanel.jsx';
import LocationSearch from '../components/LocationSearch.jsx';
import { formatDate, formatNumber } from '../utils/format.js';

const METRICS = [
  { key: 'pm2_5', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
  { key: 'us_aqi', label: 'US AQI' },
];

export default function Trends() {
  const { location } = useLocationContext();
  const { status, current, history, error, errors, reload } = useAirQuality(location);
  const [range, setRange] = useState('24h');
  const [metric, setMetric] = useState('pm2_5');

  const chartSeries = range === '24h' ? history?.hourly : history?.weeklyHourly;

  const extremes = useMemo(() => {
    const daily = history?.daily || [];
    const values = daily.filter((day) => typeof day.pm2_5 === 'number');
    if (!values.length) return null;
    return {
      highest: values.reduce((best, day) => (day.pm2_5 > best.pm2_5 ? day : best), values[0]),
      lowest: values.reduce((best, day) => (day.pm2_5 < best.pm2_5 ? day : best), values[0]),
    };
  }, [history]);

  const summary = range === '24h' ? history?.current24 : history?.weekly;
  const summaryTitle = range === '24h' ? 'Last 24 hours' : `Last ${history?.daily?.length || 0} days`;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Historical trends</p>
          <h1>How has the air been changing?</h1>
          <p className="page-lead">
            Modelled history from Open-Meteo/CAMS, including daily aggregates computed by AIR CUE. These are estimates,
            not verified monitoring-station observations.
          </p>
        </div>
        <div className="location-panel">
          <LocationSearch placeholder="Search another city…" />
        </div>
      </div>

      {status === 'loading' && !history ? <LoadingState label="Loading historical air-quality data…" /> : null}
      {status === 'error' && !history ? (
        <ErrorState title="Historical data could not be loaded" message={error || errors.history} onRetry={reload} />
      ) : null}

      {history ? (
        <>
          <section className="panel">
            <SectionHeading
              eyebrow="Pollution history"
              title={summaryTitle}
              description={`${history.provider} · ${history.measurementType} · generated ${history.generatedAt ? new Date(history.generatedAt).toLocaleString() : '—'}`}
              action={
                <div className="segmented" role="group" aria-label="History range">
                  <button type="button" className={range === '24h' ? 'is-active' : ''} onClick={() => setRange('24h')}>
                    24 hours
                  </button>
                  <button type="button" className={range === '7d' ? 'is-active' : ''} onClick={() => setRange('7d')}>
                    7 days
                  </button>
                </div>
              }
            />

            <div className="chart-toolbar">
              <div className="segmented segmented-small" role="group" aria-label="History pollutant">
                {METRICS.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    className={metric === entry.key ? 'is-active' : ''}
                    onClick={() => setMetric(entry.key)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <div className="chart-toolbar-badges">
                <DataBadge type="modelled" />
                <Badge tone="provenance" icon={LineChartIcon}>
                  {range === '24h' ? history.hourly.length : history.weeklyHourly.length} hourly values
                </Badge>
              </div>
            </div>

            <TrendChart
              series={chartSeries}
              metric={metric}
              timezone={location?.timezone}
              weekly={range === '7d'}
              height={330}
            />
          </section>

          <div className="stat-strip">
            <article className="stat-card">
              <span>Average PM2.5</span>
              <strong>{summary?.pm2_5?.average ?? '—'} <small>µg/m³</small></strong>
              <p>{summary?.pm2_5 ? `${summary.pm2_5.count} hourly values` : 'Not enough data'}</p>
            </article>
            <article className="stat-card">
              <span>Highest hourly PM2.5</span>
              <strong>{summary?.pm2_5?.max ?? '—'} <small>µg/m³</small></strong>
              <p>{extremes ? `Daily peak on ${formatDate(`${extremes.highest.date}T12:00:00Z`, location?.timezone)}` : 'Daily detail unavailable'}</p>
            </article>
            <article className="stat-card">
              <span>Lowest hourly PM2.5</span>
              <strong>{summary?.pm2_5?.min ?? '—'} <small>µg/m³</small></strong>
              <p>{extremes ? `Lowest daily mean on ${formatDate(`${extremes.lowest.date}T12:00:00Z`, location?.timezone)}` : 'Daily detail unavailable'}</p>
            </article>
            <article className="stat-card">
              <span>Change vs previous 24 h</span>
              <strong
                className={
                  typeof history.change24h?.pm2_5 === 'number'
                    ? history.change24h.pm2_5 > 0
                      ? 'is-worse'
                      : history.change24h.pm2_5 < 0
                        ? 'is-better'
                        : ''
                    : ''
                }
              >
                {typeof history.change24h?.pm2_5 === 'number' ? (
                  <>
                    {history.change24h.pm2_5 > 0 ? (
                      <ArrowUpRight size={20} aria-hidden="true" />
                    ) : history.change24h.pm2_5 < 0 ? (
                      <ArrowDownRight size={20} aria-hidden="true" />
                    ) : (
                      <Minus size={20} aria-hidden="true" />
                    )}
                    {history.change24h.pm2_5 > 0 ? '+' : ''}
                    {history.change24h.pm2_5}%
                  </>
                ) : (
                  '—'
                )}
              </strong>
              <p>{history.change24h?.comparison || 'Comparison needs two complete periods'}</p>
            </article>
          </div>

          <AnomalyPanel location={location} />

          {history.daily?.length ? (
            <section className="panel">
              <SectionHeading
                eyebrow="Daily detail"
                title="Day-by-day pollution"
                description="Daily means are aggregated by AIR CUE from hourly modelled values; each row shows how many hours contributed."
              />
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>PM2.5 mean</th>
                      <th>PM10 mean</th>
                      <th>NO₂ mean</th>
                      <th>O₃ mean</th>
                      <th>US AQI max</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.daily.map((day) => (
                      <tr key={day.date}>
                        <td>{formatDate(`${day.date}T12:00:00Z`, location?.timezone)}</td>
                        <td>{formatNumber(day.pm2_5, 1)} µg/m³</td>
                        <td>{formatNumber(day.pm10, 1)} µg/m³</td>
                        <td>{formatNumber(day.nitrogen_dioxide, 1)} µg/m³</td>
                        <td>{formatNumber(day.ozone, 1)} µg/m³</td>
                        <td>{formatNumber(day.usAqiMax, 0)}</td>
                        <td>{day.hoursCovered}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="panel-note">{history.limitations.join(' ')}</p>
            </section>
          ) : null}

          {current ? <ProvenancePanel current={current} /> : null}
        </>
      ) : null}
    </div>
  );
}
