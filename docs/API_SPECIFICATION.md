# AI Trading Platform — API Specification

This document details the API endpoints, schemas, and payloads for the communication between the Next.js gateway, the Python microservice, and external LLM/data providers.

---

## 🐍 Python FastAPI Backend Endpoints (`http://127.0.0.1:8000`)

All backend APIs are prefixed with `/api/v1`.

### 1. Vectorized OHLCV Backtesting
* **Endpoint**: `POST /api/v1/backtest/run`
* **Description**: Computes high-performance vectorized backtest metrics on a candle series.
* **Request Payload (`BacktestPayload`)**:
  ```json
  {
    "candles": [
      { "timestamp": 1700000000, "open": 50000.0, "high": 50500.0, "low": 49800.0, "close": 50200.0, "volume": 120.5 }
    ],
    "initial_balance": 10000.0,
    "strategy_type": "RSI_OVERSOLD_OVERBOUGHT",
    "rsi_period": 14,
    "rsi_buy_level": 30.0,
    "rsi_sell_level": 70.0,
    "stop_loss_pct": 2.0,
    "take_profit_pct": 4.0
  }
  ```
* **Response Body (`BacktestResponse`)**:
  ```json
  {
    "initialBalance": 10000.0,
    "finalBalance": 10450.0,
    "totalProfitPct": 4.5,
    "totalTrades": 12,
    "winRate": 66.67,
    "maxDrawdownPct": 1.25,
    "sharpeRatio": 1.84,
    "trades": [
      {
        "id": 1,
        "entryTime": 1700000000,
        "exitTime": 1700007200,
        "entryPrice": 50200.0,
        "exitPrice": 52208.0,
        "pnlPct": 4.0,
        "pnlAmount": 400.0,
        "reason": "TAKE_PROFIT",
        "win": true
      }
    ],
    "equityCurve": [
      { "timestamp": 1700000000, "balance": 10000.0 }
    ]
  }
  ```

---

### 2. S&R Zone Clustering (DBSCAN)
* **Endpoint**: `POST /api/v1/clustering/sr-clusters`
* **Description**: Clusters raw swing highs and lows into dynamic Support and Resistance bands.
* **Request Payload (`ClusteringPayload`)**:
  ```json
  {
    "prices": [64000.0, 64050.0, 64100.0, 68000.0, 68050.0, 68100.0],
    "spot_price": 66000.0,
    "atr": 500.0,
    "eps_pct": 0.015,
    "min_samples": 2
  }
  ```
* **Response Body (`ClusteringResult`)**:
  ```json
  {
    "resistanceZones": [
      {
        "id": "R1",
        "kind": "RESISTANCE",
        "priceLow": 68000.0,
        "priceHigh": 68100.0,
        "priceMid": 68050.0,
        "distancePct": 3.11,
        "distanceInAtr": 4.1,
        "touchCount": 3,
        "strength": 29.26
      }
    ],
    "supportZones": [
      {
        "id": "S1",
        "kind": "SUPPORT",
        "priceLow": 64000.0,
        "priceHigh": 64100.0,
        "priceMid": 64050.0,
        "distancePct": -2.95,
        "distanceInAtr": 3.9,
        "touchCount": 3,
        "strength": 29.22
      }
    ],
    "activeZoneId": null
  }
  ```

---

### 3. Batch NLP Sentiment Analysis
* **Endpoint**: `POST /api/v1/sentiment/analyze-batch`
* **Description**: Evaluates polarized compound scores on social inputs or news headlines.
* **Request Payload (`BatchSentimentPayload`)**:
  ```json
  {
    "items": [
      { "id": "tweet_123", "text": "Fed keeps rates unchanged, BTC surging bullish!" }
    ]
  }
  ```
* **Response Body (`List[SentimentResult]`)**:
  ```json
  [
    {
      "id": "tweet_123",
      "score": 0.659,
      "label": "BULLISH",
      "pos": 0.42,
      "neg": 0.0,
      "neu": 0.58
    }
  ]
  ```
