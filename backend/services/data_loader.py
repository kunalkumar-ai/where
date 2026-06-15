import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

_cache: dict = {}


def load_all_data() -> None:
    _cache["prices"] = _load_prices()
    _cache["carbon"] = _load_carbon()
    _cache["interconnection"] = _load_interconnection()
    _cache["generation"] = _load_generation_mix()
    print(
        f"Loaded: {len(_cache['prices'])} prices, "
        f"{len(_cache['carbon'])} carbon, "
        f"{len(_cache['generation'])} generation mix"
    )


def get_prices() -> dict[str, float]:
    return _cache.get("prices", {})


def get_carbon() -> dict[str, float]:
    return _cache.get("carbon", {})


def get_interconnection() -> dict[str, dict]:
    return _cache.get("interconnection", {})


def get_generation() -> dict[str, dict]:
    return _cache.get("generation", {})


def get_all_country_data() -> dict[str, dict]:
    prices = get_prices()
    carbon = get_carbon()
    interconnection = get_interconnection()
    generation = get_generation()

    countries = set(prices.keys()) & set(carbon.keys())
    return {
        country: {
            "price_eur_mwh": prices[country],
            "carbon_gco2_kwh": carbon[country],
            "interconnection": interconnection.get(country, {}),
            "generation": generation.get(country, {}),
        }
        for country in countries
    }


def _load_prices() -> dict[str, float]:
    path = DATA_DIR / "ember_prices_monthly.csv"
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip()

    latest_year = pd.to_datetime(df["Date"]).dt.year.max()
    df_latest = df[pd.to_datetime(df["Date"]).dt.year == latest_year]

    avg = df_latest.groupby("ISO3 Code")["Price (EUR/MWhe)"].mean()
    return avg.round(2).to_dict()


def _load_carbon() -> dict[str, float]:
    path = DATA_DIR / "ember_yearly_europe.csv"
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip()

    df_co2 = df[
        (df["Variable"] == "CO2 intensity") &
        (df["Area type"] == "Country or economy") &
        (df["Continent"] == "Europe")
    ]
    latest_year = df_co2["Year"].max()
    df_latest = df_co2[df_co2["Year"] == latest_year]

    return df_latest.set_index("ISO 3 code")["Value"].round(1).to_dict()


COUNTRY_NAME_TO_ISO3: dict[str, str] = {
    "Austria": "AUT", "Belgium": "BEL", "Bulgaria": "BGR", "Croatia": "HRV",
    "Cyprus": "CYP", "Czechia": "CZE", "Denmark": "DNK", "Egypt": "EGY",
    "Estonia": "EST", "Finland": "FIN", "France": "FRA", "Germany": "DEU",
    "Greece": "GRC", "Hungary": "HUN", "Ireland": "IRL", "Italy": "ITA",
    "Latvia": "LVA", "Lithuania": "LTU", "Luxembourg": "LUX", "Malta": "MLT",
    "Moldova": "MDA", "Montenegro": "MNE", "Morocco": "MAR", "Netherlands": "NLD",
    "North Macedonia": "MKD", "Norway": "NOR", "Poland": "POL", "Portugal": "PRT",
    "Romania": "ROU", "Russia": "RUS", "Serbia": "SRB", "Slovakia": "SVK",
    "Slovenia": "SVN", "Spain": "ESP", "Sweden": "SWE", "Switzerland": "CHE",
    "Tunisia": "TUN", "Turkiye": "TUR", "United Kingdom": "GBR",
}


FUEL_MIX_VARIABLES: list[str] = [
    "Coal",
    "Gas",
    "Nuclear",
    "Hydro",
    "Wind",
    "Solar",
    "Bioenergy",
    "Other Fossil",
    "Other Renewables",
]


def _load_generation_mix() -> dict[str, dict]:
    """Per-country generation mix: clean share %, renewable share %, fuel breakdown."""
    path = DATA_DIR / "ember_yearly_europe.csv"
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip()

    df = df[
        (df["Category"] == "Electricity generation") &
        (df["Continent"] == "Europe") &
        (df["Area type"] == "Country or economy") &
        (df["Unit"] == "%")
    ]
    latest_year = df["Year"].max()
    df = df[df["Year"] == latest_year]

    result: dict[str, dict] = {}
    for iso3, group in df.groupby("ISO 3 code"):
        values: dict[str, float] = dict(zip(group["Variable"], group["Value"]))

        mix_pct: dict[str, float] = {}
        for var in FUEL_MIX_VARIABLES:
            key = var.lower().replace(" ", "_")
            mix_pct[key] = round(float(values.get(var, 0.0)), 2)

        result[iso3] = {
            "clean_share_pct": round(float(values.get("Clean", 0.0)), 2),
            "renewable_share_pct": round(float(values.get("Renewables", 0.0)), 2),
            "mix_pct": mix_pct,
        }
    return result


def _load_interconnection() -> dict[str, dict]:
    path = DATA_DIR / "europe_interconnection_data" / "Country indicators" / "country_monthly_chart_2024.csv"
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip()

    avg = df.groupby("Country")[["RES-E", "NET-P"]].mean().round(2)

    result = {}
    for country_name, row in avg.iterrows():
        iso3 = COUNTRY_NAME_TO_ISO3.get(country_name)
        if not iso3:
            continue

        net_p = float(row["NET-P"])
        if net_p > 5:
            status = "exporter"
        elif net_p < -5:
            status = "importer"
        else:
            status = "balanced"

        result[iso3] = {
            "renewable_share_pct": float(row["RES-E"]),
            "net_position_twh": net_p,
            "status": status,
        }
    return result
