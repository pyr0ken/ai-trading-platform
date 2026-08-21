# AI Trading Platform — System Architecture

This document describes the high-level architecture, module boundaries, data pipelines, and design patterns of the **AI Trading Platform**.

---

## 📐 System Topology

The platform operates as a **hybrid Next.js + FastAPI microservice architecture**:

```
                               ┌──────────────────────────────────────────────┐
                               │               Client Web Application         │
                               │        React 19 + TradingView Charts         │
                               └──────────────────────┬───────────────────────┘
                                                      │ HTTP / WebSocket / EventStream
                                                      ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                Next.js 16 Web Application / Gateway (Node.js)                          │
 │                                                                                                        │
 │   ┌───────────────────────┐    ┌─────────────────────────┐    ┌──────────────────────────────────┐   │
 │   │  Regime Engine (TS)   │    │  No-Trade Gate (TS)     │    │  LLM Streaming Router (TS)       │   │
 │   │  `lib/analysis/`      │    │  `setup-resolver.ts`    │    │  `app/api/analysis/stream/`      │   │
 │   └───────────────────────┘    └─────────────────────────┘    └──────────────────────────────────┘   │
 └─────────────┬──────────────────────────────┬───────────────────────────────────┬───────────────────────┘
               │                              │                                   │
               │ REST API                     │ Local Storage / Sync              │ HTTP API / SSE
               ▼                              ▼                                   ▼
 ┌───────────────────────────┐  ┌───────────────────────────┐           ┌───────────────────────────┐
 │   FastAPI Python Backend  │  │   SQLite / Supabase DB    │           │  Local LLM / 9router      │
 │                           │  │                           │           │                           │
 │  • DBSCAN S&R Clustering  │  │  • Signal History         │           │  • Institutional Analysis │
 │  • Vectorized Backtest    │  │  • Watchlists & Settings  │           │  • Narrative Generation   │
 │  • VADER NLP Sentiment    │  │  • Paper Portfolio        │           │  • Risk Auditing          │
 └───────────────────────────┘  └───────────────────────────┘           └───────────────────────────┘
```

---

## 🧱 Module Responsibility Boundaries

### 1. Next.js App Router Gateway (`/`)
* **Role**: Primary UI rendering, exchange connectivity via CCXT, market data ingestion, and zero-latency user interactions.
* **Key Features**:
  * Real-time TradingView `lightweight-charts` rendering.
  * Deterministic market regime detection (ADX, ATR, EMA stack alignment).
  * Server-Sent Events (SSE) streaming for AI Trade Setup generation.
  * Local zero-config persistence using SQLite (`better-sqlite3`) with fallback to Supabase cloud database.

### 2. Python FastAPI Quant & NLP Microservice (`/backend`)
* **Role**: Heavy-duty mathematical, machine learning, and natural language processing tasks.
* **Key Features**:
  * **DBSCAN Clustering**: Machine learning-based Support & Resistance level grouping based on dynamic price dispersion.
  * **Vectorized Backtesting**: High-speed backtesting using Pandas & NumPy arrays across 100,000+ historical candles.
  * **VADER Financial NLP**: Financial and crypto-optimized lexicon sentiment scoring on news headlines and social feeds.

---

## 🔄 Data Ingestion & Signal Lifecycle

1. **Market Data Fetching**: Next.js fetches real-time tick and candle data from exchange REST/WebSocket APIs (via CCXT).
2. **Deterministic Context Computation**:
   * Next.js calculates technical indicators deterministically (`lib/market/indicators.ts`).
   * Next.js queries FastAPI Python microservice (`/api/v1/clustering/sr-clusters`) for ML-driven decision zones.
3. **Regime Gating**: `market-regime.ts` and `no-trade-gate.ts` validate whether market conditions (ADX > 25, ATR volatility, trend alignment) warrant executing a trade.
4. **Institutional Prompt Building**: The structured market context is formatted into a prompt payload and sent to the LLM (`lib/llm/llm-client.ts`).
5. **Streaming Response**: The LLM streams structured JSON & Markdown analysis back to the trader UI.
