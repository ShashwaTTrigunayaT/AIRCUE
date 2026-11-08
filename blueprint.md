# AIR CUE
### Real-Time Air Quality Intelligence Platform
**Tagline:** Don't just check the air. Know when, where, and how to breathe better.

---

# 1. Project Vision

AIR CUE is a real-time air quality intelligence platform that helps people understand pollution levels, identify safer places, and make healthier everyday decisions.

Instead of simply displaying AQI numbers, AIR CUE converts air-quality data into actionable recommendations.

Users can:
- Monitor real-time air quality.
- Explore pollution levels across different locations.
- Track historical pollution trends.
- Compare cities and locations.
- Understand health risks associated with pollution.
- View future AQI predictions.
- Discover cleaner places nearby.
- Identify the best time to go outdoors.
- Receive intelligent pollution alerts.

**Core idea:** Transform air-quality data into decisions that improve everyday life.

# 2. Core Features — Mandatory

## 2.1 Live AQI Dashboard

Display the current air quality for the user's selected location.

Information:
- Current AQI.
- AQI category and health interpretation.
- PM2.5 and PM10.
- Carbon monoxide (CO).
- Nitrogen dioxide (NO₂).
- Sulphur dioxide (SO₂).
- Ozone (O₃).
- Last updated timestamp.

UI:
- Large AQI indicator.
- Colour-coded air-quality status.
- Pollutant cards.
- Health recommendation.
- Current location information.

Important: Clearly identify whether the displayed value is observed, modelled, or forecast data.

## 2.2 Interactive Air Quality Map

Build an interactive map showing air quality across different locations.

Features:
- Map with AQI markers.
- Colour-coded pollution levels.
- Location search.
- Clickable location markers.
- Detailed AQI information on selection.
- City-level pollution exploration.

Use Leaflet with OpenStreetMap tiles.

## 2.3 Historical Pollution Tracker

Allow users to understand how air quality changes over time.

Features:
- Historical AQI trends.
- PM2.5 and PM10 charts.
- Daily and weekly views.
- Pollution trend analysis.
- Highest and lowest pollution periods.

Use interactive charts to make the information easy to understand.

## 2.4 Location Comparison

Allow users to compare two or more locations.

Compare:
- AQI.
- PM2.5.
- PM10.
- Other available pollutants.
- Historical pollution trends.
- Health-risk categories.

Display comparisons using charts and visual indicators.

## 2.5 Health & Safety Dashboard

Translate pollution measurements into understandable health information.

Features:
- Health implications of current AQI.
- Recommendations for sensitive groups.
- Outdoor activity guidance.
- Mask recommendations where appropriate.
- Precautions for high-pollution conditions.

Avoid presenting general recommendations as personalized medical advice.

## 2.6 AQI Forecast

Show upcoming air-quality conditions.

Features:
- Hourly AQI forecast.
- Daily pollution trends.
- Predicted pollutant concentrations.
- Expected pollution peaks.
- Recommended outdoor activity windows.

Clearly distinguish forecasts from real-time observations.

---

# 3. Bonus Features — Innovation Opportunities

## Priority 1: High-Impact Features

### 3.1 AI AQI Assistant

An AI-powered assistant that explains air quality in natural language.

Example questions:
- Why is the AQI so high today?
- Is it safe to exercise outside?
- Which nearby location has cleaner air?
- What precautions should I take?
- When will pollution levels improve?

The assistant should use actual retrieved AQI data as context.

Use Groq API for natural-language responses.

**Important:** AI must explain and interpret actual data. It must never invent AQI values, pollutant measurements, or forecasts.

### 3.2 Smart Pollution Alerts

Notify users when:
- AQI crosses a specified threshold.
- Pollution suddenly increases.
- PM2.5 becomes unusually high.
- Forecasted conditions become unhealthy.

Allow users to configure alert thresholds.

### 3.3 Clean Air Finder

A standout feature.

Help users discover cleaner locations around them.

Features:
- Find nearby locations with lower AQI.
- Rank locations by air quality.
- Display distance and AQI.
- Show cleaner alternatives on the map.

Example:

Instead of simply telling users that their current AQI is 180, AIR CUE can show that another nearby location has significantly better air quality.

Only compare locations with sufficiently recent and comparable data.

### 3.4 Best Outdoor Window

Recommend the best upcoming time for outdoor activities based on forecasted pollution levels.

Examples:
- Best time for walking.
- Best time for cycling.
- Better outdoor exercise windows.

Show the forecast data supporting each recommendation.

---

## Priority 2: Additional Differentiators

### 3.5 AI Pollution Insights

Automatically generate understandable insights.

Examples:
- Pollution increased compared with yesterday.
- PM2.5 is the dominant pollutant.
- Evening pollution is expected to be higher.
- Current conditions are unsuitable for strenuous outdoor exercise.

### 3.6 Pollution Heatmap

Display pollution intensity across geographical areas.

Use a colour gradient to represent different pollution levels.

### 3.7 Pollution Impact Report

Generate a simple report containing:
- Current pollution status.
- Historical trends.
- Dominant pollutants.
- Health implications.
- Recommended precautions.

### 3.8 Shareable AQI Cards

Allow users to share attractive AQI cards containing:
- Location.
- AQI.
- Pollution category.
- Important health recommendation.

### 3.9 Anomaly Detection

Identify unusual changes in pollution measurements.

Examples:
- Sudden PM2.5 spike.
- Unexpected AQI increase.
- Unusual pollution patterns.

### 3.10 Multi-Source Data Integration

Use multiple reliable data sources where available.

Display source information and avoid treating measurements from different sources as directly interchangeable.

---

# 4. Recommended Technology Stack

## Frontend

- React.js
- Vite
- Vanilla CSS
- Recharts
- Leaflet
- React Leaflet
- Axios

## Backend

- Node.js
- Express.js

## Database

- MongoDB

Use MongoDB for:
- User preferences.
- Saved locations.
- Alert configurations.
- Historical snapshots where appropriate.

Do not unnecessarily store data that can be retrieved directly from public APIs.

## AI Integration

- Groq API
- A supported Groq model.

Use AI for:
- Natural-language AQI explanations.
- Contextual recommendations.
- Pollution insights.

Do not use AI to calculate or fabricate actual environmental measurements.

---

# 5. API Integration Strategy

## 5.1 Open-Meteo Air Quality API

Primary source for:
- Current air-quality information.
- Hourly air-quality information.
- Forecast data.
- Historical air-quality information where supported.
- Pollutant concentrations.

Documentation:
https://open-meteo.com/en/docs/air-quality-api

## 5.2 OpenAQ API

Use for available ground-level air-quality monitoring observations.

Potential information:
- Monitoring stations.
- Measurement locations.
- Pollutant observations.
- Measurement timestamps.

Documentation:
https://docs.openaq.org/

## 5.3 Open-Meteo Geocoding API

Use for converting location names into geographical coordinates.

Documentation:
https://open-meteo.com/en/docs/geocoding-api

## 5.4 OpenStreetMap

Use for geographical map visualization through Leaflet.

Documentation:
https://www.openstreetmap.org/

## 5.5 CPCB Data

Explore official Indian air-quality data sources where access and API availability permit.

Website:
https://cpcb.nic.in/

**Data integrity rules:**

1. Never invent missing measurements.
2. Display the data source.
3. Display timestamps.
4. Distinguish observed, modelled, and forecast values.
5. Clearly identify the AQI standard being used.
6. Do not combine incompatible AQI standards without conversion.
7. Handle unavailable data gracefully.

---

# 6. System Architecture

```text
                    USER
                      |
                      v
              REACT FRONTEND
                      |
          -------------------------
          |           |           |
          v           v           v
       Dashboard     Map       Analytics
          |           |           |
          -------------------------
                      |
                      v
               EXPRESS BACKEND
                      |
       -------------------------------
       |              |              |
       v              v              v
   Air Quality     Geocoding       Groq AI
      APIs            API           API
       |
       v
    DATA PROCESSING
       |
       v
  NORMALIZATION AND
   AQI INTERPRETATION
       |
       v
   RESPONSE TO FRONTEND
```

## Suggested Backend Routes

```text
GET /api/air/current
GET /api/air/forecast
GET /api/air/history
GET /api/air/compare
GET /api/air/map
GET /api/locations/search
GET /api/locations/nearby
POST /api/ai/assistant
POST /api/alerts
GET /api/alerts
```

Keep API keys and external service credentials on the backend.

---

# 7. UI/UX Design Strategy

AIR CUE should look like a polished environmental intelligence dashboard, not a basic weather application.

## Design Direction

- Modern, premium dashboard.
- Clean typography.
- Spacious layouts.
- Strong visual hierarchy.
- Smooth transitions.
- Responsive design.
- Consistent colour-coded AQI indicators.

## Suggested Colour System

| AQI Category | Suggested Colour |
|---|---|
| Good | Green |
| Satisfactory | Light Green |
| Moderate | Yellow |
| Poor | Orange |
| Very Poor | Red |
| Severe | Dark Red |

Use the category labels and thresholds corresponding to the AQI standard selected by the application.

## Main Navigation

1. Overview
2. Live Map
3. Historical Trends
4. Compare Locations
5. Health & Safety
6. Forecast
7. AI Assistant

## Dashboard Layout

### Top Section
- AIR CUE branding.
- Location selector.
- Search.
- Notifications.
- User profile.

### Main AQI Section
- Large AQI number.
- Current air-quality category.
- Health recommendation.
- Last updated timestamp.

### Pollutant Section
- PM2.5.
- PM10.
- CO.
- NO₂.
- SO₂.
- O₃.

### Analytics Section
- Historical pollution chart.
- Forecast chart.
- Pollution trend indicators.

### Intelligence Section
- AI-generated insights.
- Best outdoor window.
- Nearby cleaner locations.

---

# 8. Development Prioritization

Build in the following order.

## Phase 1 — Foundation

- Create React + Vite application.
- Set up Express backend.
- Configure API integration.
- Implement location search.
- Build the basic dashboard.

## Phase 2 — Mandatory Features

- Live AQI dashboard.
- Interactive air-quality map.
- Historical pollution tracker.
- Location comparison.
- Health and safety dashboard.
- AQI forecast.

## Phase 3 — Differentiation

- AI AQI Assistant.
- Smart pollution alerts.
- Clean Air Finder.
- Best Outdoor Window.
- AI pollution insights.

## Phase 4 — Polish

- Responsive design.
- Loading states.
- Error handling.
- Empty states.
- API failure handling.
- Data-source labels.
- Improved charts.
- Deployment.

## Phase 5 — Submission

- Test the complete application.
- Verify every feature.
- Prepare screenshots.
- Record the demonstration video.
- Deploy the application.
- Verify the final submission links.

---

# 9. What Will Make AIR CUE Stand Out?

Many air-quality applications simply display AQI values.

AIR CUE should focus on answering five practical questions:

1. **What is happening?** — Live AQI dashboard.
2. **Where is it happening?** — Interactive pollution map.
3. **How is it changing?** — Historical analytics.
4. **What should I do?** — Health and safety recommendations.
5. **What should I do next?** — AI insights, Clean Air Finder, and Best Outdoor Window.

The strongest differentiator is turning environmental measurements into actionable decisions.

## Three Features to Perfect

If development time becomes limited, prioritize these:

### 1. Clean Air Finder
A practical feature that helps users discover cleaner nearby alternatives.

### 2. Best Outdoor Window
A useful forecast-based recommendation that answers when outdoor activities may be safer.

### 3. AI AQI Assistant
An interactive experience that makes technical pollution information understandable.

These features should work with actual API data, not fabricated examples.

---

# 10. Judging Strategy

Use the following judging criteria as the project optimization framework.

| Criteria | Weight |
|---|---:|
| Functionality | 25% |
| API Integration & Data Accuracy | 20% |
| UI/UX | 15% |
| Real-World Impact | 15% |
| Innovation | 10% |
| Bonus Features | 10% |
| Documentation & Deployment | 5% |
| **Total** | **100%** |

## How to Maximize Each Category

**Functionality — 25%**
- Implement all mandatory features.
- Ensure every major section works.
- Avoid dead buttons and incomplete pages.

**API Integration & Data Accuracy — 20%**
- Use genuine API responses.
- Show data sources and timestamps.
- Handle API failures.
- Clearly distinguish forecasts from observations.

**UI/UX — 15%**
- Build a visually polished dashboard.
- Make navigation intuitive.
- Ensure responsive layouts.
- Use meaningful charts and visual indicators.

**Real-World Impact — 15%**
- Explain health implications.
- Provide useful precautions.
- Help users find cleaner locations.
- Recommend better outdoor activity windows.

**Innovation — 10%**
- Build intelligent, context-aware features.
- Focus on actionable recommendations rather than displaying numbers alone.

**Bonus Features — 10%**
- Prioritize the AI Assistant, Smart Alerts, Clean Air Finder, and Best Outdoor Window.

**Documentation & Deployment — 5%**
- Maintain a clear README.
- Provide setup instructions.
- Deploy the application.
- Include API documentation and screenshots.

---

# 11. Demonstration Video Strategy

Keep the demonstration focused and demonstrate working features rather than spending too much time explaining the technology.

## Suggested 2–3 Minute Demo

### 0:00–0:20 — Introduction

Introduce AIR CUE and the problem it solves.

### 0:20–0:45 — Live AQI Dashboard

Show:
- Current AQI.
- Pollutant measurements.
- Health status.

### 0:45–1:10 — Interactive Map

Demonstrate:
- Location search.
- Pollution markers.
- Location selection.

### 1:10–1:35 — Historical Trends and Forecast

Show:
- Historical pollution charts.
- Forecast information.
- Pollution patterns.

### 1:35–2:00 — Clean Air Finder

Demonstrate how users can identify cleaner nearby locations.

### 2:00–2:25 — AI Assistant

Ask a practical question and demonstrate a data-grounded response.

### 2:25–2:45 — Closing

Summarize the impact:

**AIR CUE doesn't just tell people how polluted the air is. It helps them decide what to do about it.**

---

# 12. Final Quality Checklist

## Functionality
- [ ] Live AQI works.
- [ ] Map works.
- [ ] Historical charts work.
- [ ] Location comparison works.
- [ ] Health dashboard works.
- [ ] Forecast works.

## Bonus Features
- [ ] AI Assistant works.
- [ ] Smart Alerts work.
- [ ] Clean Air Finder works.
- [ ] Best Outdoor Window works.
- [ ] AI insights are grounded in actual data.

## Data Quality
- [ ] API data is genuine.
- [ ] Timestamps are displayed.
- [ ] Data sources are identified.
- [ ] AQI standard is clearly stated.
- [ ] Missing data is handled.
- [ ] Observations and forecasts are distinguished.

## UI/UX
- [ ] Modern dashboard.
- [ ] Responsive design.
- [ ] Consistent AQI colours.
- [ ] Interactive charts.
- [ ] Good loading states.
- [ ] Good error states.

## Submission
- [ ] Application deployed.
- [ ] GitHub repository ready.
- [ ] README completed.
- [ ] Screenshots prepared.
- [ ] Demonstration video recorded.
- [ ] All submission links tested.

---

# FINAL PRODUCT POSITIONING

## AIR CUE
### Breathe Smarter. Live Better.

**From air-quality data to everyday decisions.**

AIR CUE is an intelligent air-quality platform that combines real-time environmental data, interactive geographical insights, historical analytics, forecasting, and AI-powered recommendations to help people make better decisions about their health and outdoor activities.

**Our goal is simple: Don't just measure pollution. Help people respond to it.**