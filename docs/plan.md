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
5. Build MapLibre map in React with single-select map layers:
   - **Power Prices** — €/MWh annual average per country, green→red gradient
   - **Carbon Intensity** — gCO₂/kWh, green→red gradient
   - **Clean Energy %** — nuclear + renewables share, 0–100% red→green gradient
   - **Grid Interconnection** — net exporter (green) / balanced (blue) / importer (red)
6. Click a country → bottom panel showing all 4 metrics + electricity generation mix breakdown bar (Coal/Gas/Nuclear/Hydro/Wind/Solar/Bio/Other)

**Frontend integration approach (hybrid):**
- Keep the Lovable-generated shell as-is — sidebar, country info panel, navigation, dark theme, all routes
- Replace the central stylized map area with a real MapLibre GL JS map
- Base tiles: MapLibre demo tiles (free, no API key)
- API client at `frontend/src/lib/api/client.ts` fetches `/api/map-data/all`
- Country shapes come from a Natural Earth GeoJSON in `frontend/public/europe.geojson` (52 European countries)
- All MapLibre fill layers are inserted BELOW the basemap's symbol labels so country names always stay visible
- When a data layer is active, a dark world-mask layer dims the non-European world to keep visual focus on the comparable set

**Layer behaviour:**
- "No layer" mode → bare pastel basemap with names visible (browse mode)
- Any data layer active → world-mask appears, only the European countries with backend data show colour, no-data European countries become transparent (mask shows through, effectively hidden)

**Done when:** Map renders with real European country shapes, all four data layers + "No layer" toggleable, country click shows real data from the FastAPI backend.

---

### Phase 2: Location Recommender ✅
**Goal:** User inputs MW + priorities, gets ranked locations with AI explanation.

**How it actually got built:**

1. **`backend/services/scorer.py`** — pure ranking engine:
   - Inputs: MW + relative priority weights for cost / carbon / clean / grid (these are normalised so they sum to 1; the slider numbers don't need to add up to 100)
   - For each of 28 countries: compute four 0–100 sub-scores
     - **cost** = invert-normalise price between actual data min and max (cheapest country → 100, most expensive → 0)
     - **carbon** = invert-normalise gCO₂/kWh the same way
     - **clean** = raw `clean_share_pct` from Ember generation data
     - **grid** = `exporter` 100 / `balanced` 60 / `importer` 25 (status from Ember interconnection)
   - `overall = Σ (weight_i × sub_score_i)`, then sort descending, return top N
   - Bounds are recomputed from the current dataset on every call (no magic numbers), so the full 0–100 range always gets used

2. **`backend/services/explainer.py` (`explain_recommendation`)**:
   - Builds a structured prompt with MW, normalised weights as %, PUE-adjusted grid demand, annual MWh, and the top 3 countries with their raw metrics and sub-scores
   - Sends to Claude (`claude-sonnet-4-5`) with an "energy consultant" system prompt
   - Caller is dependency-injected so tests don't hit the live API

3. **`POST /api/recommend`** — Pydantic validates inputs, runs scorer + explainer, returns the JSON

4. **Frontend** (`frontend/src/routes/recommender.tsx`):
   - MW input + 4 priority sliders (cost / carbon / clean / grid)
   - On submit: POST → loading state → render ranked cards (rank, flag, metrics, 4 sub-score bars, overall) + AI Analysis panel

**Real test:** `100MW, priorities 30/30/20/20` → France wins, optimizer cites €47.2M annual power vs €76.4M for Norway.

---

### Phase 3: Power Supply Planner ✅
**Goal:** User picks a location, gets optimized power mix (spot / PPA / on-site).

**How it actually got built:**

1. **`backend/services/optimizer.py`** — brute-force grid search:
   - Three sources modelled with hardcoded constants:
     - **Spot**: country's `price_eur_mwh`, country's `carbon_gco2_kwh`, no cap
     - **PPA** (wind/solar contract): €35/MWh, 10 gCO₂/kWh, max 80% of demand
     - **On-site** (solar + battery): €70/MWh, 30 gCO₂/kWh, max 25% of demand
   - The loop: enumerate every `(onsite, ppa)` combination in 5% steps, derive `spot = 1 - onsite - ppa`, drop invalid combos, compute `clean_pct` and `blended_price`. Keep the cheapest mix that meets the user's clean target.
   - ~102 candidate mixes per call — microseconds. No solver/LP needed at this granularity.
   - Returns `PlanResult` with mix, achieved clean %, achieved carbon, blended €/MWh, annual €M, plus the country baseline for comparison

2. **`backend/services/explainer.py` (`explain_power_plan`)**:
   - Builds a prompt with country baseline, the optimised mix vs 100% spot, achieved clean / carbon, blended price
   - Claude returns a 3-sentence narrative + concrete next step (PPA RfP, grid connection, etc.)

3. **`POST /api/plan`** — Pydantic validates inputs; returns the optimised plan + AI narrative

4. **Frontend** (`frontend/src/routes/planner.tsx`):
   - Inputs: country dropdown (sorted by name), MW, clean-energy target slider, contract horizon
   - Results: power mix donut (Recharts), three metric cards (annual cost, carbon, clean %), bar chart "100% spot vs optimised mix" highlighting €M/yr saved, plus AI Analysis panel

**Real test:** `Poland 100MW, 95% clean target` → 0% spot + 80% PPA + 20% on-site at €42/MWh blended, saves ~€58M/year vs Poland's expensive dirty spot.

**Surprising real-world insight from the data:** PPA at €35/MWh undercuts every European spot price in our dataset, so the optimizer leans PPA-heavy even for already-clean countries like Norway — cost beats carbon as the dominant signal once cheap PPAs are on the table.

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
GET  /api/map-data/all              → All data per country (see shape below)
GET  /api/map-data/prices           → {iso3: price_eur_mwh}
GET  /api/map-data/carbon           → {iso3: carbon_gco2_kwh}
GET  /api/map-data/interconnection  → {iso3: {renewable_share_pct, net_position_twh, status}}
GET  /api/map-data/generation       → {iso3: {clean_share_pct, renewable_share_pct, mix_pct: {coal, gas, nuclear, hydro, wind, solar, bioenergy, other_fossil, other_renewables}}}

# /all returns the union, keyed by ISO3 — used by the map page on mount:
# { "FRA": { price_eur_mwh, carbon_gco2_kwh, interconnection: {...}, generation: {...} }, ... }

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
