# AIR CUE — Architecture

## Overview

AIR CUE is a small, single-repository application with two deployable units:

- **Client** — React 19 + Vite single-page app (React Router, Recharts, Leaflet, Lucide).
- **Server** — Node.js + Express data integration and normalization layer. In production it also serves the built
  client from `client/dist`, so the whole product can run as one Node service.

```text
Browser
  │  React pages + hooks
  │  GET/POST /api/*  (X-Client-Id: anonymous device id)
  ▼
Express
  ├─ request validation (coordinates, radius, comparison list, question length)
  ├─ rate limiting (global + AI-specific)
  ├─ routes ──► services
  │              ├─ openMeteo.js   fetch + normalize hourly series (5 min cache)
  │              ├─ airQuality.js  build current / forecast / history / compare payloads
  │              ├─ anomalies.js   statistical baseline + rapid-change analysis
  │              ├─ nearby.js      Clean Air Finder sampling + map city layer
  │              ├─ openAq.js      optional station observations (10 min cache)
  │              ├─ context.js     compact grounding context for AI
  │              ├─ insights.js    rule-based insights + optional AIRCUE Copilot insights
  │              ├─ copilot.js     AIRCUE Copilot chat (Groq) with strict system prompt
  │              └─ store.js       MongoDB profile store or local JSON fallback
  └─ static client (SPA fallback, except /api)
```

## Why one upstream fetch per coordinate

Open-Meteo's air-quality API returns current-hour values, forecast hours and past hours in a single hourly response.
AIR CUE requests seven past days and four forecast days for one coordinate, normalizes it once, and caches it for five
minutes. Current conditions, the 48-hour forecast, the 7-day history and the Best Outdoor Window ranking are all built
from that same normalized series.

Benefits:

- One provider call instead of three or four per page.
- Consistent timestamps and units across every view.
- A single place to enforce provenance labels and missing-data handling.
- The client may request current/forecast/history separately (matching the API design), but the server serves them from
  the same cached series.

Cache implementation: `server/utils/cache.js` — a bounded in-memory `Map` with TTL and in-flight request de-duplication.
This is intentionally not a database: it only prevents hammering public providers. No environmental data is persisted.

## Normalization

`normalizeSeries()` converts the provider payload into:

```js
{
  provider, dataset, measurementType: 'modelled',
  spatialResolution, timezone, utcOffsetSeconds,
  time: [absolute ISO strings],
  localTimes: [provider local hour strings],
  units: { pollutant → normalized unit },
  series: { variable → (number | null)[] },
  currentIndex, fetchedAt, latitude, longitude
}
```

- Provider local timestamps are converted to absolute ISO strings using `utc_offset_seconds`, so charts and alerts use
  real instants while display is formatted in the location timezone.
- `currentIndex` is the latest hour whose start time is not in the future (15-minute tolerance).
- Missing values remain `null` throughout; no interpolation or zero substitution occurs.
- Units normalize U+03BC (Greek mu) to U+00B5 (micro sign) for consistent display.
- CO is kept in the provider's µg/m³ unit for display; CPCB sub-index computation converts to mg/m³ because CPCB
  breakpoints for CO are defined in mg/m³.

## AQI handling

`server/utils/aqi.js` is the single source of truth:

1. **CPCB (India)** — computed by AIR CUE from hourly concentrations. CPCB breakpoints per pollutant, linear
   interpolation, 24-hour averaging for PM2.5/PM10/NO₂/SO₂/CO and 8-hour averaging for O₃. A 24-hour average requires at
   least 18 of 24 hourly values; an 8-hour average requires at least 6 of 8. The overall AQI is the highest valid
   sub-index, and it must include at least three valid pollutants including PM2.5 or PM10. If these conditions fail, a
   structured reason is returned instead of a number.
2. **US EPA AQI** — provider-computed `us_aqi`; per-pollutant `us_aqi_*` variables determine dominant-pollutant
   attribution.
3. **European AQI** — provider-computed `european_aqi`.

Each block carries its standard, source and averaging description. The client never converts or relabels one standard as
another. The primary standard defaults to CPCB for India (country code `IN`, or `Asia/Kolkata` timezone when only
coordinates are known) and US AQI elsewhere; users can switch among the available standards.

Clean Air Finder, city comparison and map colouring pick **one** standard per ranking/colour decision (US AQI for
Finder/comparison, because it is available at every sampled hour; CPCB is shown additionally only when valid for all
compared locations).

## Derived metrics

- **Trend** — recent 6-hour mean vs previous 6-hour mean of PM2.5 (PM10 when PM2.5 is unavailable); ±5% is stable.
- **Daily aggregates** — grouped by provider local date; a daily mean/max is computed only from available hours, and the
  number of contributing hours is returned with the value.
- **Change comparison** — 24-hour vs previous 24-hour means, only when both summaries exist.
- **Outdoor windows** (`server/utils/windows.js`) — contiguous forecast windows with complete PM2.5 values at 60, 120
  and 180 minutes (whole hours only, matching the hourly forecast); score = 65% mean + 35% peak, lower is better. Three
  best windows per duration are returned. Ranking is PM2.5-only because CPCB AQI cannot validly describe a sub-daily
  window.
- **Clean Air Finder** — 24 samples (8 bearings × 35/70/100% of radius) around the origin; positioned with great-circle
  offsets; distances computed with the haversine formula; only samples with a valid provider US AQI are ranked, and only
  those at least 5 index points below the origin are shown as cleaner.
- **Anomaly detection** (`server/services/anomalies.js`) — compares the current modelled hour for PM2.5, PM10 and US AQI
  with a 7-day baseline that excludes the most recent 24 hours (minimum 48 valid values). Baseline deviation requires
  |z| ≥ 2; rapid change requires ≥30% between the last two available hours plus a minimum absolute difference. Flags
  are descriptive statistics, not causes or health warnings. Served by `GET /api/air/anomalies`.
- **Heatmap** — client-side overlapping translucent `Circle` layers built from modelled city-level US AQI values and
  Clean Air Finder samples. One AQI standard only; the map labels the result as interpolated for orientation, not a
  measured surface.
- **Impact report / share card** — both assembled from already-loaded payloads. The report adds print CSS and JSON
  export; the share card renders a PNG locally on a canvas. Both repeat the standard, source, data hour and
  modelled/forecast labels.

## Persistence

`server/services/store.js` exposes a small profile API:

```js
getProfile(clientId)
saveAlertConfig(clientId, config)
appendAlertEvents(clientId, events)
clearAlertHistory(clientId)
savePreferences(clientId, preferences)
```

- One document per anonymous `clientId` in a MongoDB `profiles` collection (`serverId`-free; no accounts, no email).
- If `MONGODB_URI` is missing or the connection fails at startup, the same interface uses `server/data/store.json`
  (gitignored). The app remains fully functional; `/api/health` reports the active mode.
- `X-Client-Id` is generated in the browser and validated against `^[A-Za-z0-9_-]{8,64}$`. Requests without a valid ID
  receive HTTP 400 instead of sharing a global profile.
- Alert history is capped at 25 entries; saved locations at 12.
- No environmental data is stored in the database — only user preferences and alert settings/history, which cannot be
  re-fetched from the provider.

## Alerts

Alert evaluation lives in the client (`AlertMonitor`) because the rule needs the currently loaded current/forecast data
and must run against each fresh payload:

- AQI threshold, PM2.5 threshold, category change, sudden increase, forecast peak.
- Notification permission is requested only when the user enables browser notifications.
- Alert event IDs are deterministic (`locationKey:rule:dataHour`) so the same rule cannot fire twice for the same hour;
  the server additionally deduplicates by id.
- Rules are evaluated only while the app is open; this limitation is shown in the drawer, the methodology page and the
  README. No background notification infrastructure is claimed or implemented.

## AI grounding

`server/services/context.js` builds a compact context from the **already retrieved** payloads: location, provider,
dataset, measurement type, timestamps, staleness, available AQI standards, available pollutant values with units,
dominant pollutant, trend, forecast peak and a 12-hour forecast subset, best 30/60-minute windows, 24-hour and 7-day
summaries, and limitations.

`copilot.js` sends that context with a system prompt that requires the model to:

- use only the context for location-specific claims,
- name the source and measurement type,
- say when data is insufficient,
- preserve AQI standards,
- label general knowledge separately,
- avoid invented causes, diagnoses and safety guarantees.

AI features are optional. Without `GROQ_API_KEYS` (or `GROQ_API_KEY`), `/api/ai/assistant` returns a typed 503 and
`/api/ai/insights` returns rule-based insights with `source: "rules"`. Keys are read only on the server.
`GROQ_API_KEYS` accepts a comma/newline-separated pool; each request starts on the next key and falls back once through
the remaining keys on auth, rate-limit, 5xx, timeout or empty-response failures. Request timeout, token limits, rate
limits and provider error mapping are implemented server-side.

## Error handling and UX states

- Validation errors → `400` with a code and readable message.
- Provider timeout → `504`; other provider failures → `502`; both include a hint and never include secrets.
- AI disabled → `503` with a configuration reason; the UI shows an inline notice and keeps the dashboard usable.
- Unknown `/api/*` route → JSON `404`.
- Client: `Promise.allSettled` loads current/forecast/history independently, so a failed forecast does not blank the
  dashboard. Every section has loading, error and empty states; missing pollutants show “not available”.
- Stale data (current hour more than three hours old) is flagged in the AQI hero and in provenance.

## Security

- All third-party keys are server-side environment variables; no `VITE_*` secret is used.
- JSON body limit is 16 KB; comparison lists are capped at three locations; questions at 500 characters.
- Rate limits: 240 requests/minute per IP for `/api`, 12/minute for the assistant, 20/minute for insights.
- CORS is same-origin by default; `CORS_ORIGIN` can restrict cross-origin deployments.
- No authentication is implemented because the product intentionally requires no account. Profiles are anonymous and
  keyed by a random browser-generated ID.
- Map attribution is always rendered; OSM tile usage policy is documented.

## Deployment topologies

1. **Single Node service (recommended, used by `npm start`)** — Express serves `client/dist` and `/api`. No CORS.
2. **Split frontend/backend** — static client on Vercel/Netlify with `VITE_API_BASE` set at build time; Express on a Node
   host with `CORS_ORIGIN` set to the frontend origin.

## Extension points

- Additional providers: implement the same normalized series shape and add a source selector before merging data; do not
  merge observed and modelled values silently.
- Station-based AQI: requires a documented station AQI method and sufficient pollutant coverage; the current build
  intentionally shows station concentrations without assigning an AQI category.
- Heatmaps: the current layer uses labelled overlapping circles over sparse city points. A denser gridded surface may be
  added only with explicit interpolation and uncertainty labelling; never present it as measured data.
