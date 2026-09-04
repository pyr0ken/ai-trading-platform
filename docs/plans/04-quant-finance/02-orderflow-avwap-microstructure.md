# 🌊 Quant Finance — Part 2: Order Flow, CVD & Anchored VWAP

> **Module:** `backend/app/features/quant/` & `backend/app/features/market/`  
> **Mathematical Focus:** Cumulative Volume Delta (CVD), Order Book Imbalance Ratio, Anchored Volume Weighted Average Price with $\pm k\sigma$ bands.

---

## 1. Anchored VWAP (AVWAP) Mathematical Formula

Given an anchor timestamp $t_0$, for all subsequent bars $t \ge t_0$:

$$\text{VWAP}_t = \frac{\sum_{i=t_0}^t (\text{TypicalPrice}_i \times \text{Volume}_i)}{\sum_{i=t_0}^t \text{Volume}_i}$$

### Volume-Weighted Population Standard Deviation ($\sigma_t$):

$$\sigma_t = \sqrt{\frac{\sum_{i=t_0}^t \text{Volume}_i \times (\text{TypicalPrice}_i - \text{VWAP}_t)^2}{\sum_{i=t_0}^t \text{Volume}_i}}$$

### Standard Deviation Bands:
$$\text{Upper Band}_k = \text{VWAP}_t + k \cdot \sigma_t \quad (k \in \{1, 2, 3\})$$
$$\text{Lower Band}_k = \text{VWAP}_t - k \cdot \sigma_t \quad (k \in \{1, 2, 3\})$$

---

## 2. Order Book Imbalance Ratio (Microstructure)

Measures short-term aggressor pressure across top $N$ bids and asks:

$$\text{Imbalance Ratio} = \frac{\sum \text{BidVolume}_N - \sum \text{AskVolume}_N}{\sum \text{BidVolume}_N + \sum \text{AskVolume}_N}$$

- Value $> +0.35$: Aggressive institutional bid absorption (Bullish).
- Value $< -0.35$: Heavy overhead ask pressure / liquidation cascade (Bearish).
