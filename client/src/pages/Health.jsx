import { useEffect, useState } from 'react';
import { HeartPulse, Home, ShieldCheck, Stethoscope, Wind } from 'lucide-react';
import { useLocationContext } from '../context/LocationContext.jsx';
import { useAirQuality } from '../hooks/useAirQuality.js';
import HealthAdvisory from '../components/HealthAdvisory.jsx';
import LocationSearch from '../components/LocationSearch.jsx';
import ProvenancePanel from '../components/ProvenancePanel.jsx';
import { Badge, ErrorState, InlineNotice, LoadingState, SectionHeading } from '../components/States.jsx';
import { POLLUTANT_HEALTH, SCALES, STANDARD_LABELS, categoryColor } from '../utils/aqi.js';

export default function Health() {
  const { location } = useLocationContext();
  const { status, current, error, errors, reload } = useAirQuality(location);
  const [standard, setStandard] = useState('US');

  useEffect(() => {
    if (current?.primaryStandard) setStandard(current.primaryStandard);
  }, [current?.primaryStandard, location.latitude, location.longitude]);

  const scale = SCALES[standard] || SCALES.US;
  const block = current?.aqi?.[standard];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Health & safety</p>
          <h1>Turn the number into a sensible plan.</h1>
          <p className="page-lead">
            General guidance for the selected AQI category, sensitive groups, outdoor activity, masks and precautions.
            This is not personalised medical advice.
          </p>
        </div>
        <div className="location-panel">
          <LocationSearch placeholder="Check another location…" />
        </div>
      </div>

      {status === 'loading' && !current ? <LoadingState label="Loading health-relevant air-quality data…" /> : null}
      {status === 'error' && !current ? (
        <ErrorState title="Health guidance needs current data" message={error || errors.current} onRetry={reload} />
      ) : null}

      {current ? (
        <>
          <div className="standard-switcher standard-switcher-page" role="group" aria-label="AQI standard for health guidance">
            <span className="standard-switcher-label">Guidance standard</span>
            {Object.keys(current.aqi).map((key) => {
              const option = current.aqi[key];
              return (
                <button
                  key={key}
                  type="button"
                  className={`chip ${standard === key ? 'is-selected' : ''}`}
                  onClick={() => setStandard(key)}
                  disabled={!option?.valid}
                  aria-pressed={standard === key}
                >
                  {STANDARD_LABELS[key]?.short} {option?.valid ? <span className="chip-value">{option.value}</span> : <span className="chip-value">n/a</span>}
                </button>
              );
            })}
          </div>

          <HealthAdvisory current={current} standard={standard} expanded />

          <div className="two-column">
            <section className="panel">
              <SectionHeading
                eyebrow="Category scale"
                title={`${STANDARD_LABELS[standard]?.long} categories`}
                description={STANDARD_LABELS[standard]?.note}
                action={<HeartPulse size={18} aria-hidden="true" />}
              />
              <table className="scale-table">
                <thead>
                  <tr>
                    <th>Range</th>
                    <th>Category</th>
                    <th>Current</th>
                  </tr>
                </thead>
                <tbody>
                  {scale.map((row) => {
                    const isCurrent = block?.valid && block.category?.key === row.key;
                    return (
                      <tr key={row.key} className={isCurrent ? 'is-current' : ''}>
                        <td>{row.range}</td>
                        <td>
                          <span className="scale-dot" style={{ background: categoryColor(standard, row.key) }} aria-hidden="true" />
                          {row.label}
                        </td>
                        <td>{isCurrent ? <Badge tone="provenance">Current</Badge> : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="panel-note">
                Category labels and thresholds belong to this standard only. A “Moderate” CPCB value and a “Moderate”
                US AQI value are not the same level of pollution.
              </p>
            </section>

            <section className="panel">
              <SectionHeading
                eyebrow="Pollutant health notes"
                title="Why each pollutant matters"
                description="General educational information, separate from the live reading."
                action={<Wind size={18} aria-hidden="true" />}
              />
              <ul className="pollutant-health-list">
                {current.pollutants.map((pollutant) => (
                  <li key={pollutant.key}>
                    <div>
                      <strong>{pollutant.label}</strong>
                      <small>{pollutant.name}</small>
                    </div>
                    <p>{POLLUTANT_HEALTH[pollutant.key]}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="panel">
            <SectionHeading
              eyebrow="Practical precautions"
              title="Reducing exposure without overreacting"
              description="Simple, widely recommended steps. Adapt them to your own health circumstances and local advisories."
            />
            <div className="precaution-grid">
              <div className="precaution-card">
                <Home size={18} aria-hidden="true" />
                <h3>Indoor air</h3>
                <p>
                  Keep windows closed during high-pollution periods where outdoor air is worse than indoor air. Avoid
                  burning candles, incense or smoking indoors. Use a well-maintained filter or purifier if you have one.
                </p>
              </div>
              <div className="precaution-card">
                <ShieldCheck size={18} aria-hidden="true" />
                <h3>Masks</h3>
                <p>
                  A well-fitted N95/FFP2 mask can reduce fine-particle exposure. Surgical and cloth masks are not
                  reliable for PM2.5. Masks do not replace reducing time outdoors at very high pollution levels.
                </p>
              </div>
              <div className="precaution-card">
                <HeartPulse size={18} aria-hidden="true" />
                <h3>Activity</h3>
                <p>
                  Plan vigorous activity for a comparatively cleaner forecast window, away from busy roads. Reduce
                  intensity if you notice coughing, wheezing, chest tightness or unusual breathlessness.
                </p>
              </div>
              <div className="precaution-card">
                <Stethoscope size={18} aria-hidden="true" />
                <h3>Medical care</h3>
                <p>
                  Follow your own care plan and keep prescribed reliever medication available. Seek medical advice for
                  persistent or severe breathing difficulty, chest pain or dizziness.
                </p>
              </div>
            </div>
            <InlineNotice tone="info" title="What AIR CUE cannot do">
              AIR CUE cannot know your medical history, medication, indoor environment or exposure over the day. It does
              not diagnose conditions, and it does not claim that any hour or activity is risk-free.
            </InlineNotice>
          </section>

          <ProvenancePanel current={current} />
        </>
      ) : null}
    </div>
  );
}
