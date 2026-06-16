"""Claude-powered explanation layer for the location recommender."""

from typing import Protocol

from anthropic import Anthropic

from config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from services.scorer import Recommendation, CountryScore


SYSTEM_PROMPT = (
    "You are an expert European energy consultant advising data center "
    "operators on where to build. Speak plainly. Be specific with numbers. "
    "Highlight real trade-offs — every location has one. Never fabricate "
    "values that aren't given to you."
)


class _Caller(Protocol):
    def __call__(self, system: str, prompt: str) -> str: ...


def explain_recommendation(
    rec: Recommendation,
    priorities: dict[str, float],
    mw: float,
    caller: _Caller | None = None,
) -> str:
    """Generate a plain-English explanation of the top recommendations.

    `caller` is an injectable function for testing. In production it defaults
    to a live Claude API call using the project's ANTHROPIC_API_KEY.
    """
    prompt = build_prompt(rec, priorities, mw)
    call = caller or _live_claude_call
    return call(system=SYSTEM_PROMPT, prompt=prompt).strip()


def build_prompt(rec: Recommendation, priorities: dict[str, float], mw: float) -> str:
    """Pure prompt construction. Easily unit-testable."""
    weight_lines = "\n".join(
        f"  - {label}: {pct:.0%}"
        for label, pct in _normalised_priority_summary(priorities).items()
    )

    country_lines = "\n\n".join(_format_country(i + 1, s) for i, s in enumerate(rec.rankings[:3]))

    return (
        f"A client wants to build a {mw:.0f}MW data center somewhere in Europe.\n\n"
        f"Their priorities (relative weights):\n{weight_lines}\n\n"
        f"After applying PUE 1.4 the actual grid connection needed is "
        f"{rec.grid_demand_mw:.0f}MW, with expected annual consumption "
        f"around {rec.annual_mwh:,.0f} MWh.\n\n"
        f"Of {rec.countries_evaluated} European countries with full data, the top 3 are:\n\n"
        f"{country_lines}\n\n"
        "Write a focused 3-sentence explanation of these top 3 locations for the client. "
        "Be specific with the numbers above (€/MWh, gCO₂/kWh, clean share %, grid status). "
        "Make the trade-offs concrete. End with one short sentence on what to do next."
    )


def _format_country(rank: int, s: CountryScore) -> str:
    m = s.metrics
    return (
        f"{rank}. {s.iso3} — overall score {s.overall}\n"
        f"   Power price: €{m['price_eur_mwh']:.0f}/MWh\n"
        f"   Carbon intensity: {m['carbon_gco2_kwh']:.0f} gCO₂/kWh\n"
        f"   Clean energy: {m['clean_share_pct']:.1f}%\n"
        f"   Grid: {m['grid_status']} ({m['net_position_twh']:+.1f} TWh net position)\n"
        f"   Sub-scores — cost: {s.sub_scores['cost']:.0f}, "
        f"carbon: {s.sub_scores['carbon']:.0f}, "
        f"clean: {s.sub_scores['clean']:.0f}, "
        f"grid: {s.sub_scores['grid']:.0f}"
    )


def _normalised_priority_summary(priorities: dict[str, float]) -> dict[str, float]:
    labels = {"cost": "Cost", "carbon": "Carbon intensity", "clean": "Clean energy", "grid": "Grid availability"}
    raw = {k: max(0.0, float(priorities.get(k, 0.0))) for k in labels}
    total = sum(raw.values()) or 1.0
    return {labels[k]: raw[k] / total for k in labels}


def _live_claude_call(system: str, prompt: str) -> str:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. Add it to the project-root .env file."
        )
    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=500,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    # We only request text content, so this is always a TextBlock.
    return response.content[0].text  # type: ignore[union-attr]
