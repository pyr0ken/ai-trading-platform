# 🛡️ Advanced Innovations — Part 2: Drawdown Circuit Breaker & Behavioral Risk Guard

> **Target Module:** `backend/app/features/quant/risk/circuit_breaker.py`  
> **Purpose:** Protect user capital from catastrophic drawdowns and prevent psychological "Revenge Trading" through dynamic Kelly contraction.

---

## 1. Risk Governor Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                 📊 Paper Trading Execution Stream           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│        🔍 Behavioral & Consecutive Loss Detector             │
│   - Tracks: Consecutive Losses in 24h                       │
│   - Tracks: Rolling Peak-to-Trough Drawdown %                │
│   - Tracks: Rapid Over-Trading Frequency                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
        ┌──────────────────────┴──────────────────────┐
        ▼ (Condition Triggered)                       ▼ (Normal State)
┌──────────────────────────────┐              ┌──────────────────────────────┐
│  🚨 CIRCUIT BREAKER TRIPPED  │              │     ✅ NORMAL OPERATION      │
│  - Contraction: Risk 1.5%➔0.5%│              │  - Standard Half-Kelly Size  │
│  - Cooldown: 60 min lockout  │              │  - Standard Leverage Allowed │
│  - Chat Warning & Coaching   │              └──────────────────────────────┘
└──────────────────────────────┘
```

---

## 2. Mathematical Contraction Formula

When rolling drawdown $DD = \frac{\text{PeakEquity} - \text{CurrentEquity}}{\text{PeakEquity}}$ crosses thresholds:

$$\text{Active Risk Multiplier } (\lambda) = \begin{cases} 
1.0 & \text{if } DD < 3\% \text{ and losses} \le 1 \\
0.5 & \text{if } 3\% \le DD < 6\% \text{ or losses} = 2 \\
0.25 & \text{if } 6\% \le DD < 10\% \text{ or losses} = 3 \\
0.0 & \text{if } DD \ge 10\% \text{ (Full Circuit Breaker Lockout)}
\end{cases}$$

$$\text{Effective Position Size} = \text{BaseKellySize} \times \lambda$$

---

## 3. Concrete Implementation Example (Python)

```python
# backend/app/features/quant/risk/circuit_breaker.py
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

class RiskGovernor:
    def __init__(self, max_daily_drawdown_pct=0.06, max_consecutive_losses=2):
        self.max_daily_dd = max_daily_drawdown_pct
        self.max_losses = max_consecutive_losses

    def evaluate_trader_state(self, trade_history: List[Dict[str, Any]], peak_balance: float, current_balance: float) -> Dict[str, Any]:
        drawdown_pct = (peak_balance - current_balance) / peak_balance if peak_balance > 0 else 0.0
        
        # Check last trades within 24h
        now = datetime.now(timezone.utc)
        recent_trades = [
            t for t in trade_history 
            if (now - datetime.fromisoformat(t["closed_at"])) < timedelta(hours=24)
        ]
        
        consecutive_losses = 0
        for t in reversed(recent_trades):
            if t["pnl"] < 0:
                consecutive_losses += 1
            else:
                break

        if drawdown_pct >= 0.10:
            return {
                "status": "HARD_LOCKOUT",
                "risk_multiplier": 0.0,
                "message": "🚨 توقف اضطراری: افت سرمایه بیش از ۱۰٪ در یک روز. معاملات جدید تا فردا غیرفعال شد."
            }
        elif consecutive_losses >= self.max_losses:
            return {
                "status": "THROTTLED",
                "risk_multiplier": 0.33,
                "message": f"⚠️ اخطار ریسک: {consecutive_losses} معامله زیانده پیاپی. حجم معاملات بعدی جهت مهار ریسک به یکسوم کاهش یافت."
            }
        
        return {"status": "HEALTHY", "risk_multiplier": 1.0, "message": "وضعیت ریسک نرمال است."}
```
