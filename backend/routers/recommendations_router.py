from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from backend.services.recommendation_engine import generate_recommendations

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations & Decision Engine"])

class RecRequest(BaseModel):
    commodity: str = "soybean"
    areaHectares: float = 3.5
    yieldQPerHa: Optional[float] = None
    soilType: Optional[str] = "black"
    irrigationType: Optional[str] = "rainfed"
    sowingDate: Optional[str] = None
    lat: float = 18.2333
    lng: float = 76.7167
    inputCostTotal: Optional[float] = None

@router.post("")
async def get_recommendation(req: RecRequest):
    result = generate_recommendations(
        commodity=req.commodity,
        area_hectares=req.areaHectares,
        yield_q_per_ha=req.yieldQPerHa,
        soil_type=req.soilType or "black",
        irrigation_type=req.irrigationType or "rainfed",
        sowing_date=req.sowingDate or datetime.now().strftime("%Y-%m-%d"),
        lat=req.lat,
        lng=req.lng,
        input_cost_total=req.inputCostTotal
    )
    return {"success": True, "data": result}
