from fastapi import APIRouter
from services.data_loader import get_prices, get_carbon, get_interconnection, get_all_country_data

router = APIRouter(tags=["map"])


@router.get("/all")
def get_all() -> dict:
    return get_all_country_data()


@router.get("/prices")
def get_prices_data() -> dict[str, float]:
    return get_prices()


@router.get("/carbon")
def get_carbon_data() -> dict[str, float]:
    return get_carbon()


@router.get("/interconnection")
def get_interconnection_data() -> dict:
    return get_interconnection()
