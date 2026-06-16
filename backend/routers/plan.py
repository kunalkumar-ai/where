from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.optimizer import plan_power_supply, plan_result_to_dict
from services.explainer import explain_power_plan

router = APIRouter(tags=["plan"])


class PlanRequest(BaseModel):
    location: str = Field(min_length=3, max_length=3)
    mw: float = Field(gt=0, le=2000)
    target_clean_pct: float = Field(default=90.0, ge=0, le=100)
    contract_years: int = Field(default=10, ge=1, le=30)
    explain: bool = Field(default=True)


@router.post("/plan")
def plan(req: PlanRequest) -> dict:
    try:
        result = plan_power_supply(
            location=req.location.upper(),
            mw=req.mw,
            target_clean_pct=req.target_clean_pct,
            contract_years=req.contract_years,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    response = plan_result_to_dict(result)
    response["explanation"] = explain_power_plan(result) if req.explain else None
    return response
