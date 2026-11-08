# AIR CUE

**Real-time air quality intelligence platform**
_Know the air. Make smarter decisions._

AIR CUE turns public air-quality data into understandable, location-aware decisions. Instead of stopping at an AQI
number, it explains which pollutant is driving conditions, how the trend is changing, when the forecast looks
comparatively cleaner, where nearby air may be better, and when to plan time outdoors — while always showing the
source, timestamp, AQI standard and measurement type.

Built for the **Let’s Code Diwali Challenge 2026** (Breathe Better).

---

## The problem and the approach

Most air-quality apps answer “what is the AQI?”. AIR CUE also answers:

| Question | Feature |
| --- | --- |
| What is happening? | Live AQI dashboard with pollutant breakdown and health guidance |
| Which pollutant is responsible? | Dominant-pollutant attribution supported by CPCB or provider sub-indices |
| How is it changing? | 24-hour and 7-day modelled history with valid comparisons |
| What is coming? | 24–48 hour hourly forecast, peaks and daily summaries |
| When should I go outside? | Best Outdoor Window ranked from forecast PM2.5 |
| Is it better nearby? | Clean Air Finder samples the model around the selected location |
| Where is it happening? | Live Leaflet map with modelled cities and optional OpenAQ stations |
| What should I do? | Health & Safety page with non-diagnostic guidance and precautions |
| Can I ask a question? | AIRCUE Copilot (optional, Groq), by text or microphone |
| Can I hear the answer? | Optional spoken Copilot replies in supported browsers |
| How do nearby cities compare? | Pollution leaderboard ranked by modelled US AQI |

---

## Implemented features

**Mandatory**
- Responsive live AQI dashboard with a large colour-coded gauge, category, timestamps and data-type badges.
- Location search (geocoding), current-location selection and saved locations.
- Pollutant cards for PM2.5, PM10, CO, NO₂, SO₂ and O₃. Missing values are shown as **not available**, never zero.
- Explicit AQI standard switching between **CPCB AQI (India)**, **US EPA AQI** and **European AQI**.
- Health & Safety page: category guidance, sensitive groups, outdoor activity, mask guidance and precautions.
- Interactive Leaflet map: modelled city markers, click-to-pick points, OpenAQ station layer when configured,
  explicit attribution and separate marker types for observed vs modelled data.
- Historical Trends page: 24-hour and 7-day charts, daily aggregates, highest/lowest periods and change comparisons.
- Location Comparison: two or three locations on the same provider, measurement type and AQI scale, with an explicit
  note when a CPCB comparison is not possible for every location.
- Forecast page: hourly chart with metric selector, current-hour marker, forecast badges, daily summaries and peaks.
- Data provenance panel on every data view, listing provider, dataset, measurement type, timestamps, spatial
  resolution, AQI standards and known limitations.

**Bonus features — 13/13 implemented**
| # | Feature | What it does |
| --- | --- | --- |
| 1 | AI AQI Assistant | AIRCUE Copilot answers grounded questions over the loaded current reading, forecast, trend and provenance. |
| 2 | Smart Pollution Alerts | Configurable AQI, PM2.5, category-change, sudden-increase and forecast-peak rules with in-app history; evaluated while the app is open. |
| 3 | ML-Based AQI Prediction | Per-location ridge autoregression over recent hourly modelled history, with a 24-hour recursive prediction, uncertainty range and holdout MAE/RMSE. |
| 4 | Pollution Heatmap | Optional map heat field built from modelled US AQI city points and Clean Air Finder samples, labelled as interpolated for orientation. |
| 5 | Location-Based AQI | Geocoded search, current-location selection, saved locations, click-to-pick map points and one consistent location across pages. |
| 6 | Clean Air Finder | Samples 24 modelled points around the location and ranks lower-AQI alternatives by distance and bearing, with a “show on map” route. |
| 7 | Shareable AQI Cards | Locally rendered PNG with location, AQI, category, pollutants, standard, source and timestamp, plus a copyable caption and native share. |
| 8 | Pollution Impact Report | Printable one-page report with current status, health guidance, historical trends, forecast expectations and provenance, plus JSON export. |
| 9 | Pollution Leaderboard | Ranks nearby modelled city samples by provider US AQI, worst first, with PM2.5 and a one-click route into that location’s dashboard. |
| 10 | Voice Assistant | Microphone input and optional spoken replies in the Copilot using the browser Web Speech API, with a text-only fallback. |
| 11 | Anomaly Detection | Seven-day z-score baseline and rapid-change flags for PM2.5, PM10 and US AQI, with statistical caveats and no claims about causes. |
| 12 | Multi-API Integration | Open-Meteo air quality, forecast and geocoding; optional OpenAQ station observations; OpenStreetMap tiles; all sources kept distinct. |
| 13 | AI-Powered Pollution Insights | Rule-based insights always work; when Groq is configured, grounded AIRCUE Copilot insights are used and labelled. |

- **Best Outdoor Window** also ranks 60/120/180-minute whole-hour forecast windows by PM2.5 with a documented score
  and a clear “relative comparison, not a safety guarantee” disclaimer.
- **Saved locations** — browser + server persistence (MongoDB when configured).

**Deliberately not implemented**
- Automated background notifications, user accounts/social features, station-level AQI, official CPCB feed ingestion,
  pretrained or regional ML models beyond the experimental per-location ridge model, and email/SMS infrastructure.

---

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + Vite, React Router, Recharts, Leaflet + React Leaflet, Lucide React |
| Styling | Vanilla CSS (design tokens, responsive layouts, white-and-teal environmental theme) |
| Backend | Node.js + Express (ES modules) |
| HTTP | Native `fetch` with timeouts and typed provider errors |
| Persistence | MongoDB (`profiles` collection) with a local JSON fallback when no URI is configured |
| AI | AIRCUE Copilot on Groq (OpenAI-compatible chat completions), optional |
| Prediction | Server-side ridge autoregression trained per location from recent modelled hourly data (no external model or key) |
| Voice | Browser Web Speech API for recognition and synthesis, optional; no audio stored by AIR CUE |
| External data | Open-Meteo Air Quality, Open-Meteo Geocoding, OpenAQ (optional), OpenStreetMap tiles |

---

## Quick start

Requirements: Node.js 20.19+ (developed on Node 24) and npm.

```bash
npm install
cp .env.example .env      # optional; every key is optional
npm run dev               # API on :5000, Vite on :5173
```

Open http://localhost:5173.

Production build (Express serves the built client):

```bash
npm run build
npm start                 # http://localhost:5000
```

`npm run preview` builds and starts the production server in one step.

### Environment variables

Copy `.env.example` to `.env`. All integrations are optional:

| Variable | Purpose |
| --- | --- |
| `PORT` | API/production server port (default `5000`) |
| `GROQ_API_KEY` | Enables AIRCUE Copilot chat and insights |
| `GROQ_MODEL` | Groq model (default `openai/gpt-oss-120b`; verify in the Groq console) |
| `OPENAQ_API_KEY` | Enables ground-level monitoring station observations |
| `MONGODB_URI` | Enables MongoDB persistence for saved locations and alerts |
| `MONGODB_DB` | Database name (default `aircue`) |
| `CACHE_TTL_MS` | Server cache TTL for upstream data (default 5 minutes) |
| `UPSTREAM_TIMEOUT_MS` | Provider timeout (default 12 seconds) |
| `CORS_ORIGIN` | Comma-separated allowed origins if frontend and API are on different domains |

Without any keys, the dashboard, map, forecast, history, comparison, Clean Air Finder, alerts, leaderboard, ML
prediction, rule-based insights, voice (browser-dependent) and provenance all remain functional, because Open-Meteo
does not require an API key and the prediction model runs locally on the server.

**Secrets stay server-side.** No provider key is exposed through `VITE_*` variables or shipped to the browser.

### MongoDB (optional)

The server uses MongoDB for saved locations and alert configuration/history when `MONGODB_URI` is set. It creates a
`profiles` collection keyed by an anonymous client ID (no accounts, no personal profiles). Without a URI, the same
interface uses `server/data/store.json` (gitignored) so the app still works locally.

To set up a free Atlas cluster:
1. Create a free M0 cluster at https://www.mongodb.com/products/platform/atlas-database.
2. Add a database user and allow your IP (or `0.0.0.0/0` for local development only).
3. Copy the Node.js driver connection string into `MONGODB_URI` in `.env`.

---

## API routes

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/health` | Version, configured features and persistence mode (no secrets) |
| GET | `/api/air/current?lat&lon&name&countryCode&timezone` | Current hour, pollutant cards, all AQI blocks, dominant pollutant, trend, provenance |
| GET | `/api/air/forecast?lat&lon` | 48 hourly forecast values, daily aggregates, ranked outdoor windows |
| GET | `/api/air/history?lat&lon` | 24-hour and 7-day modelled history, daily aggregates, change comparison |
| GET | `/api/air/prediction?lat&lon` | Experimental per-location ridge-autoregression prediction: 24 hourly US AQI/PM2.5 values, uncertainty range, holdout MAE/RMSE and persistence baseline |
| GET | `/api/air/compare?locations=lat,lon,label;…` | Up to three locations on one comparable AQI scale |
| GET | `/api/air/map?lat&lon` | Modelled city layer plus nearby OpenAQ stations when configured |
| GET | `/api/locations/search?q=` | Geocoding results |
| GET | `/api/locations/nearby?lat&lon&radius` | Clean Air Finder model samples |
| GET | `/api/alerts` | Alert settings + history for the anonymous client |
| POST | `/api/alerts` | Save alert settings |
| POST | `/api/alerts/events` | Append triggered alert events (deduplicated by id) |
| DELETE | `/api/alerts/events` | Clear alert history |
| GET/PUT | `/api/preferences` | Saved locations and last location |
| POST | `/api/ai/assistant` | AIRCUE Copilot grounded answering (503 if Groq is not configured) |
| POST | `/api/ai/insights` | AI insights when configured, rule-based fallback otherwise |

All data endpoints return source and provenance metadata. Provider failures return typed errors with a readable
message; the UI renders partial failures without discarding sections that loaded successfully.

---

## Architecture

```text
React client (Vite)
  │  /api/*  (X-Client-Id for anonymous preferences)
  ▼
Express API
  ├─ validation + rate limiting
  ├─ Open-Meteo client (single cached hourly fetch per coordinate)
  │    ├─ current payload  ← CPCB computation, US/EU provider blocks, trend
  │    ├─ forecast payload ← 48 h + daily aggregates + outdoor-window scoring
  │    ├─ history payload  ← 24 h / 7 d aggregates + valid change comparisons
  │    ├─ prediction       ← per-location ridge model, 24 h recursive forecast, holdout metrics
  │    ├─ compare / map / Clean Air Finder sampling
  │    └─ shared provenance metadata
  ├─ OpenAQ client (optional, observed stations, never merged with modelled values)
  ├─ AIRCUE Copilot client (Groq, optional, grounded context only)
  └─ profile store (MongoDB, or local JSON fallback)
```

Voice input and spoken replies run in the browser through the Web Speech API; no audio is sent to AIR CUE.

More detail: [`docs/architecture.md`](docs/architecture.md) · data sources and integrity rules:
[`docs/data-sources.md`](docs/data-sources.md).

---

## Data integrity decisions

- **Modelled ≠ observed.** Open-Meteo values are gridded CAMS model output, not monitoring-station readings. Every
  data view labels this. OpenAQ station observations appear in a separate layer with their own timestamps and units.
- **CPCB AQI is computed, not official.** AIR CUE only calculates a CPCB AQI when its validity requirements are met:
  at least three valid pollutants including PM2.5 or PM10, 24-hour averaging for PM2.5/PM10/NO₂/SO₂/CO, 8-hour for O₃.
  The overall AQI is the highest valid sub-index. Otherwise the value is withheld and the reason shown.
- **Standards are never mixed.** US and European AQI are provider-computed and separately labelled; no US value is
  presented as CPCB AQI, and Clean Air Finder/comparison use one standard per ranking.
- **Missing data stays missing.** No zero substitution, no invented station IDs, model resolutions or confidence scores.
- **Forecasts are labelled.** Current, forecast and historical (modelled) values are visually and textually distinct.
- **Prediction is experimental.** The ridge model is trained per location from modelled history and is never presented as
  a measurement or official forecast. Its holdout MAE/RMSE and the persistence baseline are shown; when persistence
  scores better, the UI says so instead of claiming an improvement.
- **The leaderboard uses one scale.** Only nearby city samples with a valid provider US AQI are ranked. These are
  modelled grid samples, not monitoring stations, and the ranking is relative information rather than a safety claim.
- **Voice stays in the browser.** Speech recognition and synthesis use the browser Web Speech API. AIR CUE does not
  record or store audio; unsupported browsers fall back to the text composer.
- **Alerts are honest about coverage.** They are evaluated only while the app is open; there is no background service.
- **AIRCUE Copilot explains, never measures.** The Copilot receives only already-retrieved data and is instructed
  to say when data is insufficient, to preserve the AQI standard, and to avoid medical diagnosis or safety guarantees.

Full methodology is also available in-app at `/methodology`.

---

## Project structure

```text
air-cue/
├── client/
│   ├── src/
│   │   ├── charts/        Forecast and history charts
│   │   ├── components/    Dashboard, map, planner, finder, alerts, chat/voice, prediction, leaderboard, shared UI
│   │   ├── context/       Location and alert state
│   │   ├── hooks/         Air-quality, nearby, anomaly, prediction and insight data hooks
│   │   ├── pages/         Overview, Live Map, Trends, Compare, Health, Forecast, Assistant, Report, Methodology
│   │   ├── services/      API client
│   │   ├── styles/        Design tokens, components, widgets
│   │   └── utils/         AQI categories/guidance and formatting
│   └── index.html
├── server/
│   ├── data/              Curated city list, local JSON store fallback (gitignored)
│   ├── middleware/        Validation, rate limiting, error handling
│   ├── routes/            Air, locations, alerts, preferences, AI
│   ├── services/          Open-Meteo, OpenAQ, air-quality builders, prediction, context, insights, store
│   ├── utils/             AQI/CPCB logic, caching, HTTP, window scoring
│   └── server.js
├── docs/
│   ├── architecture.md
│   └── data-sources.md
├── .env.example
└── README.md
```

---

## Deployment

Single-service deployment (recommended): build the client, then run the Node server on any Node host (Render,
Railway, Fly.io, a VPS). Express serves `client/dist` and the API from the same origin, so no CORS configuration is
needed.

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

Split deployment: host `client` on Vercel/Netlify with `VITE_API_BASE=https://your-api.example.com`, and the `server`
on a Node host with `CORS_ORIGIN=https://your-frontend.example.com`. Set `VITE_API_BASE` at build time.

Before publishing, review provider terms, rate limits and attribution requirements (see the methodology page). Public
OpenStreetMap tile servers are used for the demo map and are not an unrestricted production tile service.

---

## Attribution

- Air-quality and forecast data: [Open-Meteo](https://open-meteo.com/) (CAMS-based model data), CC BY 4.0 per provider terms.
- Geocoding: [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api).
- Station observations (optional): [OpenAQ](https://openaq.org/).
- Map tiles: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- AQI methodology reference: [CPCB AQI](https://app.cpcbccr.com/ccr_docs/About_AQI.pdf).
- AIRCUE Copilot responses (optional): Groq, using a currently available hosted model.

## Known limitations

- Modelled grid values cannot represent street-level or indoor variation.
- CPCB AQI here is computed from modelled hourly data, not official CPCB monitoring values.
- Forecasts are projections, not guarantees; uncertainty grows with lead time.
- Clean Air Finder ranking is relative and limited to sampled model points.
- Alerts do not run while the browser is closed and are not delivered by a background notification service.
- Historical ranges and station coverage depend on provider availability.
- The ML prediction is a per-location ridge model; on very smooth series the persistence baseline can score better,
  which the UI discloses alongside the holdout error.
- Voice input/output requires a browser with the Web Speech API (notably Chrome or Edge) and microphone permission;
  other browsers retain the text-only Copilot.
- The pollution leaderboard ranks modelled city-grid samples only; it is not a station-level ranking.
- No visual screenshots are committed; capture them from the running app for submission materials.
