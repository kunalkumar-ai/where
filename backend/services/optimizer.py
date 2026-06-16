"""Power supply mix optimizer for the planner.

Given a chosen country and a clean-energy target, find the cheapest mix
of grid spot, PPA (wind/solar contract), and on-site (solar + battery).
"""

from dataclasses import dataclass, asdict
from typing import Any

from config import PUE, LOAD_FACTOR
from services.data_loader import get_all_country_data


PPA_PRICE_EUR_MWH: float = 35.0
PPA_CARBON_GCO2_KWH: float = 10.0
PPA_MAX_SHARE: float = 0.80

ONSITE_PRICE_EUR_MWH: float = 70.0
ONSITE_CARBON_GCO2_KWH: float = 30.0
ONSITE_MAX_SHARE: float = 0.25

STEP: float = 0.05


@dataclass
class PowerMix:
    spot: float
    ppa: float
    onsite: float


@dataclass
class PlanResult:
    location: str
    mw: float
    grid_demand_mw: float
    annual_mwh: float
    target_clean_pct: float
    contract_years: int
    feasible: bool
    mix: PowerMix
    achieved_clean_pct: float
    achieved_carbon_gco2_kwh: float
    blended_price_eur_mwh: float
    annual_cost_eur: float
    annual_cost_meur: float
    country_metrics: dict[str, Any]


def plan_power_supply(
    location: str,
    mw: float,
    target_clean_pct: float,
    contract_years: int,
) -> PlanResult:
    all_data = get_all_country_data()
    country = all_data.get(location)
    if not country or "generation" not in country:
        raise ValueError(f"No backend data for country '{location}'.")

    grid_demand_mw = mw * PUE
    annual_mwh = grid_demand_mw * 8760 * LOAD_FACTOR
    country_price = float(country["price_eur_mwh"])
    country_carbon = float(country["carbon_gco2_kwh"])
    country_clean_pct = float(country["generation"]["clean_share_pct"])

    best = _search_cheapest_mix(country_price, country_clean_pct, target_clean_pct)

    if best is None:
        # Should be unreachable (PPA + on-site can always reach 100% clean),
        # but guard anyway and return a maximum-clean fallback.
        best_mix = PowerMix(spot=0.0, ppa=PPA_MAX_SHARE, onsite=ONSITE_MAX_SHARE)
        feasible = False
    else:
        best_mix = best
        feasible = True

    blended_price = _blended_price(best_mix, country_price)
    achieved_clean = _achieved_clean(best_mix, country_clean_pct)
    achieved_carbon = _achieved_carbon(best_mix, country_carbon)

    annual_cost_eur = blended_price * annual_mwh

    return PlanResult(
        location=location,
        mw=mw,
        grid_demand_mw=round(grid_demand_mw, 1),
        annual_mwh=round(annual_mwh, 0),
        target_clean_pct=target_clean_pct,
        contract_years=contract_years,
        feasible=feasible,
        mix=PowerMix(
            spot=round(best_mix.spot, 3),
            ppa=round(best_mix.ppa, 3),
            onsite=round(best_mix.onsite, 3),
        ),
        achieved_clean_pct=round(achieved_clean, 1),
        achieved_carbon_gco2_kwh=round(achieved_carbon, 1),
        blended_price_eur_mwh=round(blended_price, 2),
        annual_cost_eur=round(annual_cost_eur, 0),
        annual_cost_meur=round(annual_cost_eur / 1_000_000, 2),
        country_metrics={
            "price_eur_mwh": country_price,
            "carbon_gco2_kwh": country_carbon,
            "clean_share_pct": country_clean_pct,
        },
    )


def plan_result_to_dict(r: PlanResult) -> dict:
    d = asdict(r)
    d["mix"] = asdict(r.mix)
    return d


def _search_cheapest_mix(country_price: float, country_clean_pct: float, target_clean_pct: float) -> PowerMix | None:
    """Enumerate (spot, PPA, onsite) shares and return the cheapest mix
    that meets the target. Returns None if no mix is feasible."""
    best_mix: PowerMix | None = None
    best_cost = float("inf")

    onsite = 0.0
    while onsite <= ONSITE_MAX_SHARE + 1e-9:
        ppa = 0.0
        while ppa <= PPA_MAX_SHARE + 1e-9:
            spot = 1.0 - onsite - ppa
            if spot < -1e-9:
                ppa += STEP
                continue
            spot = max(0.0, spot)

            mix = PowerMix(spot=spot, ppa=ppa, onsite=onsite)
            clean = _achieved_clean(mix, country_clean_pct)
            if clean + 1e-6 < target_clean_pct:
                ppa += STEP
                continue

            cost = _blended_price(mix, country_price)
            if cost < best_cost:
                best_cost = cost
                best_mix = mix
            ppa += STEP
        onsite += STEP

    return best_mix


def _blended_price(mix: PowerMix, country_price: float) -> float:
    return (
        mix.spot * country_price
        + mix.ppa * PPA_PRICE_EUR_MWH
        + mix.onsite * ONSITE_PRICE_EUR_MWH
    )


def _achieved_clean(mix: PowerMix, country_clean_pct: float) -> float:
    return mix.spot * country_clean_pct + mix.ppa * 100.0 + mix.onsite * 100.0


def _achieved_carbon(mix: PowerMix, country_carbon: float) -> float:
    return (
        mix.spot * country_carbon
        + mix.ppa * PPA_CARBON_GCO2_KWH
        + mix.onsite * ONSITE_CARBON_GCO2_KWH
    )
