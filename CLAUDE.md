# CLAUDE.md — Project Instructions

## What This Project Is

**App name: Where**

A self-service data center siting and power planning tool for Europe. It helps energy companies and consultants (target: Invertix) decide where to build data centers and how to power them — combining open datasets with an AI explanation layer.

Three tools:
1. **Map Overlay** — visual exploration of Europe (prices, carbon, congestion, existing DCs)
2. **Location Recommender** — ranked locations for a given MW size and priorities
3. **Power Supply Planner** — optimized power mix (spot / PPA / on-site) for a chosen location

---

## Read These First

Before writing any code or making any decisions, read these files in order:

1. `docs/plan.md` — full architecture, tech stack, project structure, build phases, API endpoints
2. `docs/engineering.md` — code quality rules, branching, commits, testing, CI
3. `docs/data-sources.md` — every data source: where to get it, format, gotchas, local file paths
4. `docs/bugs.md` — known bugs and the rules they produced. Read this before writing any data or scoring logic.

---

## Tech Stack (Quick Reference)

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Map | MapLibre GL JS |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Backend | FastAPI (Python 3.11) |
| Data processing | Pandas + GeoPandas |
| Grid network | PyPSA |
| AI explanation | Claude API (claude-sonnet-4-6) |

---

## How to Run the Project

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Backend runs on `http://localhost:8000`
Frontend runs on `http://localhost:5173`

**Run backend tests:**
```bash
cd backend && pytest
```

**Run frontend type check:**
```bash
cd frontend && npx tsc --noEmit
```

---

## Architecture Rules

- Full architecture is defined in `docs/plan.md` — always read it before making structural decisions
- Frontend never touches data files — always goes through the REST API
- Backend never renders UI — only serves JSON
- AI (Claude API) is used only for explanation — never for computation or scoring
- All data is loaded once at startup and cached in memory — never fetched per request
- Business logic lives in `backend/services/` — routers only handle HTTP, nothing else

---

## Code Rules

- Read `docs/engineering.md` for the full coding standards
- Type hints on every Python function — no exceptions
- No `any` types in TypeScript — strict mode is on
- No magic numbers inline — use named constants (`PUE = 1.4`)
- Max ~50 lines per function, ~200 lines per file
- No commented-out code — delete it, Git has history
- No TODO comments in committed code — open a GitHub issue instead

---

## Constants (Do Not Change Without Reason)

```python
PUE = 1.4            # Power Usage Effectiveness (IEA standard)
LOAD_FACTOR = 0.7    # Average utilisation of peak capacity
```

Grid demand formula: `grid_demand_mw = compute_mw * PUE`
Annual energy formula: `annual_mwh = grid_demand_mw * 8760 * LOAD_FACTOR`

---

## Data Rules

- All data files live in `backend/data/` — see `docs/data-sources.md` for details
- Always validate a country exists in ALL datasets before scoring it
- Ember data only covers EU27 + some neighbours — do not assume all European countries are present
- Sanity check: Norway carbon intensity ≈ 20 gCO₂/kWh, Poland ≈ 650 gCO₂/kWh. If not, data is wrong.

---

## Testing Rules

- Every function in `backend/services/` has a unit test
- Tests live in `backend/tests/`
- Test naming: `test_<function>_<scenario>`
- Norway must rank higher than Poland for carbon score — use as a baseline sanity test
- Run `pytest` before every commit — never commit failing tests

---

## Git Rules

- Branch per phase: `feature/phase-1-map`, `feature/phase-2-recommender`, `feature/phase-3-planner`
- Commit after every working unit — not at end of day
- Commit format: `type: short description` (feat / fix / chore / test / docs / refactor)
- Never commit to `main` directly — always branch and merge
- Never commit `.env` files or API keys

---

## Secrets

- API keys go in `backend/.env` — never in code
- `.env` is gitignored — never committed
- `.env.example` is committed — shows required keys without values
- Required keys: `ANTHROPIC_API_KEY`

---

## What NOT to Build (Until Explicitly Asked)

- No user authentication or accounts
- No database — memory cache is sufficient
- No real-time price feeds — monthly Ember CSVs are enough
- No mobile responsiveness — desktop only
- No cloud deployment — local first

---

## Build Order

Build in this order — do not skip phases:

1. **Phase 1: Map Overlay** — get data loading and visible. Foundation for everything.
2. **Phase 2: Location Recommender** — scoring engine + AI explanation + results UI
3. **Phase 3: Power Supply Planner** — optimization engine + power mix UI + charts

Full phase details in `docs/plan.md`.

---

## Skills & Agents

Custom skills live in `.claude/commands/` — each is a markdown file describing a workflow Claude follows.
Agent definitions and roles live in `docs/agents.md`.

Create these only when a workflow repeats 3+ times or a task is genuinely parallelisable.
Do not create them speculatively before the need is clear.

---

## Docs Index

| File | Purpose |
|---|---|
| `docs/plan.md` | Full architecture, build phases, API endpoints |
| `docs/engineering.md` | Code standards, branching, commits, CI, testing |
| `docs/data-sources.md` | Data source guide — formats, gotchas, file paths |
| `docs/bugs.md` | Bug log — known issues and rules they produced |
| `docs/agents.md` | Agent roles and instructions (create when needed) |
| `.claude/commands/` | Custom project skills (create when needed) |
