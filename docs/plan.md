# Data Center Siting & Power Tool — Implementation Plan

## Context

AI is driving a surge in European data center demand. The binding constraint is electricity — grid capacity, power cost, carbon intensity, and connectivity must all be evaluated together. This tool helps data center companies and energy consultants make siting and power decisions faster and more intelligently. It combines real open datasets with an AI explanation layer to turn multi-day analyst work into a self-service tool.

---

## Architecture

**3-layer sandwich:**
- **Frontend** — React + TypeScript (what the user sees)
- **Backend** — FastAPI / Python (business logic + AI layer)
- **Data Layer** — local files + external APIs (what the system knows)

**Key principle:** Each layer talks only to the layer next to it. Frontend never touches data files. Backend never renders UI.

```
┌─────────────────────────────────────────┐
│              Frontend (React)            │
│  - Interactive Map (MapLibre)            │
│  - Recommender UI (form + results)       │
│  - Power Planner UI (inputs + charts)    │
└────────────────────┬────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────┐
│           Backend (FastAPI)              │
│  - /api/map-data  → GeoJSON layers      │
│  - /api/recommend → scoring engine      │
│  - /api/plan      → optimization engine │
└────────┬─────────────────┬──────────────┘
         │                 │
┌────────▼──────┐  ┌───────▼──────────────┐
│  Data Layer   │  │   AI Layer (Claude)   │
│  - Ember CSV  │  │   - Trade-off explain │
│  - PyPSA .nc  │  │   - Power mix narrate │
│  - OSM API    │  └──────────────────────┘
│  - ITU data   │
└───────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Map | MapLibre GL JS |
| Charts | Recharts |
| Backend | FastAPI (Python) |
| Data processing | Pandas + GeoPandas |
| Grid network | PyPSA |
| AI explanation | Claude API (claude-sonnet-4-6) |
| Styling | Tailwind CSS |

---

## Project Structure

```
where/
├── docs/
│   └── plan.md                 # This file
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/            # MapLibre map + layer controls
│   │   │   ├── Recommender/    # Location recommender form + results
│   │   │   └── Planner/        # Power supply planner form + charts
│   │   ├── pages/
│   │   │   ├── MapPage.tsx
│   │   │   ├── RecommenderPage.tsx
│   │   │   └── PlannerPage.tsx
│   │   ├── api/                # HTTP client functions
│   │   └── App.tsx
│   └── package.json
│
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── routers/
│   │   ├── map.py              # /api/map-data endpoints
│   │   ├── recommend.py        # /api/recommend endpoint
│   │   └── plan.py             # /api/plan endpoint
│   ├── services/
│   │   ├── data_loader.py      # Load + cache all datasets at startup
│   │   ├── scorer.py           # Country scoring engine
│   │   ├── optimizer.py        # Power mix optimization
│   │   └── explainer.py        # Claude API integration
│   ├── data/                   # Local data files (Ember CSVs, etc.)
│   └── requirements.txt
```

---

## Data Sources & Integration

| Data | Source | How we use it |
|---|---|---|
| Power prices | Ember CSV | Load at startup, cache in memory |
| Carbon intensity | Ember CSV | Load at startup, cache in memory |
| Grid congestion | Ember Grids report | Manual extraction → static JSON |
| Existing data centers | OSM Overpass API | Fetch once, save locally as GeoJSON |
| Fibre connectivity | ITU BBmaps | Static country-level scores |
| Grid network | PyPSA-Eur (Zenodo) | Load at startup (heavy, load once) |
| PUE + load factor | IEA constants | Hardcoded: PUE=1.4, load_factor=0.7 |

---

## Build Order (3 Phases)

### Phase 1: Foundation + Map Overlay
**Goal:** Get data loading and visible on a map. This is the visual foundation.

1. Set up project structure (frontend + backend folders)
2. Install all dependencies
3. Build `data_loader.py` — load Ember prices, carbon, congestion data
4. Build `/api/map-data` endpoints — serve GeoJSON layers
5. Build MapLibre map in React with toggleable layers:
   - Power prices (color gradient by country)
   - Carbon intensity (color gradient)
   - Grid congestion (green / amber / red)
   - Existing data centers (dots)
6. Click a country → popup showing all metrics

**Done when:** Map renders with all layers, country click shows real data.

---

### Phase 2: Location Recommender
**Goal:** User inputs MW + priorities, gets ranked locations with AI explanation.

1. Build `scorer.py`:
   - Input: MW size + priority weights (cost, carbon, congestion, connectivity)
   - Apply IEA formula: `grid_demand = MW × PUE (1.4)`
   - Score each country 0–100 across all factors
   - Weighted sum → final score → ranked list
2. Build `explainer.py`:
   - Takes top 5 scored countries + their raw metrics
   - Calls Claude API to generate plain-English trade-off explanation
3. Build `/api/recommend` endpoint
4. Build Recommender UI in React:
   - Form: MW input + priority sliders (cost / carbon / connectivity)
   - Results: ranked cards with score breakdown + AI explanation
   - Map pins for top results

**Done when:** User enters 100MW, gets ranked list of European countries with explanation.

---

### Phase 3: Power Supply Planner
**Goal:** User picks a location, gets optimized power mix (spot / PPA / on-site).

1. Build `optimizer.py`:
   - Input: location, MW demand, carbon target %, contract years
   - Model 3 supply options: spot market, PPA, on-site generation
   - Run cost + carbon projections across different mixes
   - Return optimal split that minimizes cost subject to carbon constraint
2. Extend `explainer.py` to narrate power mix recommendation
3. Build `/api/plan` endpoint
4. Build Planner UI in React:
   - Form: location picker, MW, carbon target %, contract horizon (years)
   - Output: recommended mix breakdown (spot / PPA / on-site %)
   - Chart: cost vs carbon trade-off curve (Recharts)
   - AI narrative explanation

**Done when:** User picks Finland + 100MW, gets power mix recommendation with cost/carbon projections.

---

## AI Layer Design

Claude is used **only for explanation**, never for data computation. Results stay deterministic and trustworthy.

**Recommender prompt:**
```
You are an expert energy consultant. Here are scored European locations for a {mw}MW data center.
Scores are based on: power price, carbon intensity, grid congestion, fibre connectivity.
Top results: {json_scores}
Write a 3-sentence explanation of the top 3 locations, highlighting key trade-offs. Be specific with numbers.
```

**Planner prompt:**
```
You are an expert energy consultant. A client needs to power a {mw}MW data center in {location}.
Optimized power mix: {spot_pct}% spot market, {ppa_pct}% PPA, {onsite_pct}% on-site.
Projected annual cost: €{cost}M. Carbon intensity: {carbon} gCO2/kWh.
Write a 2-sentence explanation of why this mix was chosen and what the client should do next.
```

---

## API Endpoints

```
GET  /api/map-data/prices        → GeoJSON with price per country
GET  /api/map-data/carbon        → GeoJSON with carbon intensity
GET  /api/map-data/congestion    → GeoJSON with grid congestion
GET  /api/map-data/datacenters   → GeoJSON points of existing DCs

POST /api/recommend
  Body:    { "mw": 100, "priorities": { "cost": 0.4, "carbon": 0.3, "congestion": 0.2, "connectivity": 0.1 } }
  Returns: { "rankings": [...], "explanation": "..." }

POST /api/plan
  Body:    { "location": "FI", "mw": 100, "carbon_target": 0.95, "contract_years": 10 }
  Returns: { "mix": { "spot": 0.3, "ppa": 0.6, "onsite": 0.1 }, "cost_annual": 31, "explanation": "..." }
```

---

## Testing Approach

- **Data layer:** Assert loaded datasets have expected columns and no nulls for key countries
- **Scorer:** Unit test with known inputs — Norway should rank high for carbon, Poland low
- **Optimizer:** Output mix must sum to 100%, cost must be positive, carbon constraint must be satisfied
- **API:** Each endpoint returns valid JSON with expected keys
- **Frontend:** Manual — run the app, walk through all three tools end-to-end

Tools: `pytest` for backend, manual browser testing for frontend.

---

## Verification (How We Know It Works)

1. Map loads with visible color-coded layers across Europe
2. Clicking Germany shows higher carbon intensity than Norway
3. Recommender with "prioritize carbon" ranks Nordics above Eastern Europe
4. Recommender with "prioritize cost" produces a different ranking
5. Planner for a high-carbon country recommends a higher PPA percentage
6. AI explanations reference specific numbers, not vague language
7. All three tools work without errors in the browser

---

## What We Are NOT Building (Yet)

- User authentication / accounts
- Database (files + memory cache is sufficient for now)
- Real-time price feeds (monthly Ember data is enough)
- Mobile responsiveness
- Cloud deployment (local first, deploy later)
