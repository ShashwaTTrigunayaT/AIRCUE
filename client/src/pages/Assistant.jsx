import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useLocationContext } from '../context/LocationContext.jsx';
import { useAirQuality } from '../hooks/useAirQuality.js';
import LocationSearch from '../components/LocationSearch.jsx';
import CopilotChat from '../components/CopilotChat.jsx';
import { Badge, InlineNotice, LoadingState, SectionHeading } from '../components/States.jsx';
import { STANDARD_LABELS } from '../utils/aqi.js';
import { formatDateTime, timeAgo } from '../utils/format.js';

const GROUNDING_RULES = [
  'Only supplied AIR CUE readings, forecasts and provenance can be used for location-specific claims.',
  'Missing data must be named as missing — never filled in or estimated by the model.',
  'The AQI standard must be preserved; US or European values are never relabelled as CPCB AQI.',
  'General explanations are kept separate from live-data conclusions.',
  'No medical diagnosis, no guarantee that air is safe, and no invented causes of pollution.',
];

export default function Assistant() {
  const { location } = useLocationContext();
  const { status, current, error } = useAirQuality(location);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .health()
      .then((payload) => {
        if (active) setHealth(payload);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const aiStatus = health?.features?.aiAssistant;
  const primary = current?.aqi?.[current?.primaryStandard];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">AI assistant</p>
          <h1>Ask the data, not the internet.</h1>
          <p className="page-lead">
            A grounded assistant for the selected location. It explains the current reading, forecast, trend and
            provenance that AIR CUE has already retrieved — it does not create environmental readings.
          </p>
        </div>
        <div className="location-panel">
          <LocationSearch placeholder="Ask about another location…" />
        </div>
      </div>

      {status === 'loading' && !current ? <LoadingState label="Preparing the assistant context…" /> : null}
      {error && !current ? (
        <InlineNotice tone="warning" title="Current data is unavailable">
          {error} The assistant can still explain general concepts, but it cannot answer questions about live conditions
          without data.
        </InlineNotice>
      ) : null}

      <div className="assistant-layout">
        <div className="assistant-main">
          <CopilotChat location={location} current={current} aiStatus={aiStatus} />
        </div>

        <aside className="assistant-side">
          <section className="panel panel-compact">
            <SectionHeading
              eyebrow="Context sent"
              title="What the assistant sees"
              description="Only these loaded values and provenance travel with your question."
              action={<Sparkles size={17} aria-hidden="true" />}
            />
            {primary?.valid ? (
              <dl className="context-list">
                <div>
                  <dt>Location</dt>
                  <dd>{current.location.name}</dd>
                </div>
                <div>
                  <dt>AQI</dt>
                  <dd>
                    {primary.value} · {STANDARD_LABELS[current.primaryStandard]?.short} · {primary.category?.label}
                  </dd>
                </div>
                <div>
                  <dt>Measurement type</dt>
                  <dd>{current.measurementType} (Open-Meteo/CAMS)</dd>
                </div>
                <div>
                  <dt>Data hour</dt>
                  <dd>{formatDateTime(current.dataTimestamp, current.location.timezone)}</dd>
                </div>
                <div>
                  <dt>Fetched</dt>
                  <dd>{timeAgo(current.fetchedAt)}</dd>
                </div>
                <div>
                  <dt>Dominant pollutant</dt>
                  <dd>{primary.dominant ? `${primary.dominant.label} (sub-index ${primary.dominant.subIndex})` : 'Not supported by the data'}</dd>
                </div>
              </dl>
            ) : (
              <p className="panel-note">No current AQI block is available, so the assistant will say the data is insufficient.</p>
            )}
            <p className="panel-note">
              Source attribution: <Badge tone="provenance">Open-Meteo</Badge>. Station observations are not mixed in
              unless explicitly provided.
            </p>
          </section>

          <section className="panel panel-compact">
            <SectionHeading eyebrow="Grounding" title="Rules the assistant follows" action={<ShieldCheck size={17} aria-hidden="true" />} />
            <ul className="rule-list">
              {GROUNDING_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <InlineNotice tone="info" title="Privacy & keys">
              <Lock size={13} aria-hidden="true" /> The Groq API key stays on the server. Your question and the compact
              data context are sent to Groq for the answer.
            </InlineNotice>
          </section>

          <section className="panel panel-compact">
            <SectionHeading eyebrow="No AI configured?" title="The rest still works" />
            <p className="panel-note">
              The AI assistant is optional. Dashboard, map, forecast, history, comparison, Clean Air Finder and alerts
              work without any AI key. Insights fall back to rule-based explanations of the loaded data.
            </p>
            <Link className="btn btn-ghost btn-small" to="/methodology">
              Read the methodology
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
