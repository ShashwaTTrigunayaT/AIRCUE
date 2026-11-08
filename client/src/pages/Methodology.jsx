import { ExternalLink, Database, ShieldCheck, Wind } from 'lucide-react';
import { Badge, SectionHeading } from '../components/States.jsx';

const LINKS = [
  { href: 'https://open-meteo.com/en/docs/air-quality-api', label: 'Open-Meteo Air Quality API' },
  { href: 'https://open-meteo.com/en/docs/geocoding-api', label: 'Open-Meteo Geocoding API' },
  { href: 'https://open-meteo.com/en/terms', label: 'Open-Meteo terms' },
  { href: 'https://docs.openaq.org/', label: 'OpenAQ API documentation' },
  { href: 'https://cpcb.nic.in/', label: 'Central Pollution Control Board (CPCB)' },
  { href: 'https://app.cpcbccr.com/ccr_docs/About_AQI.pdf', label: 'CPCB AQI methodology (PDF)' },
  { href: 'https://console.groq.com/docs', label: 'Groq API documentation' },
  { href: 'https://operations.osmfoundation.org/policies/tiles/', label: 'OpenStreetMap tile usage policy' },
  { href: 'https://www.openstreetmap.org/copyright', label: 'OpenStreetMap copyright' },
];

export default function Methodology() {
  return (
    <div className="page methodology-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Data sources, methodology & limitations</p>
          <h1>How AIR CUE reaches its answers.</h1>
          <p className="page-lead">
            Trust is a product feature. This page states where the data comes from, what each value represents, how
            derived metrics are calculated, and what the app deliberately does not claim.
          </p>
        </div>
      </div>

      <section className="panel">
        <SectionHeading
          eyebrow="Data sources"
          title="Authentic public data, attributed"
          action={<Badge tone="provenance" icon={Database}>No synthetic readings</Badge>}
        />
        <div className="method-grid">
          <article>
            <h3>Open-Meteo Air Quality</h3>
            <p>
              Primary source for current-hour, hourly forecast and historical pollutant concentrations: PM2.5, PM10,
              NO₂, SO₂, O₃ and CO, plus provider-computed US AQI and European AQI (including per-pollutant US AQI
              sub-indices used for dominant-pollutant attribution).
            </p>
            <p className="method-caveat">
              <strong>Modelled, not measured.</strong> Open-Meteo air-quality data is gridded CAMS atmospheric
              composition model output. Resolution is model-dependent (roughly 11 km over Europe, ~40 km globally). It
              is not a reading from a monitoring station at the selected address.
            </p>
          </article>
          <article>
            <h3>Open-Meteo Geocoding</h3>
            <p>
              Converts city and place searches into coordinates, and returns country, region and timezone metadata used
              for display and label decisions.
            </p>
          </article>
          <article>
            <h3>OpenAQ</h3>
            <p>
              Optional ground-level monitoring-station observations, shown in a separate layer with station metadata,
              units and timestamps. Requires a free API key on the server; without one, the app explains that station
              observations are not configured.
            </p>
            <p className="method-caveat">
              Station coverage and recency vary by location. AIR CUE never silently merges station observations with
              modelled grid values.
            </p>
          </article>
          <article>
            <h3>OpenStreetMap</h3>
            <p>
              Map tiles for the Leaflet map, with visible attribution. Public OSM tile servers are not treated as an
              unrestricted production tile service; high-traffic deployment should use a dedicated tile provider.
            </p>
          </article>
        </div>
      </section>

      <section className="panel">
        <SectionHeading eyebrow="AQI standards" title="Three indices, never mixed" />
        <div className="method-grid">
          <article>
            <h3>CPCB AQI (India) — computed by AIR CUE</h3>
            <p>
              AIR CUE computes a CPCB AQI only when the CPCB validity conditions are met: at least three valid
              pollutants including PM2.5 or PM10, with 24-hour averaging for PM2.5, PM10, NO₂, SO₂ and CO, and 8-hour
              averaging for O₃ and CO. Concentration breakpoints follow the CPCB AQI methodology and the overall AQI is
              the highest valid sub-index, which also identifies the dominant pollutant.
            </p>
            <p className="method-caveat">
              This is a calculation from modelled hourly concentrations, not an official CPCB monitoring value. If the
              requirements are not met, the value is withheld and the reason is shown instead.
            </p>
          </article>
          <article>
            <h3>US EPA AQI — provider-computed</h3>
            <p>
              Supplied by Open-Meteo, including per-pollutant sub-indices. Used as the default comparable standard for
              Clean Air Finder, forecast charts and city comparison because it is available for every location and hour.
            </p>
          </article>
          <article>
            <h3>European AQI — provider-computed</h3>
            <p>Supplied by Open-Meteo on a 0–100+ scale, with provider-defined category thresholds.</p>
          </article>
          <article>
            <h3>Rules AIR CUE follows</h3>
            <ul className="method-list">
              <li>Every AQI is labelled with its standard.</li>
              <li>No US or European value is relabelled as CPCB AQI.</li>
              <li>Different AQI scales are never ranked against each other.</li>
              <li>Missing pollutants are never replaced with zero.</li>
              <li>Raw provider values remain traceable in the payload.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="panel">
        <SectionHeading eyebrow="Derived metrics" title="How AIR CUE calculates what it shows" />
        <div className="method-grid">
          <article>
            <h3>Dominant pollutant</h3>
            <p>
              For CPCB, the dominant pollutant is the pollutant with the highest valid sub-index (CPCB definition). For
              the provider US AQI, it is the pollutant with the highest supplied per-pollutant sub-index. If neither
              basis is available, no dominant pollutant is claimed.
            </p>
          </article>
          <article>
            <h3>Trend</h3>
            <p>
              The mean of the most recent six hourly PM2.5 values (PM10 if PM2.5 is missing) compared with the previous
              six hours. Changes under 5% are labelled stable. This describes the supplied series; it does not explain
              causes.
            </p>
          </article>
          <article>
            <h3>Best Outdoor Window</h3>
            <p>
              Candidate windows use contiguous forecast hours with complete PM2.5 values, at 60, 120 or 180 minutes.
              Score = 65% mean PM2.5 + 35% peak PM2.5; lower is better. Whole hours only, because the forecast is
              hourly. Ranking uses PM2.5 only because a CPCB AQI cannot be computed for a sub-daily window. The US AQI
              shown with each window is a separate index and is not used for ranking.
            </p>
            <p className="method-caveat">
              This is a relative comparison, not a declaration that the air is safe. Activity choice sets the planned
              duration and exposure context; it does not change the pollution ranking formula.
            </p>
          </article>
          <article>
            <h3>Clean Air Finder</h3>
            <p>
              Samples 24 modelled grid points around the selected location (8 compass directions × 3 distances), ranks
              them by the same provider US AQI, and lists only points at least 5 index points lower than the origin.
              Rows are labelled as modelled samples, not stations.
            </p>
          </article>
          <article>
            <h3>History & changes</h3>
            <p>
              History is the provider's modelled hourly series. Daily means and highest/lowest values are aggregated by
              AIR CUE. A percentage change is shown only when both comparison periods contain enough hourly values.
            </p>
          </article>
          <article>
            <h3>Alerts</h3>
            <p>
              Thresholds are evaluated in the browser whenever fresh data loads while AIR CUE is open or refreshed.
              Settings and history are saved through the server (MongoDB when configured, otherwise a local JSON store)
              under an anonymous device identifier. No background service checks conditions while the browser is closed.
            </p>
          </article>
        </div>
      </section>

      <section className="panel">
        <SectionHeading
          eyebrow="AI assistant"
          title="Explanation, not measurement"
          action={<Badge tone="ai" icon={Wind}>Groq</Badge>}
        />
        <p>
          When configured, the server builds a compact context from the already-retrieved AIR CUE data — location, AQI
          standard, category, pollutant values with units, timestamps, trend, forecast peak and best window — and sends
          it to a Groq-hosted model with strict grounding instructions. The model is told to use only that context for
          location-specific claims, name the source and measurement type, say when data is insufficient, avoid
          inventing causes, keep AQI standards distinct, and avoid medical diagnosis or safety guarantees.
        </p>
        <p className="method-caveat">
          The API key stays server-side. If Groq is unavailable or unconfigured, the dashboard is unaffected and
          insights fall back to rule-based explanations that are labelled as such. AI output can still be wrong; verify
          numbers against the dashboard.
        </p>
      </section>

      <section className="panel">
        <SectionHeading eyebrow="Limitations" title="What this product deliberately does not do" />
        <ul className="limitation-list">
          <li>No fabricated readings, station IDs, model resolutions or confidence scores.</li>
          <li>No official CPCB monitoring data is claimed; CPCB AQI here is computed from modelled values.</li>
          <li>No interpolation presented as measured truth. A pollution heatmap is deliberately not implemented.</li>
          <li>No reverse-geocoded place name is invented for raw GPS coordinates; coordinates are shown instead.</li>
          <li>No claim of continuous background monitoring for alerts.</li>
          <li>No personalised medical advice and no guarantee that an activity or location is safe.</li>
          <li>No ranking across different AQI standards or different measurement types.</li>
        </ul>
      </section>

      <section className="panel">
        <SectionHeading eyebrow="Attribution" title="Official references" action={<ShieldCheck size={17} aria-hidden="true" />} />
        <ul className="reference-list">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noreferrer noopener">
                {link.label} <ExternalLink size={13} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <p className="panel-note">
          Review current terms, rate limits, attribution requirements and API availability before deployment. Public
          APIs can change or be withdrawn.
        </p>
      </section>
    </div>
  );
}
