# Lovable Prompt — SiteWise Frontend

Use this prompt in Lovable to generate the initial frontend template.
After generation, export the code and place it in the `frontend/` folder.

---

Build a professional enterprise web application called "Where" — 
a Data Center Siting & Power Planning tool for European energy consultants.

## Problem It Solves
Energy companies need to decide where to build data centers in Europe 
and how to power them. This requires evaluating electricity prices, 
carbon intensity, grid congestion, and fibre connectivity across 
30+ countries simultaneously — a process that currently takes analysts 
days of manual research. SiteWise makes it a self-service tool.

## Target Users
Energy consultants and data center companies (enterprise B2B). 
The UI should feel like a Bloomberg Terminal meets modern SaaS — 
professional, data-dense, trustworthy. Not a consumer app.

## Design Direction
- Dark background (#0F1117 or similar deep navy/charcoal)
- Accent color: electric blue or amber (#3B82F6 or #F59E0B)
- Clean sans-serif typography (Inter or Geist)
- Data is the hero — numbers, scores, and the map should dominate
- Subtle borders, minimal shadows, high information density
- No rounded-corner-heavy consumer aesthetics

## Three Pages / Tools

### 1. Map Page (default/home)
- Full-screen interactive map of Europe (placeholder for MapLibre)
- Left sidebar with layer toggles:
  - Power Prices toggle
  - Carbon Intensity toggle  
  - Grid Congestion toggle
  - Existing Data Centers toggle
- Top bar with app name + navigation to other tools
- Bottom info panel that slides up when a country is clicked, showing:
  - Country name + flag
  - Power price (€/MWh)
  - Carbon intensity (gCO₂/kWh)
  - Grid status (Available / Congested / Full) with color badge
  - Connectivity score (1-10)

### 2. Recommender Page
- Left panel: input form
  - MW size input (number field, 1-500MW)
  - Priority sliders: Cost / Carbon / Grid Availability / Connectivity
    (4 sliders that must sum to 100%)
  - "Find Best Locations" button
- Right panel: results
  - Ranked list of top 5 countries, each as a card showing:
    - Rank number + country name + flag
    - Overall score (large, prominent)
    - 4 sub-scores as small progress bars (cost, carbon, grid, connectivity)
    - One-line trade-off summary (placeholder text)
  - Below the list: AI explanation paragraph in a distinct styled box 
    (label it "AI Analysis")

### 3. Planner Page
- Left panel: input form
  - Country selector dropdown
  - MW demand input
  - Carbon target slider (0-100% clean)
  - Contract horizon (5 / 10 / 15 / 20 years toggle)
  - "Generate Power Plan" button
- Right panel: results
  - Power mix donut chart (Spot Market / PPA / On-site)
  - Three metric cards: Annual Cost (€M) / Carbon Intensity / Clean %
  - Cost vs Carbon trade-off line chart (placeholder)
  - AI narrative explanation box (same style as Recommender page)

## Navigation
Top navigation bar with three items: Map | Recommender | Planner
Active state clearly indicated. App logo/name on the left.

## Tech Stack
React + TypeScript + Tailwind CSS + shadcn/ui components.
Use recharts for all charts. 
Map area should be a styled placeholder div (I will integrate MapLibre later).
All data should be hardcoded mock/placeholder data — 
I will connect the real FastAPI backend later.

## Additional Notes
- Make it responsive to desktop only (min 1280px width)
- Use realistic mock data: Norway €38/MWh 20gCO₂, Germany €89/MWh 350gCO₂, 
  Poland €71/MWh 650gCO₂, Finland €42/MWh 45gCO₂
- The overall feeling should make an energy executive trust it immediately
