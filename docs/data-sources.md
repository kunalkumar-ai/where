# Data Sources Guide

A practical reference for every dataset used in this project.
Read this before touching any data loading code.

---

## 1. European Power Grid — PyPSA-Eur

**What it is:**
An open model of the entire European electricity network. Models nodes (locations), transmission lines, capacity, and generation (wind, solar, nuclear, gas) across Europe.

**What it gives us:**
For any location in Europe — does the local grid have headroom for a new large load, or is it already at capacity?

**Where to get it:**
- Zenodo dataset ID: `18619025`
- Download the prebuilt network file (`.nc` format)
- Library to use: `pypsa` (Python)

**Format:**
- `.nc` file (NetCDF format)
- Load with: `pypsa.Network("network.nc")`
- Key attributes: `network.buses` (nodes/locations), `network.lines` (transmission lines), `network.generators` (power plants)

**Gotchas:**
- File is large — load once at startup, never per request
- Not every European country has equal resolution — Western Europe has more detail than Eastern Europe
- Requires `pypsa`, `pandas`, `numpy` installed

**Where to store locally:**
`backend/data/pypsa_network.nc`

---

## 2. Power Prices — Ember

**What it is:**
Real European electricity market data — day-ahead prices (€/MWh) by country, updated regularly.

**What it gives us:**
Country-level electricity cost comparison. Used in scoring and power planner cost projections.

**Where to get it:**
- Ember European electricity prices & costs dataset
- Download as CSV from: ember-climate.org/data/data-tools/

**Format:**
- CSV file
- Key columns: `country`, `year`, `month`, `price_eur_mwh`
- We use latest 12-month average per country

**Gotchas:**
- Only covers EU27 + some neighbours — not all European states (e.g. Kosovo, Moldova may be missing)
- Always validate a country exists in this dataset before scoring it
- Prices vary significantly by month — use annual average, not spot month

**Where to store locally:**
`backend/data/ember_prices.csv`

---

## 3. Carbon & Clean Power Share — Ember Electricity Data Explorer

**What it is:**
Generation mix and carbon intensity per country — what % comes from wind, solar, hydro, nuclear (clean) vs gas, coal (dirty). Resulting carbon intensity in gCO₂/kWh.

**What it gives us:**
Carbon score per location. Critical for sustainability-focused clients.

**Where to get it:**
- Ember Electricity Data Explorer
- ember-climate.org/data/data-tools/electricity-data-explorer/
- Export as CSV filtered to European countries, latest year

**Format:**
- CSV file
- Key columns: `country`, `year`, `carbon_intensity_gco2_kwh`, `clean_share_pct`

**Reference values (sanity check):**
| Country | Approx Carbon Intensity |
|---|---|
| Norway | ~20 gCO₂/kWh |
| France | ~50 gCO₂/kWh |
| Germany | ~350 gCO₂/kWh |
| Poland | ~650 gCO₂/kWh |

Use these to validate data loaded correctly. If Norway shows >100, something is wrong.

**Gotchas:**
- Same country coverage limitation as prices — validate before use
- Carbon intensity changes year to year — always use latest full year

**Where to store locally:**
`backend/data/ember_carbon.csv`

---

## 4. Grid Congestion — Ember Grids for Data Centres

**What it is:**
A dedicated Ember dataset built specifically for data center siting. Identifies where there is available grid capacity vs congestion across Europe.

**What it gives us:**
- Available grid capacity by region (can you actually connect here?)
- Grid connection costs (€1M to €100M+ depending on location)
- Connection timelines (2–10 years in some countries)

**Where to get it:**
- Ember Grids for data centres report
- ember-climate.org — search "grids for data centres"
- Data may need manual extraction from report into a structured JSON

**Format:**
- Likely PDF report with tables — extract key data manually into:
`backend/data/grid_congestion.json`

```json
{
  "IE": { "status": "congested", "connection_years": 7, "note": "Dublin grid full" },
  "FI": { "status": "available", "connection_years": 2, "note": "Good headroom" },
  ...
}
```

**Gotchas:**
- This is the most critical factor — cheap clean power means nothing if you cannot connect
- Ireland (around Dublin) has nearly stopped approving new connections
- Nordics (Sweden, Finland) have capacity + clean power — high demand, act fast
- Connection timelines can kill a project — weight this heavily in scoring

**Where to store locally:**
`backend/data/grid_congestion.json`

---

## 5. Existing Data Centres — OpenStreetMap

**What it is:**
Open-source world map with tagged data center locations across Europe.

**What it gives us:**
Geographic coordinates of existing data centers — where clusters are, where gaps exist.

**Where to get it:**
- OSM Overpass API (free, no key needed)
- Query: all buildings tagged `building=data_centre` in Europe
- Fetch once and save locally — do not call on every request (rate limited)

**Overpass query:**
```
[out:json][timeout:60];
(
  node["building"="data_centre"](35.0, -10.0, 72.0, 40.0);
  way["building"="data_centre"](35.0, -10.0, 72.0, 40.0);
);
out center;
```

**Format:**
- GeoJSON after conversion
- Save as: `backend/data/datacenters.geojson`
- Key fields: `lat`, `lon`, `name` (often empty)

**Gotchas:**
- Coverage is incomplete — not every data center is tagged in OSM
- Treat as indicative, not exhaustive
- Major hubs (Frankfurt, Amsterdam, London) are well represented

**Where to store locally:**
`backend/data/datacenters.geojson`

---

## 6. Fibre / Telco Networks — ITU BBmaps

**What it is:**
ITU (International Telecommunication Union) broadband and transmission network maps — where fibre infrastructure exists across countries.

**What it gives us:**
A connectivity proxy — does fibre exist near this location? Are there submarine cable landing points nearby?

**Where to get it:**
- ITU Transmission Networks (BBmaps)
- itu.int/en/ITU-D/Statistics/Pages/bbmaps/default.aspx

**Format:**
- GIS data or PDF maps
- For our tool: extract into a static country-level connectivity score (1–10)
- Save as: `backend/data/connectivity_scores.json`

```json
{
  "NL": { "score": 10, "note": "AMS-IX, major submarine cables" },
  "DE": { "score": 9, "note": "DE-CIX Frankfurt, dense fibre" },
  "PL": { "score": 6, "note": "Improving but patchy" },
  ...
}
```

**Gotchas:**
- This is a proxy, not exact capacity data — sufficient for country-level comparison
- Major internet exchange cities score highest: Amsterdam, Frankfurt, London, Paris
- Eastern Europe is improving but still lower than Western Europe

**Where to store locally:**
`backend/data/connectivity_scores.json`

---

## 7. IEA Energy & AI — PUE & Load Factor Constants

**What it is:**
The IEA (International Energy Agency) published standard industry assumptions for sizing data center power needs in their "Energy and AI" report.

**What it gives us:**
Conversion formulas to translate compute MW into actual grid demand.

**Where to get it:**
- IEA report: "Energy and AI" — iea.org
- Values are industry standard constants — hardcode them, do not load from file

**Constants to use:**
```python
PUE = 1.4           # Power Usage Effectiveness (total facility / IT power)
LOAD_FACTOR = 0.7   # Average utilisation of peak capacity
```

**How to apply:**
```python
# User says they need X MW of compute
grid_demand_mw = compute_mw * PUE          # actual grid connection needed
annual_mwh = grid_demand_mw * 8760 * LOAD_FACTOR  # annual energy consumption
```

**Example:**
- Client needs 100MW compute
- Grid connection needed: 100 × 1.4 = **140MW**
- Annual consumption: 140 × 8760 × 0.7 = **857,520 MWh/year**

**Gotchas:**
- Best hyperscale operators (Google, Meta) achieve PUE ~1.2 — but use 1.4 as conservative default
- Never let the user input PUE directly — keep it as a backend constant for now

---

## Local Data Folder Structure

```
backend/data/
├── ember_prices.csv          # Power prices by country
├── ember_carbon.csv          # Carbon intensity by country
├── grid_congestion.json      # Grid capacity & connection data (manual extraction)
├── connectivity_scores.json  # Fibre connectivity scores (manual extraction)
├── datacenters.geojson       # Existing data centers from OSM (fetched once)
└── pypsa_network.nc          # European grid network (downloaded from Zenodo)
```

---

## Data Loading Order at Startup

Load in this order — heavier files last so the API is responsive quickly:

1. `connectivity_scores.json` — tiny, instant
2. `grid_congestion.json` — tiny, instant
3. `ember_prices.csv` — small, fast
4. `ember_carbon.csv` — small, fast
5. `datacenters.geojson` — medium
6. `pypsa_network.nc` — large, takes a few seconds

All loaded once into memory at FastAPI startup. Never reloaded per request.

---

## Country Coverage

The map (`frontend/public/europe.geojson`) draws **52 European countries**.
Backend Ember data only covers **31** of them with prices.

The 21 countries on the map without price data fall into two groups:

### Real data center candidates (genuine gaps — fix later if needed)

These ARE valid European countries that could host data centers. We just lack Ember price data.

| ISO3 | Country | Carbon data? | Notes |
|------|---------|--------------|-------|
| ALB  | Albania | yes | |
| BIH  | Bosnia and Herzegovina | yes | |
| BLR  | Belarus | yes | sanctions/political risk in 2026 |
| CYP  | Cyprus | yes | island grid, isolated |
| ISL  | Iceland | yes | **already a major DC hub** — geothermal, free cooling |
| KOS  | Kosovo | no | |
| MDA  | Moldova | yes | |
| MLT  | Malta | yes | small island grid |
| RUS  | Russia | yes | sanctions/political risk in 2026 |
| TUR  | Turkey | no | |
| UKR  | Ukraine | yes | active conflict in 2026, not viable |

**If a user asks about any of these:** be honest that we have no price data, do NOT make up numbers. Iceland in particular is a real omission worth fixing if a user cares.

### Micro-states (skip — not real DC candidates)

Too small for hyperscale data centers and Ember rightly omits them.

`ALD` Åland, `AND` Andorra, `FRO` Faeroe Islands, `GGY` Guernsey, `IMN` Isle of Man, `JEY` Jersey, `LIE` Liechtenstein, `MCO` Monaco, `SMR` San Marino, `VAT` Vatican.

### How the frontend handles these

Countries without backend data render gray on the map.
Country click → info panel shows "no data available" rather than fabricating values.

---

## Bug Rule (For This Project)

If a country exists in `europe.geojson` but is missing from backend data, that is **expected behavior**, not a bug. Only log a bug in `docs/bugs.md` if a country we SHOULD have data for is missing (e.g. Germany suddenly disappears from prices).
