"""Country scoring engine for the location recommender."""

from dataclasses import dataclass, asdict
from typing import Any

from config import PUE, LOAD_FACTOR
from services.data_loader import get_all_country_data


PRICE_MIN, PRICE_MAX = 30.0, 160.0
CARBON_MIN, CARBON_MAX = 10.0, 700.0
GRID_STATUS_SCORE: dict[str, float] = {
    "exporter": 100.0,
    "balanced": 60.0,
    "importer": 25.0,
}


@dataclass
class CountryScore:
    iso3: str
    overall: float
    sub_scores: dict[str, float]
    metrics: dict[str, Any]


@dataclass
class Recommendation:
    grid_demand_mw: float
    annual_mwh: float
    countries_evaluated: int
    rankings: list[CountryScore]


def score_countries(
    mw: float,
    priorities: dict[str, float],
    top_n: int = 5,
) -> Recommendation:
    """Rank all countries with full data based on user priorities.

    Priorities expected keys: cost, carbon, clean, grid.
    Values are relative weights — they will be normalised to sum to 1.
    """
    weights = _normalise_weights(priorities)
    all_data = get_all_country_data()

    scores: list[CountryScore] = []
    for iso3, c in all_data.items():
        gen = c.get("generation") or {}
        interconn = c.get("interconnection") or {}
        if not gen or not interconn:
            continue

        sub = {
            "cost": _invert_normalise(c["price_eur_mwh"], PRICE_MIN, PRICE_MAX),
            "carbon": _invert_normalise(c["carbon_gco2_kwh"], CARBON_MIN, CARBON_MAX),
            "clean": float(gen["clean_share_pct"]),
            "grid": GRID_STATUS_SCORE.get(interconn.get("status", ""), 0.0),
        }

        overall = sum(weights[k] * sub[k] for k in weights)

        scores.append(CountryScore(
            iso3=iso3,
            overall=round(overall, 1),
            sub_scores={k: round(v, 1) for k, v in sub.items()},
            metrics={
                "price_eur_mwh": c["price_eur_mwh"],
                "carbon_gco2_kwh": c["carbon_gco2_kwh"],
                "clean_share_pct": gen["clean_share_pct"],
                "grid_status": interconn.get("status"),
                "net_position_twh": interconn.get("net_position_twh"),
            },
        ))

    scores.sort(key=lambda s: s.overall, reverse=True)

    return Recommendation(
        grid_demand_mw=round(mw * PUE, 1),
        annual_mwh=round(mw * PUE * 8760 * LOAD_FACTOR, 0),
        countries_evaluated=len(scores),
        rankings=scores[:top_n],
    )


def recommendation_to_dict(rec: Recommendation) -> dict:
    return {
        "grid_demand_mw": rec.grid_demand_mw,
        "annual_mwh": rec.annual_mwh,
        "countries_evaluated": rec.countries_evaluated,
        "rankings": [asdict(s) for s in rec.rankings],
    }


def _normalise_weights(priorities: dict[str, float]) -> dict[str, float]:
    keys = ["cost", "carbon", "clean", "grid"]
    raw = {k: max(0.0, float(priorities.get(k, 0.0))) for k in keys}
    total = sum(raw.values())
    if total == 0:
        return {k: 0.25 for k in keys}
    return {k: v / total for k, v in raw.items()}


def _invert_normalise(value: float, min_val: float, max_val: float) -> float:
    """Map [min, max] → [100, 0] with clamping. Lower input = better score."""
    clamped = max(min_val, min(max_val, value))
    return (1 - (clamped - min_val) / (max_val - min_val)) * 100
