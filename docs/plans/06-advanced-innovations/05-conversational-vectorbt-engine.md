# ⚡ Advanced Innovations — Part 5: Conversational `vectorbt` Backtesting Tool
## Real-Time Vectorized Multi-Year Strategy Simulation in Chat

> **Target Module:** `backend/app/features/ai_agent/tools/vectorbt_tool.py`  
> **Performance SLA:** Full multi-year parameter optimization & equity curve generation in $< 500\text{ ms}$.

---

## 1. Conversational Backtest Flow

```text
[User in Chat: "اگه تقاطع EMA 20 و 50 رو در ۲ سال گذشته روی ETH میزدیم سودده بود؟"]
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Agent invokes `run_vectorbt_simulation` Tool             │
│    - Loads cached multi-year 1h/4h OHLCV NumPy arrays       │
│    - Runs Numba JIT-compiled vectorized signal matrix       │
│    - Computes: Total Return %, Winrate, Sharpe, Max Drawdown│
│    - Extracts: Downsampled 50-point Equity Curve array      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 📊 In-Chat Interactive Backtest Card (Frontend)             │
│    - Mini SVG Equity Curve with peak/drawdown markers       │
│    - Stats Table: Win Rate 64.2% | Sharpe 2.14 | MDD -12.4% │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Concrete Implementation Example (Python Tool)

```python
# backend/app/features/ai_agent/tools/vectorbt_tool.py
from typing import Dict, Any
import vectorbt as vbt
import numpy as np
import pandas as pd
from app.features.ai_agent.engine.tool_registry import registry
from app.features.market.ccxt_service import MarketDataService

@registry.register(
    name="run_fast_strategy_backtest",
    description="Run high-speed vectorized backtesting (vectorbt/Numba) for indicator crossing strategies on historical data."
)
async def run_fast_strategy_backtest(
    symbol: str = "BTC/USDT",
    timeframe: str = "1h",
    strategy_type: str = "EMA_CROSS",
    fast_period: int = 20,
    slow_period: int = 50
) -> Dict[str, Any]:
    # 1. Fetch OHLCV history
    df = await MarketDataService.get_ohlcv_df(symbol, timeframe, limit=2000)
    close = df["close"]

    # 2. Vectorized Signal Matrix
    fast_ma = vbt.MA.run(close, fast_period)
    slow_ma = vbt.MA.run(close, slow_period)
    
    entries = fast_ma.ma_crossed_above(slow_ma)
    exits = fast_ma.ma_crossed_below(slow_ma)

    # 3. Portfolio Simulation with Fees
    portfolio = vbt.Portfolio.from_signals(
        close, entries, exits, init_cash=10000, fees=0.001, slippage=0.0005
    )

    # 4. Extract Performance Metrics
    stats = portfolio.stats()
    equity_series = portfolio.value()
    
    # Downsample equity curve to 50 points for chat rendering
    step = max(1, len(equity_series) // 50)
    sampled_equity = [
        {"time": int(ts.timestamp()), "value": round(val, 2)} 
        for ts, val in equity_series.iloc[::step].items()
    ]

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "total_return_pct": round(float(portfolio.total_return()) * 100, 2),
        "win_rate_pct": round(float(stats.get("Win Rate [%]", 0)), 2),
        "sharpe_ratio": round(float(stats.get("Sharpe Ratio", 0)), 2),
        "max_drawdown_pct": round(float(stats.get("Max Drawdown [%]", 0)), 2),
        "total_trades": int(stats.get("Total Trades", 0)),
        "equity_curve": sampled_equity
    }
```
