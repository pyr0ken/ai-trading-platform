# 📈 Frontend UI — Part 3: Interactive Chart & Bidirectional Overlays

> **Module:** `frontend/features/market-charts/components/`  
> **Core Stack:** `TradingView Lightweight Charts` (Open Source Canvas) + Layered SVG/Canvas AI Overlay.

---

## 1. Multi-Layer Canvas Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: AI Canvas / SVG Overlay                           │
│  - Dynamic horizontal S&R lines with price badges           │
│  - Anchored VWAP with ±1σ and ±2σ shaded dispersion bands   │
│  - Colored Supply/Demand Order Blocks (Green/Red boxes)     │
│  - User Region Selection bounding box                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Lightweight Charts HTML5 Canvas Engine (60 FPS)   │
│  - Candlesticks, volume bars, time scale, price scale       │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Coordinate Transform Engine                       │
│  - `chart.timeScale().timeToCoordinate(timestamp)`          │
│  - `series.priceToCoordinate(price)`                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Bidirectional User Selection Protocol

1. User clicks the **"Select Region"** tool on the chart toolbar.
2. User drags a box across a specific price & time range.
3. The component extracts:
   ```typescript
   const selectedRange = {
     symbol: 'BTC/USDT',
     timeframe: '1h',
     price_low: 63200,
     price_high: 65400,
     time_start: 1756587600,
     time_end: 1756674000
   };
   ```
4. A **Context Chip** is attached to the chat composer: `[ 📍 Selected Range: $63.2k - $65.4k × ]`.
5. When the user sends a message, this geometry is injected into the ReAct prompt.
