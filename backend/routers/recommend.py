from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.scorer import score_countries, recommendation_to_dict
from services.explainer import explain_recommendation

router = APIRouter(tags=["recommend"])


class Priorities(BaseModel):
    cost: float = Field(default=0.0, ge=0)
    carbon: float = Field(default=0.0, ge=0)
    clean: float = Field(default=0.0, ge=0)
    grid: float = Field(default=0.0, ge=0)


class RecommendRequest(BaseModel):
    mw: float = Field(gt=0, le=2000)
    priorities: Priorities
    top_n: int = Field(default=5, ge=1, le=20)
    explain: bool = Field(default=True)


@router.post("/recommend")
def recommend(req: RecommendRequest) -> dict:
    rec = score_countries(mw=req.mw, priorities=req.priorities.model_dump(), top_n=req.top_n)
    if not rec.rankings:
        raise HTTPException(status_code=503, detail="No country data loaded — backend not ready.")

    response = recommendation_to_dict(rec)
    response["explanation"] = (
        explain_recommendation(rec, req.priorities.model_dump(), req.mw)
        if req.explain
        else None
    )
    return response
