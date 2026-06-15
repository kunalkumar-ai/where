import pytest

from services.data_loader import load_all_data
from services.scorer import score_countries, recommendation_to_dict


@pytest.fixture(scope="module", autouse=True)
def _load_once():
    load_all_data()


def test_scorer_ranks_norway_above_poland_for_carbon():
    rec = score_countries(mw=100, priorities={"carbon": 1.0}, top_n=30)
    iso_ranks = [s.iso3 for s in rec.rankings]
    assert "NOR" in iso_ranks
    assert "POL" in iso_ranks
    assert iso_ranks.index("NOR") < iso_ranks.index("POL")


def test_scorer_ranks_norway_high_for_clean_energy():
    rec = score_countries(mw=100, priorities={"clean": 1.0}, top_n=10)
    iso_ranks = [s.iso3 for s in rec.rankings]
    assert "NOR" in iso_ranks[:5], "Norway should be top-5 for clean energy"


def test_scorer_applies_pue_to_grid_demand():
    rec = score_countries(mw=100, priorities={"cost": 1.0})
    assert rec.grid_demand_mw == 140.0  # 100 * PUE (1.4)


def test_scorer_annual_mwh_uses_load_factor():
    rec = score_countries(mw=100, priorities={"cost": 1.0})
    # 100 * 1.4 * 8760 * 0.7 = 858,648
    assert 850_000 < rec.annual_mwh < 870_000


def test_scorer_returns_top_n_only():
    rec = score_countries(mw=100, priorities={"cost": 1.0}, top_n=3)
    assert len(rec.rankings) == 3
    for i in range(len(rec.rankings) - 1):
        assert rec.rankings[i].overall >= rec.rankings[i + 1].overall


def test_scorer_sub_scores_present_for_each_factor():
    rec = score_countries(mw=100, priorities={"cost": 1.0})
    expected_keys = {"cost", "carbon", "clean", "grid"}
    for s in rec.rankings:
        assert set(s.sub_scores.keys()) == expected_keys


def test_scorer_with_empty_priorities_uses_equal_weights():
    rec = score_countries(mw=100, priorities={})
    assert len(rec.rankings) > 0


def test_recommendation_to_dict_is_json_safe():
    import json
    rec = score_countries(mw=50, priorities={"cost": 0.5, "carbon": 0.5})
    d = recommendation_to_dict(rec)
    json.dumps(d)
    assert "rankings" in d
    assert "grid_demand_mw" in d
