# 📊 Quant Finance — Part 1: Deterministic Indicators & DBSCAN S&R Clustering

> **Module:** `backend/app/features/quant/`  
> **Core Engine:** Pandas, NumPy, Scikit-Learn (DBSCAN).  
> **Rule:** 100% Deterministic — Zero LLM Hallucinations in Calculations.

---

## 1. Technical Indicator Pipeline

Calculated via vectorized Pandas operations on OHLCV DataFrames:

- **Trend & Momentum:** EMA (20, 50, 200), RSI (14 period with wilder smoothing), MACD (12, 26, 9).
- **Volatility & Bands:** Average True Range (ATR 14), Bollinger Bands (20 period, 2.0 std dev).
- **Directional Strength:** Average Directional Index (ADX 14 with +DI/-DI).

---

## 2. Dynamic Support & Resistance Clustering (DBSCAN)

Instead of naive pivot points, we use **Density-Based Spatial Clustering of Applications with Noise (DBSCAN)**:

```python
from sklearn.cluster import DBSCAN
import numpy as np

def cluster_support_resistance(highs: np.ndarray, lows: np.ndarray, current_price: float, eps_pct=0.012) -> list[dict]:
    pivots = np.concatenate([highs, lows]).reshape(-1, 1)
    eps = current_price * eps_pct
    db = DBSCAN(eps=eps, min_samples=3).fit(pivots)
    
    clusters = []
    for label in set(db.labels_):
        if label == -1:
            continue
        cluster_points = pivots[db.labels_ == label]
        mean_level = float(np.mean(cluster_points))
        clusters.append({
            "level": mean_level,
            "touches": len(cluster_points),
            "type": "SUPPORT" if mean_level < current_price else "RESISTANCE"
        })
    return sorted(clusters, key=lambda x: x["level"])
```
