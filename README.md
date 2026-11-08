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
| Can I ask a question? | Grounded AI assistant (optional, Groq) |

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

**Bonus / differentiators**
- **Clean Air Finder** — samples 24 modelled points around the location and ranks lower-AQI alternatives by distance
  and bearing, with a “show on map” route.
- **Best Outdoor Window** — ranks 60/120/180-minute whole-hour forecast windows by PM2.5 with a documented score,
  plus a clear “relative comparison, not a safety guarantee” disclaimer.
- **Smart Alerts** — configurable AQI, PM2.5, category-change, sudden-increase and forecast-peak rules, in-app history,
  optional browser notifications, evaluated while the app is open. Settings/history persist server-side under an
  anonymous device ID.
- **AI insights** — rule-based insights always work; when Groq is configured, grounded AI insights are used and labelled.
- **AI assistant** — server-grounded chat over the loaded current data, forecast, trend and provenance, with strict
  instructions not to invent readings, causes, diagnoses or safety claims.
- **Saved locations** — browser + server persistence (MongoDB when configured).

**Deliberately not implemented**
- Heatmap interpolation (would imply measured truth for sparse data), share cards, automated background notifications,
  user accounts/social features, custom ML forecasting and email/SMS infrastructure.

---

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + Vite, React Router, Recharts, Leaflet + React Leaflet, Lucide React |
| Styling | Vanilla CSS (design tokens, responsive layouts, white-and-teal environmental theme) |
| Backend | Node.js + Express (ES modules) |
| HTTP | Native `fetch` with timeouts and typed provider errors |
| Persistence | MongoDB (`profiles` collection) with a local JSON fallback when no URI is configured |
| AI | Groq (OpenAI-compatible chat completions), optional |
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
| `GROQ_API_KEY` | Enables the AI assistant and AI insights |
| `GROQ_MODEL` | Groq model (default `openai/gpt-oss-120b`; verify in the Groq console) |
| `OPENAQ_API_KEY` | Enables ground-level monitoring station observations |
| `MONGODB_URI` | Enables MongoDB persistence for saved locations and alerts |
| `MONGODB_DB` | Database name (default `aircue`) |
| `CACHE_TTL_MS` | Server cache TTL for upstream data (default 5 minutes) |
| `UPSTREAM_TIMEOUT_MS` | Provider timeout (default 12 seconds) |
| `CORS_ORIGIN` | Comma-separated allowed origins if frontend and API are on different domains |

Without any keys, the dashboard, map, forecast, history, comparison, Clean Air Finder, alerts, rule-based insights and
provenance all remain functional, because Open-Meteo does not require an API key.

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
| GET | `/api/air/compare?locations=lat,lon,label;…` | Up to three locations on one comparable AQI scale |
| GET | `/api/air/map?lat&lon` | Modelled city layer plus nearby OpenAQ stations when configured |
| GET | `/api/locations/search?q=` | Geocoding results |
| GET | `/api/locations/nearby?lat&lon&radius` | Clean Air Finder model samples |
| GET | `/api/alerts` | Alert settings + history for the anonymous client |
| POST | `/api/alerts` | Save alert settings |
| POST | `/api/alerts/events` | Append triggered alert events (deduplicated by id) |
| DELETE | `/api/alerts/events` | Clear alert history |
| GET/PUT | `/api/preferences` | Saved locations and last location |
| POST | `/api/ai/assistant` | Grounded question answering (503 if Groq is not configured) |
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
  │    ├─ compare / map / Clean Air Finder sampling
  │    └─ shared provenance metadata
  ├─ OpenAQ client (optional, observed stations, never merged with modelled values)
  ├─ Groq client (optional, grounded context only)
  └─ profile store (MongoDB, or local JSON fallback)
```

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
- **Alerts are honest about coverage.** They are evaluated only while the app is open; there is no background service.
- **AI explains, never measures.** The assistant receives only already-retrieved data and is instructed to say when
  data is insufficient, to preserve the AQI standard, and to avoid medical diagnosis or safety guarantees.

Full methodology is also available in-app at `/methodology`.

---

## Project structure

```text
air-cue/
├── client/
│   ├── src/
│   │   ├── charts/        Forecast and history charts
│   │   ├── components/    Dashboard, map, planner, finder, alerts, chat, shared UI
│   │   ├── context/       Location and alert state
│   │   ├── hooks/         Air-quality, nearby and insight data hooks
│   │   ├── pages/         Overview, Live Map, Trends, Compare, Health, Forecast, Assistant, Methodology
│   │   ├── services/      API client
│   │   ├── styles/        Design tokens, components, widgets
│   │   └── utils/         AQI categories/guidance and formatting
│   └── index.html
├── server/
│   ├── data/              Curated city list, local JSON store fallback (gitignored)
│   ├── middleware/        Validation, rate limiting, error handling
│   ├── routes/            Air, locations, alerts, preferences, AI
│   ├── services/          Open-Meteo, OpenAQ, air-quality builders, context, insights, store
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
- AI responses (optional): Groq, using a currently available hosted model.

## Known limitations

- Modelled grid values cannot represent street-level or indoor variation.
- CPCB AQI here is computed from modelled hourly data, not official CPCB monitoring values.
- Forecasts are projections, not guarantees; uncertainty grows with lead time.
- Clean Air Finder ranking is relative and limited to sampled model points.
- Alerts do not run while the browser is closed and are not delivered by a background notification service.
- Historical ranges and station coverage depend on provider availability.
- No visual screenshots are committed; capture them from the running app for submission materials.
