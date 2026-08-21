from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.services.backtest_service import backtest_service

router = APIRouter(prefix="/backtest", tags=["backtest"])

class CandleInput(BaseModel):
    timestamp: float
    open: float
    high: float
    low: float
    close: float
    volume: float

class BacktestPayload(BaseModel):
    candles: List[CandleInput]
    initial_balance: float = Field(default=10000.0, description="Starting capital in USD")
    strategy_type: str = Field(default="RSI_OVERSOLD_OVERBOUGHT")
    rsi_period: int = Field(default=14)
    rsi_buy_level: float = Field(default=30.0)
    rsi_sell_level: float = Field(default=70.0)
    stop_loss_pct: float = Field(default=2.0)
    take_profit_pct: float = Field(default=4.0)

class TradeResult(BaseModel):
    id: int
    entryTime: int
    exitTime: int
    entryPrice: float
    exitPrice: float
    pnlPct: float
    pnlAmount: float
    reason: str
    win: bool

class EquityPoint(BaseModel):
    timestamp: int
    balance: float

class BacktestResponse(BaseModel):
    initialBalance: float
    finalBalance: float
    totalProfitPct: float
    totalTrades: int
    winRate: float
    maxDrawdownPct: float
    sharpeRatio: float
    trades: List[TradeResult]
    equityCurve: List[EquityPoint]
    error: Optional[str] = None

@router.post("/run", response_model=BacktestResponse)
def run_backtest(payload: BacktestPayload):
    try:
        raw_candles = [c.model_dump() for c in payload.candles]
        res = backtest_service.run_backtest(
            candles=raw_candles,
            initial_balance=payload.initial_balance,
            strategy_type=payload.strategy_type,
            rsi_period=payload.rsi_period,
            rsi_buy_level=payload.rsi_buy_level,
            rsi_sell_level=payload.rsi_sell_level,
            stop_loss_pct=payload.stop_loss_pct,
            take_profit_pct=payload.take_profit_pct
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
