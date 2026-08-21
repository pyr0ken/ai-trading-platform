from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from app.services.sentiment_service import sentiment_service

router = APIRouter(prefix="/sentiment", tags=["sentiment"])

class TextPayload(BaseModel):
    id: str = Field(default="", description="Unique identifier for the item")
    text: str = Field(..., description="Content to analyze")

class BatchSentimentPayload(BaseModel):
    items: List[TextPayload]

class SentimentResult(BaseModel):
    id: str
    score: float
    label: str
    pos: float
    neg: float
    neu: float

@router.post("/analyze", response_model=SentimentResult)
def analyze(payload: TextPayload):
    try:
        res = sentiment_service.analyze_text(payload.text)
        res["id"] = payload.id
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-batch", response_model=List[SentimentResult])
def analyze_batch(payload: BatchSentimentPayload):
    try:
        raw_items = [{"id": item.id, "text": item.text} for item in payload.items]
        return sentiment_service.analyze_batch(raw_items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
