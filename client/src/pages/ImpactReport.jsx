import { Download, FileText, Printer } from 'lucide-react';
import { useLocationContext } from '../context/LocationContext.jsx';
import { useAirQuality } from '../hooks/useAirQuality.js';
import LocationSearch from '../components/LocationSearch.jsx';
import TrendChart from '../charts/TrendChart.jsx';
import { Badge, DataBadge, ErrorState, LoadingState, SectionHeading } from '../components/States.jsx';
import { STANDARD_LABELS, categoryColor, guidanceFor } from '../utils/aqi.js';
import {
  formatClock,
  formatDate,
  formatDateTime,
  formatNumber,
  locationSubtitle,
  locationTitle,
} from '../utils/format.js';

function reportSlug(name) {
  return String(name || 'air-cue')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export default function ImpactReport() {
  const { location } = useLocationContext();
  const { status, current, forecast, history, error, errors, reload } = useAirQuality(location);

  const standard = current?.primaryStandard || 'US';
  const block = current?.aqi?.[standard];
  const category = block?.valid ? block.category : null;
  const guidance = guidanceFor(standard, category?.key);
  const color = category ? categoryColor(standard, category.key) : '#64748b';

  const upcoming = (forecast?.hourly || []).filter((hour) => typeof hour.us_aqi === 'number').slice(0, 24);
  const peak =
    upcoming.length > 0
      ? upcoming.reduce((best, hour) => (hour.us_aqi > best.us_aqi ? hour : best), upcoming[0])
      : null;
  const bestWindow = forecast?.outdoorWindows?.durations?.['60']?.windows?.[0] || null;
  const generatedAt = new Date().toISOString();

  function downloadJson() {
    const payload = {
      report: 'AIR CUE air-quality impact report',
      generatedAt,
      location: current?.location || location,
      standard,
      current,
      history,
      forecast,
      disclaimer:
        'Generated from modelled Open-Meteo/CAMS data. Not a medical assessment, not official CPCB monitoring data and not a safety guarantee.',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportSlug(locationTitle(current?.location || location))}-impact-report.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return (
    <div className="page report-page">
      <div className="page-head no-print">
        <div>
          <p className="eyebrow">Impact report</p>
          <h1>One page you can print or save.</h1>
          <p className="page-lead">
            Current status, health implications, recent trends, forecast expectations and data limitations — assembled
            from the same modelled feed used across AIR CUE.
          </p>
        </div>
        <div className="location-panel">
          <LocationSearch placeholder="Build a report for another location…" />
        </div>
      </div>

      {status === 'loading' && !current ? <LoadingState label="Assembling the impact report…" rows={4} /> : null}
      {status === 'error' && !current ? (
        <ErrorState
          title="The impact report needs current data"
          message={error || errors.current}
          hint="Historical and forecast sections appear only when their data loaded."
          onRetry={reload}
        />
      ) : null}

      {current ? (
        <>
          <div className="report-actions no-print">
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={15} aria-hidden="true" /> Print / save PDF
            </button>
            <button type="button" className="btn btn-ghost" onClick={downloadJson}>
              <Download size={15} aria-hidden="true" /> Download JSON
            </button>
            <Badge tone="provenance" icon={FileText}>Generated from loaded data</Badge>
          </div>

          <article className="report-sheet">
            <header className="report-cover">
              <div>
                <p className="eyebrow">AIR CUE · Air-quality impact report</p>
                <h1>{locationTitle(current.location)}</h1>
                <p className="section-description">
                  {locationSubtitle(current.location) || 'Selected coordinates'} ·{' '}
                  {current.location.latitude?.toFixed(3)}, {current.location.longitude?.toFixed(3)}
                </p>
              </div>
              <div className="report-cover-meta">
                <span>Generated {formatDateTime(generatedAt, current.location.timezone)}</span>
                <span>Data hour {formatDateTime(current.dataTimestamp, current.location.timezone)}</span>
                <DataBadge type={current.measurementType} />
              </div>
            </header>

            {(errors.history || errors.forecast) ? (
              <p className="report-disclaimer">
                Some sections could not load: {[errors.history, errors.forecast].filter(Boolean).join(' ')} The report
                shows only the data that was available.
              </p>
            ) : null}

            <section className="report-section" aria-labelledby="report-current">
              <SectionHeading
                id="report-current"
                eyebrow="Current status"
                title={`${STANDARD_LABELS[standard]?.long || standard} · ${category?.label || 'No valid category'}`}
                action={<Badge tone="provenance">{current.provider}</Badge>}
              />
              <div className="report-status">
                <div className="report-aqi" style={{ color }}>
                  {block?.valid ? block.value : '—'}
                  <small>{category?.label || 'Unavailable'}</small>
                </div>
                <dl className="report-facts">
                  <div>
                    <dt>AQI standard</dt>
                    <dd>{STANDARD_LABELS[standard]?.long || standard}</dd>
                  </div>
                  <div>
                    <dt>Measurement type</dt>
                    <dd>{current.measurementType}</dd>
                  </div>
                  <div>
                    <dt>Dominant pollutant</dt>
                    <dd>{block?.dominant?.label || 'Not attributed'}</dd>
                  </div>
                  <div>
                    <dt>Data source</dt>
                    <dd>{current.provider} / CAMS</dd>
                  </div>
                  <div>
                    <dt>Trend</dt>
                    <dd>
                      {current.trend
                        ? `${current.trend.direction} ${typeof current.trend.deltaPct === 'number' ? `(${current.trend.deltaPct}%)` : ''}`
                        : 'Unavailable'}
                    </dd>
                  </div>
                  <div>
                    <dt>Data hour</dt>
                    <dd>{formatDateTime(current.dataTimestamp, current.location.timezone)}</dd>
                  </div>
                </dl>
              </div>

              <table className="data-table report-table">
                <thead>
                  <tr>
                    <th>Pollutant</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {current.pollutants.map((pollutant) => (
                    <tr key={pollutant.key}>
                      <td>{pollutant.label}</td>
                      <td>{pollutant.available ? formatNumber(pollutant.value, pollutant.precision ?? 1) : '—'}</td>
                      <td>{pollutant.unit || '—'}</td>
                      <td>{pollutant.available ? 'Available' : 'Not returned by provider'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="report-section" aria-labelledby="report-health">
              <SectionHeading
                id="report-health"
                eyebrow="Health implications"
                title="General guidance, not a diagnosis"
              />
              <div className="guidance-grid">
                <div className="guidance-item">
                  <h4>Current category</h4>
                  <p>{guidance.headline} {guidance.health}</p>
                </div>
                <div className="guidance-item">
                  <h4>Sensitive groups</h4>
                  <p>{guidance.sensitive}</p>
                </div>
                <div className="guidance-item">
                  <h4>Outdoor activity</h4>
                  <p>{guidance.outdoors}</p>
                </div>
                <div className="guidance-item">
                  <h4>Mask guidance</h4>
                  <p>{guidance.mask}</p>
                </div>
              </div>
              <p className="report-disclaimer">
                AIR CUE does not know your medical history, medication, indoor environment or cumulative exposure. This
                report does not replace clinical or local public-health advice, and no hour or activity is guaranteed to
                be safe.
              </p>
            </section>

            <section className="report-section" aria-labelledby="report-trend">
              <SectionHeading
                id="report-trend"
                eyebrow="Historical trends"
                title="How the last 24 hours compare"
                action={<DataBadge type="modelled" />}
              />
              {history ? (
                <>
                  <div className="report-stats">
                    <div className="report-stat">
                      <span>Average PM2.5</span>
                      <strong>{history.current24?.pm2_5?.average ?? '—'} <small>µg/m³</small></strong>
                    </div>
                    <div className="report-stat">
                      <span>Highest hour</span>
                      <strong>{history.current24?.pm2_5?.max ?? '—'} <small>µg/m³</small></strong>
                    </div>
                    <div className="report-stat">
                      <span>Lowest hour</span>
                      <strong>{history.current24?.pm2_5?.min ?? '—'} <small>µg/m³</small></strong>
                    </div>
                    <div className="report-stat">
                      <span>vs previous 24 h</span>
                      <strong>
                        {typeof history.change24h?.pm2_5 === 'number'
                          ? `${history.change24h.pm2_5 > 0 ? '+' : ''}${history.change24h.pm2_5}%`
                          : '—'}
                      </strong>
                    </div>
                  </div>
                  {history.hourly?.length ? (
                    <TrendChart
                      series={history.hourly}
                      metric="pm2_5"
                      timezone={current.location.timezone}
                      height={240}
                    />
                  ) : null}
                  {history.daily?.length ? (
                    <table className="data-table report-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>PM2.5 mean</th>
                          <th>PM10 mean</th>
                          <th>US AQI max</th>
                          <th>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.daily.map((day) => (
                          <tr key={day.date}>
                            <td>{formatDate(`${day.date}T12:00:00Z`, current.location.timezone)}</td>
                            <td>{formatNumber(day.pm2_5, 1)} µg/m³</td>
                            <td>{formatNumber(day.pm10, 1)} µg/m³</td>
                            <td>{formatNumber(day.usAqiMax, 0)}</td>
                            <td>{day.hoursCovered}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                </>
              ) : (
                <p className="panel-note">Historical data was not available for this report.</p>
              )}
            </section>

            <section className="report-section" aria-labelledby="report-forecast">
              <SectionHeading
                id="report-forecast"
                eyebrow="Forecast expectations"
                title="What the next hours suggest"
                action={<DataBadge type="forecast" />}
              />
              {forecast ? (
                <>
                  <div className="report-stats">
                    <div className="report-stat">
                      <span>Peak US AQI (24 h)</span>
                      <strong>{peak ? Math.round(peak.us_aqi) : '—'}</strong>
                      <p>{peak ? formatDateTime(peak.time, current.location.timezone) : 'No valid forecast hours'}</p>
                    </div>
                    <div className="report-stat">
                      <span>Best 60-min window</span>
                      <strong>{bestWindow ? formatClock(bestWindow.startTime, current.location.timezone) : '—'}</strong>
                      <p>{bestWindow ? `Mean PM2.5 ${bestWindow.meanPm25} µg/m³ · relative ranking` : 'Insufficient forecast data'}</p>
                    </div>
                    <div className="report-stat">
                      <span>Forecast coverage</span>
                      <strong>{forecast.hourly?.length || 0} hours</strong>
                      <p>{formatDateTime(forecast.validFrom, current.location.timezone)} → {formatDateTime(forecast.validTo, current.location.timezone)}</p>
                    </div>
                  </div>
                  <p className="panel-note">{forecast.limitations?.join(' ')}</p>
                </>
              ) : (
                <p className="panel-note">Forecast data was not available for this report.</p>
              )}
            </section>

            <section className="report-section" aria-labelledby="report-provenance">
              <SectionHeading id="report-provenance" eyebrow="Data provenance" title="Sources and limits" />
              <p className="section-description">
                {current.dataset} · {current.provider} · fetched {formatDateTime(current.fetchedAt, current.location.timezone)}
              </p>
              <ul className="limitation-list">
                {(current.provenance?.limitations || []).map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
                <li>The CPCB AQI, when shown, is computed by AIR CUE from modelled hourly concentrations, not an official CPCB monitoring value.</li>
                <li>This report is a snapshot of loaded data; conditions and model output can change after the data hour.</li>
              </ul>
            </section>

            <footer className="report-footer">
              <span>AIR CUE · From air-quality data to everyday decisions.</span>
              <span>Air-quality data: Open-Meteo/CAMS. Map tiles: OpenStreetMap contributors.</span>
            </footer>
          </article>
        </>
      ) : null}
    </div>
  );
}
