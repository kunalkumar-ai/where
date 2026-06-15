# CLAUDE.md — Project Instructions

## What This Project Is

**App name: Where**

A self-service data center siting and power planning tool for Europe. It helps energy companies and consultants (target: Invertix) decide where to build data centers and how to power them — combining open datasets with an AI explanation layer.

Three tools:
1. **Map Overlay** — visual exploration of Europe (prices, carbon, congestion, existing DCs)
2. **Location Recommender** — ranked locations for a given MW size and priorities
3. **Power Supply Planner** — optimized power mix (spot / PPA / on-site) for a chosen location

---

## Imported Docs (Always Read These)

@docs/plan.md
@docs/engineering.md
@docs/data-sources.md
@docs/bugs.md

---

## Hard Rules (Mechanically Enforced — Do Not Try to Bypass)

These rules are enforced by git hooks and GitHub Actions. Bypassing them is a bug, not a shortcut.

1. **Tests are not optional.** Every file in `backend/services/` MUST have a matching `backend/tests/test_<name>.py`. The pre-commit hook blocks commits that violate this.
2. **Pytest must pass before every commit.** The pre-commit hook runs `pytest` automatically. Do not commit if it fails — fix the code instead.
3. **Commit message format is enforced.** Must start with `feat:`, `fix:`, `chore:`, `test:`, `docs:`, or `refactor:`. The commit-msg hook will reject anything else.
4. **Never bypass hooks with `--no-verify`.** If a hook blocks you, the hook is right. Fix the underlying issue.
5. **Branch and merge workflow:**
   - One branch per phase: `feature/phase-N-<topic>`
   - After merging to main: immediately delete both local AND remote branch
   - Never commit to main directly

If a hook seems wrong, fix it in `.githooks/` or `.github/workflows/` — don't skip it.

**After cloning the repo:** run `./setup.sh` once to activate the hooks (configures `core.hooksPath`).

---

## How to Run the Project

**Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
bun install
bun run dev
```

Backend runs on `http://localhost:8000`
Frontend runs on `http://localhost:5173`

**Run backend tests:**
```bash
cd backend && source venv/bin/activate && pytest
```

**Run frontend type check:**
```bash
cd frontend && npx tsc --noEmit
```

---

## Constants (Do Not Change Without Reason)

```python
PUE = 1.4            # Power Usage Effectiveness (IEA standard)
LOAD_FACTOR = 0.7    # Average utilisation of peak capacity
```

Grid demand formula: `grid_demand_mw = compute_mw * PUE`
Annual energy formula: `annual_mwh = grid_demand_mw * 8760 * LOAD_FACTOR`

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

## Skills & Agents

Custom skills live in `.claude/commands/` — each is a markdown file describing a workflow Claude follows.
Agent definitions and roles live in `docs/agents.md`.

Create these only when a workflow repeats 3+ times or a task is genuinely parallelisable.
Do not create them speculatively before the need is clear.
