# AIR CUE — Data sources and data integrity

AIR CUE uses authentic public APIs. Every data view shows the provider, timestamp, measurement type, units and AQI
standard. Values are never fabricated, and missing readings are never replaced with zero.

---

## 1. Open-Meteo Air Quality (primary)

Docs: https://open-meteo.com/en/docs/air-quality-api · Terms: https://open-meteo.com/en/terms

**Endpoint used**

```text
GET https://air-quality-api.open-meteo.com/v1/air-quality
    ?latitude=…&longitude=…
    &timezone=auto
    &past_days=7
    &forecast_days=4
    &hourly=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide,
            us_aqi,european_aqi,
            us_aqi_pm2_5,us_aqi_pm10,us_aqi_nitrogen_dioxide,us_aqi_sulphur_dioxide,
            us_aqi_ozone,us_aqi_carbon_monoxide
```

**What AIR CUE uses it for**

- Current-hour pollutant concentrations and the provider's US/European AQI blocks.
- 48-hour hourly forecast (from the current hour forward).
- Up to seven days of modelled history, including daily aggregates computed by AIR CUE.
- Per-pollutant US AQI sub-indices, used only for dominant-pollutant attribution within the US AQI standard.
- Clean Air Finder sampling (24 nearby coordinates) and the map's modelled city layer (21 curated city centres) through a
  multi-coordinate request.

**Measurement type: modelled**

Open-Meteo's air-quality data is gridded atmospheric-composition model output (CAMS). It is **not** a reading from a
local monitoring station. Spatial resolution depends on the CAMS domain (roughly 11 km over Europe, ~40 km globally),
and values represent a grid cell, not a street address. The UI labels this as “Modelled” in the hero, every pollutant
card, the forecast, history, map popups and the provenance panel.

**Units**

| Variable | Provider unit | Display |
| --- | --- | --- |
| PM2.5, PM10, NO₂, SO₂, O₃, CO | µg/m³ | µg/m³ (CO stays in provider µg/m³) |
| US AQI, European AQI | index | index |

Provider units are normalized from the Greek mu (U+03BC) to the micro sign (U+00B5). For CPCB CO sub-indices only, the
value is converted to mg/m³ because that is how CPCB's breakpoints are defined; the card still shows µg/m³ and the
conversion is described in the methodology page.

**Caching and limits**

Responses are cached server-side for five minutes per coordinate (`CACHE_TTL_MS`). Requests include a descriptive user
agent. Review Open-Meteo's current fair-use limits, licence and attribution requirements before deployment.

---

## 2. Open-Meteo Geocoding

Docs: https://open-meteo.com/en/docs/geocoding-api

**Endpoint used**

```text
GET https://geocoding-api.open-meteo.com/v1/search?name=…&count=8&language=en&format=json
```

Returns name, region, country, country code, latitude, longitude, population, elevation and timezone.

- Searches require at least two characters; the client debounces input by ~320 ms.
- Results are cached for 24 hours.
- No reverse geocoding is implemented. When the user shares GPS coordinates, AIR CUE shows those coordinates with the
  label “My location”. It does **not** invent a nearby place name.

---

## 3. OpenAQ (optional station observations)

Docs: https://docs.openaq.org/ · API keys: https://docs.openaq.org/using-the-api/api-key

**Endpoints used**

```text
GET https://api.openaq.org/v3/locations?coordinates=lat,lon&radius=15000&limit=10
GET https://api.openaq.org/v3/locations/{id}/latest
Header: X-API-Key: $OPENAQ_API_KEY
```

**What AIR CUE uses it for**

Up to five nearest stations with recent readings, shown as a separate map layer and a station list. Readings include
parameter name, value, unit and observation timestamp where available. Sensor metadata from `/locations` maps each
`latest` measurement back to its parameter.

**What AIR CUE does not do**

- It does not compute an AQI from a single station reading, and therefore does not colour station markers by AQI.
  Station markers are labelled “STN” and show concentrations and units only.
- It does not merge station readings with the modelled grid series, average them, or use them to fill missing model
  values.
- It does not claim complete station coverage. Coverage and recency vary by city.

**Without a key**

The station layer is unavailable; the API returns a clear reason and the UI explains how to enable it. The map's modelled
city layer, Clean Air Finder and every other feature continue to work.

**Errors**

401/403 → invalid key message; 429 → rate-limit message; network failure → modelled data remains available. No provider
payload is echoed to the browser.

---

## 4. OpenStreetMap (map tiles)

Tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`

Attribution “© OpenStreetMap contributors” with a link to the copyright page is rendered permanently by Leaflet.
The public OSM tile service is used for this demo; it is not an unrestricted production tile service. High-traffic
deployments should follow the tile usage policy (https://operations.osmfoundation.org/policies/tiles/) and use a
dedicated tile provider or self-hosted tiles.

---

## 5. CPCB AQI methodology (calculation reference)

Reference: https://app.cpcbccr.com/ccr_docs/About_AQI.pdf · CPCB: https://cpcb.nic.in/

CPCB does not provide an accessible, documented API used by this project. AIR CUE therefore **computes** a CPCB AQI
from modelled hourly concentrations and labels it as computed, not official.

**Averaging requirements applied**

| Pollutant | Averaging | Minimum hours required |
| --- | --- | --- |
| PM2.5 | 24 h | 18 of 24 |
| PM10 | 24 h | 18 of 24 |
| NO₂ | 24 h | 18 of 24 |
| SO₂ | 24 h | 18 of 24 |
| CO | 8 h (breakpoints in mg/m³) | 6 of 8 |
| O₃ | 8 h | 6 of 8 |

**Validity rules**

- At least three valid pollutant sub-indices, and PM2.5 or PM10 must be among them.
- The overall AQI is the maximum valid sub-index.
- The dominant pollutant is the pollutant carrying that maximum sub-index.
- Linear interpolation between CPCB concentration breakpoints (PM2.5 0–30/30–60/60–90/90–120/120–250/250–500 µg/m³;
  PM10 0–50/50–100/100–250/250–350/350–430/430–600; NO₂ 0–40/40–80/80–180/180–280/280–400/400–800;
  SO₂ 0–40/40–80/80–380/380–800/800–1600/1600–2000; O₃ 0–50/50–100/100–168/168–208/208–748/748–1000;
  CO 0–1/1–2/2–10/10–17/17–34/34–50 mg/m³), mapped to index bands 0–50/51–100/101–200/201–300/301–400/401–500.
- If the requirements are not met, no CPCB value is displayed; the response includes a structured explanation and the
  valid sub-indices that were available.

Because the inputs are modelled rather than CPCB station data, the UI states: “Computed by AIR CUE from Open-Meteo
modelled concentrations using CPCB breakpoints. Not an official CPCB monitoring value.”

---

## 6. AIRCUE Copilot (Groq, optional AI)

Docs: https://console.groq.com/docs · OpenAI-compatible endpoint:
`POST https://api.groq.com/openai/v1/chat/completions`

- The model is configurable (`GROQ_MODEL`, default candidate `openai/gpt-oss-120b`); verify current model names,
  availability, rate limits and pricing in the Groq console before deployment.
- `GROQ_API_KEYS` accepts a comma/newline-separated key pool. Requests rotate keys, and a rejected, rate-limited,
  timed-out or failed key falls back to the next one. Keys in the same Groq organization may share limits, so this is
  a resilience feature rather than a guaranteed quota increase.
- `GROQ_MODEL` is tried first, then `GROQ_FALLBACK_MODELS` in order when the model is unavailable or its quota is
  exhausted. The current free-plan caps for the available general chat models (`openai/gpt-oss-120b`,
  `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`) are 30 RPM, 1,000 RPD, 8K TPM and 200K TPD per organization; verify the
  live values on Groq's rate-limits page because plan limits can change.
- The server sends only a compact context built from already-retrieved AIR CUE data, plus the user's question.
- Strict grounding instructions prohibit invented readings, causes, medical diagnoses and safety guarantees.
- Request timeout 25 s (assistant) / 20 s (insights), token caps, and per-IP rate limits are enforced.
- The key is server-side only. If Groq fails, the dashboard is unaffected; insights fall back to rule-based output and
  AIRCUE Copilot shows a readable error.

---

## 7. Derived features and their limits

- **Pollution heatmap** — draws overlapping translucent circles from modelled city-level US AQI values and Clean Air
  Finder samples. Colour between points is an orientation aid, not an interpolated measurement. Station observations
  are never blended into the heat layer.
- **Anomaly detection** — compares PM2.5, PM10 and US AQI with a 7-day baseline that excludes the most recent 24 hours
  (minimum 48 valid hourly values). Baseline deviation is flagged at |z| ≥ 2; rapid change requires ≥30% between the
  last two available hours plus a minimum absolute difference. Flags describe the supplied model series only and do not
  identify causes or act as health warnings.
- **Impact report and share cards** — built in the browser from the currently loaded current/history/forecast payloads.
  Both include the AQI standard, data hour, provider and measurement type, and both avoid safety guarantees. A share
  card is a snapshot, not a live-updating feed.

## Data integrity rules (implementation checklist)

1. Never invent missing measurements, station IDs, model resolutions or confidence scores.
2. Always display the data source and a timestamp (data hour + fetch time).
3. Distinguish observed, modelled and forecast values in the UI.
4. Always identify the AQI standard used.
5. Never combine incompatible AQI standards in one ranking or comparison.
6. Never replace missing pollutant values with zero.
7. Withhold derived metrics (CPCB AQI, percentage change, outdoor recommendation) when their input requirements are not
   met.
8. Keep raw provider fields available in API payloads for traceability/debugging.
9. Prefer an explicit limitation over an invented “trust score”.
10. Never state that air is safe or that an activity is risk-free.

## Attribution summary

- Air-quality and forecast data: Open-Meteo (CAMS-based model data).
- Geocoding: Open-Meteo Geocoding.
- Station observations: OpenAQ (when configured).
- Map tiles: © OpenStreetMap contributors.
- AQI methodology: CPCB India (calculation reference).
- AI responses: Groq (when configured).

Check each provider's current terms, licence, attribution and rate-limit requirements before deployment.
