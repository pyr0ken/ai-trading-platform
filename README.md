# 📈 AI Trading Platform (پلتفرم معاملاتی هوشمند)

[![Next.js](https://img.shields.io/badge/Next.js-16.2.11-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python)](https://www.python.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.0-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Better--SQLite3-003B57?logo=sqlite)](https://sqlite.org/)

An institutional-grade **AI-powered Quantitative Trading Platform** built with **Next.js 16 (React 19)** frontend gateway and a high-performance **Python FastAPI Microservice** for vectorized backtesting, machine learning S&R clustering, and financial NLP sentiment analysis.

[English Description](#-system-architecture) • [توضیحات فارسی](#-درباره-پروژه-به-فارسی) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

---

## 🇮🇷 درباره پروژه (به فارسی)

این پلتفرم یک سیستم کامل **معاملات الگوریتمی و هوش مصنوعی** است که با ترکیب قدرت انعطافپذیر فرانتاند **Next.js** و سرعت بالای محاسبات ریاضی و ماشینی **Python (FastAPI)** پیادهسازی شده است:

* ⚡ **تشخیص وضعیت بازار (Market Regime Detection)**: محاسبه دقیق الگوی روند (ADX, ATR, EMA Stack) بدون اتکا به حدس هوش مصنوعی.
* 🤖 **تحلیل هوشمند و پرامپت موسساتی**: استریمینگ آسنکرون پیشنهادهای معاملاتی، مدیریت ریسک، و نقاط ورود/خروج (SL/TP) بر اساس LLM.
* 📊 **بکتست سریع برداری (Vectorized Backtesting)**: پردازش و شبیهسازی استراتژیها روی دادههای تاریخی سنگین با استفاده از Pandas/NumPy پایتون.
* 🎯 **خوشهبندی هوشمند سطوح حمایت/مقاومت**: کشف زونهای واقعی نقدینگی با الگوریتم یادگیری ماشین **DBSCAN**.
* 📰 **تحلیل سنتیمنت اخبار و توئیتر**: پردازش عمیق متن با مدلهای NLP مالی (VADER).

---

## 🏛️ System Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │               Client Web UI                  │
                               │        React 19 + TradingView Charts         │
                               └──────────────────────┬───────────────────────┘
                                                      │ HTTP / EventStream
                                                      ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                Next.js 16 Web Gateway (TypeScript)                                     │
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

## 🛠️ Tech Stack Matrix

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router) + React 19 | SSR, Client UI, Routing & Streaming |
| **UI Components & Styling** | Tailwind CSS v4 + Lucide React | High-density trading dashboard layout |
| **Charting & Visualization** | TradingView `lightweight-charts` + Recharts | Interactive candlesticks & equity curves |
| **Backend Microservice** | Python 3.12 + FastAPI + Uvicorn | Heavy Math, ML Clustering & NLP API |
| **Quant Analytics** | Pandas + NumPy + Scikit-Learn | Vectorized backtesting & DBSCAN clustering |
| **NLP Sentiment Analysis** | VADER Sentiment Analyzer | Financial & crypto lexicon-weighted scoring |
| **Database & Persistence** | Better-SQLite3 + Supabase | Sub-50ms local persistence & cloud sync |
| **Exchange Connectivity** | CCXT (Crypto Currency eXchange Trading) | Unified exchange REST & ticker integration |

---

## 📂 Project Layout

```text
ai-trading-platform/
├── app/                        # Next.js App Router endpoints & UI pages
├── components/                 # React components (Dashboard, Terminal, News, Widgets)
├── lib/                        # Core TypeScript business logic & engines
│   ├── analysis/               # Market Regime, No-Trade Gate, Decision Zones
│   ├── llm/                    # LLM Client, Institutional Prompts, Signal Coherence
│   ├── market/                 # CCXT Service, Technical Indicators
│   └── python/                 # Python Backend HTTP Client (`python-client.ts`)
├── backend/                    # Python FastAPI Microservice
│   ├── pyproject.toml          # Python project dependencies (uv)
│   ├── app/
│   │   ├── main.py             # FastAPI entry point & CORS
│   │   ├── routers/            # API endpoints (/sentiment, /clustering, /backtest)
│   │   └── services/           # Python Quant & NLP engines
│   └── README.md
├── docs/                       # Project Documentation
│   ├── ARCHITECTURE.md         # Detailed System Topology & Design Patterns
│   ├── API_SPECIFICATION.md    # REST Endpoints & Data Models
│   └── DEVELOPMENT_GUIDE.md    # Local Setup, Testing & Tooling Guide
├── scripts/                    # Helper scripts (X Feed Scraper Engine)
└── tests/                      # Vitest test suites
```

---

## 🚀 Quick Start

### 1. Launch Next.js Frontend
```bash
npm install
npm run dev
# Frontend live at http://localhost:3000
```

### 2. Launch FastAPI Python Microservice
```bash
cd backend
uv venv .venv
source .venv/bin/activate
uv pip install -e .
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
# Python API live at http://127.0.0.1:8000
```

### 3. Run Tests
```bash
npm test
```

---

## 📖 Documentation

For detailed architectural breakdown and API specifications, explore the **[`docs/`](./docs)** folder:
* 📘 **[Architecture Overview](./docs/ARCHITECTURE.md)**
* 📙 **[API Specification & Schemas](./docs/API_SPECIFICATION.md)**
* 📗 **[Development & Setup Guide](./docs/DEVELOPMENT_GUIDE.md)**
