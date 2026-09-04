# ⚖️ Quant Finance — Part 3: Institutional Risk Management & Vectorized Backtesting

> **Module:** `backend/app/features/quant/risk/` & `backend/app/features/quant/backtesting/`  
> **Key Formulas:** Half-Kelly Criterion, Dynamic ATR Stop Loss Buffers, Fast Vector Backtesting.

---

## 1. Position Sizing & Half-Kelly Criterion

To ensure capital preservation and prevent geometric ruin:

### A. ATR Dynamic Stop Buffer:
$$\text{SL Distance} = \max\left(|\text{Entry} - \text{StructureLevel}|, \; 2.0 \times \text{ATR}_{14}\right)$$

### B. Optimal Position Size:
$$\text{Max Risk (\$) } = \text{Account Balance} \times \left(\frac{\text{Risk \%}}{100}\right)$$
$$\text{Position Units} = \frac{\text{Max Risk (\$) }}{\text{SL Distance}}$$

### C. Fractional Kelly Multiplier:
$$f^* = \frac{p \cdot b - (1 - p)}{b} \times 0.5$$
*(Where $p$ = historical strategy winrate, $b$ = payoff ratio $R:R$)*

---

## 2. Fast Vectorized Backtest Engine

Allows the AI Agent to answer queries like:  
*«اگه استراتژی واگرایی RSI رو روی سولانا در ۳ ماه گذشته تست میکردیم چطور بود؟»*

The backtest returns:
1. **Winrate (%)** and **Profit Factor**.
2. **Maximum Drawdown (MDD %)**.
3. **Array of Equity Curve Points** ($x = \text{Timestamp}, y = \text{Balance}$) rendered in the chat stream.
