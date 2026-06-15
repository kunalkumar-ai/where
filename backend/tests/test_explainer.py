import pytest

from services.data_loader import load_all_data
from services.scorer import score_countries
from services.explainer import build_prompt, explain_recommendation


@pytest.fixture(scope="module", autouse=True)
def _load_once():
    load_all_data()


@pytest.fixture(scope="module")
def carbon_priority_recommendation():
    return score_countries(mw=100, priorities={"carbon": 1.0})


def test_build_prompt_includes_mw_size(carbon_priority_recommendation):
    rec = carbon_priority_recommendation
    prompt = build_prompt(rec, {"carbon": 1.0}, 100)
    assert "100MW" in prompt


def test_build_prompt_includes_grid_demand_with_pue(carbon_priority_recommendation):
    rec = carbon_priority_recommendation
    prompt = build_prompt(rec, {"carbon": 1.0}, 100)
    assert "140MW" in prompt  # 100 * PUE


def test_build_prompt_includes_top_3_countries(carbon_priority_recommendation):
    rec = carbon_priority_recommendation
    prompt = build_prompt(rec, {"carbon": 1.0}, 100)
    for s in rec.rankings[:3]:
        assert s.iso3 in prompt


def test_build_prompt_normalises_priorities_to_percentages():
    rec = score_countries(mw=100, priorities={"cost": 4, "carbon": 1})
    prompt = build_prompt(rec, {"cost": 4, "carbon": 1}, 100)
    assert "80%" in prompt
    assert "20%" in prompt


def test_explain_recommendation_uses_injected_caller(carbon_priority_recommendation):
    rec = carbon_priority_recommendation
    captured = {}

    def fake_caller(system: str, prompt: str) -> str:
        captured["system"] = system
        captured["prompt"] = prompt
        return "  Norway is the strongest choice.  "

    result = explain_recommendation(rec, {"carbon": 1.0}, 100, caller=fake_caller)
    assert result == "Norway is the strongest choice."
    assert "energy consultant" in captured["system"].lower()
    assert "100MW" in captured["prompt"]


def test_build_prompt_lists_concrete_metrics_per_country(carbon_priority_recommendation):
    rec = carbon_priority_recommendation
    prompt = build_prompt(rec, {"carbon": 1.0}, 100)
    assert "gCO₂/kWh" in prompt
    assert "€" in prompt
    assert "Clean energy" in prompt
    assert "Grid" in prompt
