import pytest

from services.data_loader import load_all_data
from services.optimizer import (
    plan_power_supply,
    plan_result_to_dict,
    PPA_PRICE_EUR_MWH,
    ONSITE_PRICE_EUR_MWH,
)


@pytest.fixture(scope="module", autouse=True)
def _load_once():
    load_all_data()


def test_planner_mix_sums_to_100_percent():
    r = plan_power_supply(location="DEU", mw=100, target_clean_pct=80, contract_years=10)
    total = r.mix.spot + r.mix.ppa + r.mix.onsite
    assert abs(total - 1.0) < 0.01


def test_planner_meets_carbon_target_when_feasible():
    r = plan_power_supply(location="POL", mw=100, target_clean_pct=90, contract_years=10)
    assert r.feasible
    assert r.achieved_clean_pct >= 90 - 0.5  # small float tolerance


def test_planner_uses_ppa_when_cheaper_than_spot():
    """PPA at €35/MWh undercuts every European spot price in our data,
    so optimizer should always lean into PPA even in clean countries."""
    r = plan_power_supply(location="NOR", mw=100, target_clean_pct=90, contract_years=10)
    assert r.feasible
    assert r.mix.ppa >= r.mix.spot, (
        "PPA is cheaper than Norway's spot (€89) — optimizer should prefer PPA"
    )
    assert r.blended_price_eur_mwh < r.country_metrics["price_eur_mwh"]


def test_planner_dirty_country_needs_lots_of_ppa():
    """Poland grid is ~46% clean — needs significant PPA for a 95% target."""
    r = plan_power_supply(location="POL", mw=100, target_clean_pct=95, contract_years=10)
    assert r.feasible
    assert r.mix.ppa + r.mix.onsite > 0.5


def test_planner_100pct_clean_target_forces_zero_spot():
    r = plan_power_supply(location="DEU", mw=100, target_clean_pct=100, contract_years=10)
    assert r.feasible
    assert r.mix.spot < 0.01


def test_planner_onsite_share_never_exceeds_cap():
    """On-site share should never exceed the 25% physical cap."""
    for country in ("POL", "DEU", "NOR", "FRA"):
        r = plan_power_supply(location=country, mw=100, target_clean_pct=95, contract_years=10)
        assert r.mix.onsite <= 0.25 + 0.001


def test_planner_blended_price_within_source_bounds():
    """Blended price must be between cheapest and most expensive source used."""
    r = plan_power_supply(location="POL", mw=100, target_clean_pct=95, contract_years=10)
    used = []
    if r.mix.spot > 0.01:
        used.append(r.country_metrics["price_eur_mwh"])
    if r.mix.ppa > 0.01:
        used.append(PPA_PRICE_EUR_MWH)
    if r.mix.onsite > 0.01:
        used.append(ONSITE_PRICE_EUR_MWH)
    assert min(used) - 0.5 <= r.blended_price_eur_mwh <= max(used) + 0.5


def test_planner_annual_cost_scales_linearly_with_mw():
    r50 = plan_power_supply(location="FRA", mw=50, target_clean_pct=90, contract_years=10)
    r100 = plan_power_supply(location="FRA", mw=100, target_clean_pct=90, contract_years=10)
    # 2x demand should be ~2x cost
    assert abs(r100.annual_cost_eur / r50.annual_cost_eur - 2.0) < 0.01


def test_planner_unknown_location_raises():
    with pytest.raises(ValueError):
        plan_power_supply(location="ZZZ", mw=100, target_clean_pct=90, contract_years=10)


def test_plan_result_to_dict_is_json_safe():
    import json
    r = plan_power_supply(location="FRA", mw=100, target_clean_pct=90, contract_years=10)
    d = plan_result_to_dict(r)
    json.dumps(d)
    assert d["mix"]["spot"] + d["mix"]["ppa"] + d["mix"]["onsite"] == pytest.approx(1.0, abs=0.01)
