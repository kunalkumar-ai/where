# Engineering Standards

## Philosophy

Write code that the next person (or future you) can understand without a guide.
Every function does one thing. Every file has one purpose. Every commit leaves the codebase better than it found it.

---

## Code Quality

### General
- Functions do one thing only — if you need "and" to describe it, split it into two functions
- Max ~50 lines per function, max ~200 lines per file — if longer, it's doing too much
- No magic numbers inline — use named constants at the top of the file
  ```python
  # Good
  PUE = 1.4
  grid_demand = mw * PUE

  # Bad
  grid_demand = mw * 1.4
  ```
- No commented-out code — delete it, Git has the history
- No TODO comments in committed code — open a GitHub issue instead

### Python (Backend)
- Type hints on every function — inputs and return value
  ```python
  # Good
  def score_country(country: str, mw: float, weights: dict) -> float:

  # Bad
  def score_country(country, mw, weights):
  ```
- Use `dataclasses` or `pydantic` models for structured data — no raw dicts passed between functions
- One class or one logical group of functions per file
- Import order: standard library → third party → local

### TypeScript (Frontend)
- Strict mode on — no `any` types, ever
- Functional components only — no class components
- Props always typed with an interface
  ```typescript
  // Good
  interface CountryCardProps {
    name: string;
    score: number;
    explanation: string;
  }

  // Bad
  function CountryCard(props: any)
  ```
- Keep components small — if a component exceeds ~100 lines, extract a sub-component

---

## Project Structure Rules

- Backend services (`backend/services/`) contain all business logic — routers only handle HTTP
- Frontend API calls live in `frontend/src/api/` — never fetch directly inside components
- Data files live in `backend/data/` — never hardcode data inline in code
- Environment variables accessed only through a config module — never `os.environ.get()` scattered across files

---

## Testing

### Philosophy
- Test behaviour, not implementation — test what a function does, not how it does it
- Every function in `backend/services/` has at least one unit test
- A test must assert a specific value — not just "it didn't crash"

### Structure
```
backend/
└── tests/
    ├── test_data_loader.py
    ├── test_scorer.py
    ├── test_optimizer.py
    └── test_explainer.py
```

### Naming
```python
# Pattern: test_<function>_<scenario>
def test_scorer_ranks_norway_above_poland_for_carbon():
def test_optimizer_mix_sums_to_100():
def test_data_loader_raises_on_missing_file():
```

### Sanity Checks (must always pass)
- Norway ranks higher than Poland for carbon score
- Finland ranks higher than Germany for combined cost + carbon
- Optimizer output mix always sums to 100%
- All API endpoints return valid JSON with documented keys

### Running Tests
```bash
# Run all tests
cd backend && pytest

# Run with coverage report
cd backend && pytest --cov=services

# Run a specific file
cd backend && pytest tests/test_scorer.py
```

---

## Git & Branching

### Branch Strategy
```
main  (always stable — never broken)
  └── feature/phase-1-map
  └── feature/phase-2-recommender
  └── feature/phase-3-planner
  └── fix/<short-description>
  └── chore/<short-description>
```

Each phase from `docs/plan.md` gets its own branch.
Merge to `main` only when the phase is fully working and tests pass.

### Branch Naming
| Type | Pattern | Example |
|---|---|---|
| New feature | `feature/<description>` | `feature/phase-1-map` |
| Bug fix | `fix/<description>` | `fix/scorer-weight-bug` |
| Data / config / setup | `chore/<description>` | `chore/add-ember-data` |

### Commit Frequency
Commit after every working unit — not at end of day.
Think of it as saving a video game — save after every level cleared, not just at the end.

### Commit Message Format
```
type: short description in present tense

Types:
  feat    → new feature or capability
  fix     → bug fix
  chore   → data, config, dependencies, setup
  test    → adding or updating tests
  docs    → documentation only
  refactor → code change with no behaviour change
```

**Examples:**
```
feat: add country scoring engine
feat: add MapLibre map with layer toggles
fix: correct PUE formula in scorer
chore: add Ember price CSV to data folder
test: add unit tests for optimizer
docs: update plan with API endpoint shapes
refactor: extract scoring weights into config
```

### Rules
- Never commit broken code to `main`
- Never commit API keys, `.env` files, or secrets
- Never force push to `main`
- Every PR to `main` requires passing CI before merge

---

## Environment & Secrets

```
backend/
├── .env              ← real secrets, never committed (in .gitignore)
└── .env.example      ← template showing required keys, committed
```

`.env.example` contents:
```
ANTHROPIC_API_KEY=your_key_here
```

Access env vars only through a config module:
```python
# backend/config.py
from dotenv import load_dotenv
import os

load_dotenv()
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]  # raises if missing
```

---

## GitHub Actions (CI)

Every push to any branch triggers:
1. **Backend tests** — `pytest` must pass
2. **Frontend type check** — `tsc --noEmit` must pass

Every PR to `main` requires:
1. Both checks green
2. No merge with failing CI — ever

### Workflow file location
`.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: ["*"]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest

  frontend-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: cd frontend && npm install
      - run: cd frontend && npx tsc --noEmit
```

---

## Pull Request Rules

- PR title follows the same format as commit messages: `feat: add recommender UI`
- PR description explains what changed and how to test it manually
- Keep PRs small — one phase or one feature per PR
- Self-review your diff before opening a PR — read every line you changed

---

## What We Are Not Doing (Yet)

- No database — data loaded from files into memory at startup
- No authentication — open tool for now
- No real-time data feeds — monthly Ember CSVs are sufficient
- No mobile responsiveness — desktop only for the pitch
- No cloud deployment — local first, deploy after the tool is working
