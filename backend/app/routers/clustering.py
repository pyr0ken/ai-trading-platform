from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from app.services.clustering_service import clustering_service

router = APIRouter(prefix="/clustering", tags=["clustering"])

class ClusteringPayload(BaseModel):
    prices: List[float] = Field(..., description="List of swing high/low price levels")
    spot_price: float = Field(..., description="Current market spot price")
    atr: float = Field(..., description="Average True Range for normalization")
    eps_pct: float = Field(default=0.015, description="Epsilon distance as a percentage of spot price")
    min_samples: int = Field(default=2, description="Minimum number of touches in a cluster")

class SREntity(BaseModel):
    id: str
    kind: str
    priceLow: float
    priceHigh: float
    priceMid: float
    distancePct: float
    distanceInAtr: float
    touchCount: int
    strength: float

class ClusteringResult(BaseModel):
    resistanceZones: List[SREntity]
    supportZones: List[SREntity]
    activeZoneId: Optional[str] = None

@router.post("/sr-clusters", response_model=ClusteringResult)
def get_sr_clusters(payload: ClusteringPayload):
    try:
        res = clustering_service.cluster_sr_levels(
            prices=payload.prices,
            spot_price=payload.spot_price,
            atr=payload.atr,
            eps_pct=payload.eps_pct,
            min_samples=payload.min_samples
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
