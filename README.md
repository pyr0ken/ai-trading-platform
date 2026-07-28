# 🚀 Market Data AI Analyzer — Full-Stack Next.js Application

A production-quality full-stack **Next.js 14+ (App Router)** web application that migrates the Python quantitative fetcher pipeline into an interactive browser dashboard.

Features **RTL Persian typography (Vazirmatn)**, **TradingView Chart Widget**, **Local OpenAI-Compatible LLM Streaming (`http://localhost:20128/v1`)**, **Node CCXT Market Integration**, **Server-Side Quantitative TA Indicators (EMA, SMA, RSI, MACD, Bollinger Bands, ATR, VWAP, S&R)**, and **Crypto News Aggregation**.

---

## 🏗️ Architecture

```
web/
├── app/
│   ├── page.tsx                      # Main Dashboard Page
│   ├── layout.tsx                    # Root Layout (RTL & Vazirmatn Font)
│   └── api/
│       ├── market/full-context/      # Unified Market & Indicators Route Handler
│       ├── news/                     # News Feed Route Handler
│       └── analysis/stream/          # Local LLM SSE Stream Route Handler
├── components/
│   ├── layout/header.tsx             # Header & Local LLM Health Status
│   ├── market/
│   │   ├── coin-selector.tsx         # Coin & Timeframe Selector
│   │   ├── market-stats-card.tsx     # Price, CVD, Orderbook Depth & Fear/Greed
│   │   └── indicator-table.tsx       # Calculated TA Indicators & S&R Levels
│   ├── analysis/
│   │   ├── persian-analysis-card.tsx # RTL Markdown Analysis Container
│   │   └── analysis-skeleton.tsx     # Loading Skeleton
│   ├── news/news-feed.tsx            # Cleaned News Feed List
│   └── tradingview/tradingview-chart.tsx # Synchronized TradingView Embed
├── lib/
│   ├── llm/llm-client.ts             # OpenAI-Compatible Client (http://localhost:20128/v1)
│   ├── market/
│   │   ├── ccxt-service.ts           # Node CCXT Exchange Fetcher
│   │   ├── indicators.ts             # TypeScript TA Indicator Engine
│   │   └── macro-service.ts          # Alternative.me & DefiLlama Fetchers
│   ├── news/news-service.ts          # RSS Parser & Sanitizer
│   └── prompts/analysis-prompt.ts    # Senior Trader Persian Prompt Builder
└── types/                            # TypeScript Data Contracts
```

---

## ⚙️ Environment Variables

Create or edit `.env.local`:

```env
LLM_BASE_URL=http://localhost:20128/v1
LLM_API_KEY=not-needed
LLM_MODEL=default
DEFAULT_EXCHANGE=kucoin
DEFAULT_TIMEFRAME=1h
```

---

## 💻 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm run start
```
