import pytest
from services.data_loader import (
    load_all_data,
    get_prices,
    get_carbon,
    get_interconnection,
    get_all_country_data,
)


@pytest.fixture(scope="module", autouse=True)
def _load_once():
    load_all_data()


def test_get_prices_returns_iso3_keyed_dict():
    prices = get_prices()
    assert len(prices) > 0
    assert all(len(code) == 3 for code in prices.keys())
    assert all(isinstance(v, float) for v in prices.values())


def test_get_prices_contains_major_european_countries():
    prices = get_prices()
    for code in ["DEU", "FRA", "NOR", "POL"]:
        assert code in prices, f"{code} missing from prices"


def test_get_carbon_norway_is_clean_poland_is_dirty():
    carbon = get_carbon()
    assert carbon["NOR"] < 100, f"Norway should be clean, got {carbon['NOR']}"
    assert carbon["POL"] > 400, f"Poland should be dirty, got {carbon['POL']}"


def test_get_carbon_filters_to_europe_only():
    carbon = get_carbon()
    for non_european in ["USA", "AUS", "ARG", "BRA", "CHN"]:
        assert non_european not in carbon, f"{non_european} should not be in European carbon data"


def test_get_interconnection_uses_iso3_codes():
    interconn = get_interconnection()
    assert "DEU" in interconn
    assert "Germany" not in interconn


def test_get_interconnection_status_is_valid():
    interconn = get_interconnection()
    valid_statuses = {"exporter", "importer", "balanced"}
    for country, data in interconn.items():
        assert data["status"] in valid_statuses


def test_get_all_country_data_only_includes_matched_countries():
    data = get_all_country_data()
    prices = get_prices()
    carbon = get_carbon()

    for code in data.keys():
        assert code in prices
        assert code in carbon

    for code, country_data in data.items():
        assert "price_eur_mwh" in country_data
        assert "carbon_gco2_kwh" in country_data
        assert "interconnection" in country_data
