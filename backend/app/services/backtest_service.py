"""
High-Performance Vectorized Backtester Service using Pandas and NumPy.
Simulates trading strategies over candle historical series.
"""

from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

class BacktestService:
    def run_backtest(
        self,
        candles: List[Dict[str, Any]],
        initial_balance: float = 10000.0,
        strategy_type: str = "RSI_OVERSOLD_OVERBOUGHT",
        rsi_period: int = 14,
        rsi_buy_level: float = 30.0,
        rsi_sell_level: float = 70.0,
        stop_loss_pct: float = 2.0,
        take_profit_pct: float = 4.0
    ) -> Dict[str, Any]:
        if not candles or len(candles) < rsi_period + 5:
            return {
                "error": "Insufficient candle data for backtest",
                "totalTrades": 0,
                "winRate": 0.0,
                "totalProfitPct": 0.0,
                "equityCurve": []
            }

        df = pd.DataFrame(candles)
        # Ensure correct column names
        for col in ["timestamp", "open", "high", "low", "close", "volume"]:
            if col not in df.columns:
                return {"error": f"Missing required candle column: {col}"}

        df["close"] = df["close"].astype(float)
        df["high"] = df["high"].astype(float)
        df["low"] = df["low"].astype(float)

        # 1. Compute RSI vectorized
        delta = df["close"].diff()
        gain = pd.Series(delta.where(delta > 0, 0)).rolling(window=rsi_period).mean()
        loss = pd.Series(-delta.where(delta < 0, 0)).rolling(window=rsi_period).mean()
        
        # Avoid division by zero
        loss_replaced = pd.Series(loss).replace(0, np.nan)
        rs = gain / loss_replaced
        df["rsi"] = 100 - (100 / (1 + rs))
        df["rsi"] = df["rsi"].fillna(50)

        # 2. Simulation variables
        balance = initial_balance
        peak_balance = initial_balance
        max_drawdown = 0.0
        position = None  # None or Dict
        trades = []
        equity_curve = [{"timestamp": int(float(df.iloc[0]["timestamp"])), "balance": balance}]

        # Use itertuples with getattr for type safety on dynamic properties
        for idx, row in enumerate(df.itertuples()):
            curr_price = float(getattr(row, "close"))
            curr_time = int(float(getattr(row, "timestamp")))
            rsi_val = float(getattr(row, "rsi"))
            low_val = float(getattr(row, "low"))
            high_val = float(getattr(row, "high"))

            # Check if in position -> Evaluate SL / TP
            if position:
                entry_price = position["entry_price"]
                sl_price = entry_price * (1 - stop_loss_pct / 100)
                tp_price = entry_price * (1 + take_profit_pct / 100)

                # Exit trigger: SL hit, TP hit, or Sell signal
                exit_reason = None
                exit_price = curr_price
                
                if low_val <= sl_price:
                    exit_reason = "STOP_LOSS"
                    exit_price = sl_price
                elif high_val >= tp_price:
                    exit_reason = "TAKE_PROFIT"
                    exit_price = tp_price
                elif rsi_val >= rsi_sell_level:
                    exit_reason = "SIGNAL_SELL"
                    exit_price = curr_price

                if exit_reason:
                    pnl_pct = ((exit_price - entry_price) / entry_price) * 100
                    pnl_amount = position["amount"] * (exit_price - entry_price)
                    balance += pnl_amount

                    trades.append({
                        "id": len(trades) + 1,
                        "entryTime": position["entry_time"],
                        "exitTime": curr_time,
                        "entryPrice": entry_price,
                        "exitPrice": exit_price,
                        "pnlPct": round(pnl_pct, 2),
                        "pnlAmount": round(pnl_amount, 2),
                        "reason": exit_reason,
                        "win": pnl_pct > 0
                    })
                    position = None

            # Entry Trigger: If no position and RSI Oversold -> Buy Long
            elif rsi_val <= rsi_buy_level:
                amount = balance / curr_price  # All-in position size for simulation
                position = {
                    "entry_price": curr_price,
                    "entry_time": curr_time,
                    "amount": amount
                }

            # Track Drawdown and Equity Curve
            peak_balance = max(peak_balance, balance)
            drawdown = (peak_balance - balance) / peak_balance if peak_balance > 0 else 0
            max_drawdown = max(max_drawdown, drawdown)

            # Record periodic equity points (sample 50 points)
            step_size = max(1, len(df) // 50)
            if idx % step_size == 0:
                equity_curve.append({
                    "timestamp": curr_time,
                    "balance": round(balance, 2)
                })

        # Final Equity point
        equity_curve.append({
            "timestamp": int(float(df.iloc[-1]["timestamp"])),
            "balance": round(balance, 2)
        })

        # 3. Calculate Performance Metrics
        total_trades = len(trades)
        winning_trades = sum(1 for t in trades if t["win"])
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0.0
        total_profit_pct = ((balance - initial_balance) / initial_balance) * 100

        # Sharpe ratio calculation if trades exist
        if total_trades > 1:
            pnls = np.array([t["pnlPct"] for t in trades])
            std_dev = np.std(pnls)
            sharpe_ratio = float(np.mean(pnls) / std_dev) if std_dev > 0 else 0.0
        else:
            sharpe_ratio = 0.0

        return {
            "initialBalance": initial_balance,
            "finalBalance": round(balance, 2),
            "totalProfitPct": round(total_profit_pct, 2),
            "totalTrades": total_trades,
            "winRate": round(win_rate, 2),
            "maxDrawdownPct": round(max_drawdown * 100, 2),
            "sharpeRatio": round(sharpe_ratio, 2),
            "trades": trades,
            "equityCurve": equity_curve
        }

backtest_service = BacktestService()
