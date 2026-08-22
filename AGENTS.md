# AGENTS.md - AI Agent Operating Guide & Architecture Specification

> **Target Audience**: AI Coding Assistants (Hermes Agent, Claude Code, Codex, OpenCode, Cursor) working on the `ai-trading-platform` codebase.

---

## 🧭 1. Executive Summary & Core Rules

This project is an institutional-grade, microservices-driven **AI-Powered Quantitative Trading Platform**. It combines real-time market data, technical indicator analysis, sentiment processing, and LLM reasoning into an interactive trading intelligence dashboard.

### 🛡️ Fundamental Principles for AI Assistants
1. **Feature-Folder Structure (FFS) Mandatory**: Both `frontend/` and `backend/` strictly follow a Feature-Folder Architecture. Do NOT place feature-specific components, hooks, or schemas into generic global folders.
2. **Deterministic Quant Analytics**: Never rely on LLM estimates for numerical market data or technical indicators. All technical calculations (ADX, ATR, RSI, Support/Resistance Clustering) MUST be computed deterministically in code (Python FastAPI / pure TypeScript).
3. **Git & User Approval**: NEVER commit or push code automatically without first showing a concise 1-by-1 file summary and obtaining explicit user confirmation.
4. **Environment & Secrets**: Keep secret keys strictly in `.env` (both backend and frontend). Never hardcode API keys, service role tokens, or passwords in source code.
5. **Verification Before Completion**: Run unit tests, lint checks, or build commands before claiming a task is complete.

---

## 🛠️ 2. Tech Stack Matrix

| Layer | Technology | Responsibilities |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router) + React 19 | SSR/CSR UI rendering, state management, client-side simulation |
| **UI Components & Styling** | Tailwind CSS v4 + Shadcn UI + Lucide React | High-density financial dashboard, dark mode UI |
| **Data Visualization** | TradingView Lightweight Charts + Recharts | Interactive candlestick charts and equity curve analytics |
| **Backend Service** | Python 3.12+ + FastAPI + Uvicorn | High-performance quantitative execution, market API gateways, LLM SSE streaming |
| **Quant Engines** | Pandas + NumPy + Scikit-Learn | Vectorized indicator calculation & dynamic S&R DBSCAN clustering |
| **Sentiment Intelligence** | VADER Sentiment Analyzer | Financial NLP news processing & market sentiment scoring |
| **Database & Auth** | Supabase (PostgreSQL + RLS + GoTrue Auth) | Multi-tenant team storage, user auth, paper trading account persistence |
| **Exchange Connectivity** | CCXT (Crypto Currency eXchange Trading) | Unified multi-exchange market data collection |
| **Containerization** | Docker & Docker Compose | Container orchestration for reproducible environments |

---

## 📂 3. Repository Topology & Monorepo Structure

```text
ai-trading-platform/
├── docs/                      # Technical specifications & architecture diagrams
├── frontend/                  # Next.js 16 Frontend Project (FFS)
│   ├── app/                   # Next.js App Router (Layouts, Routing Edge Controllers)
│   ├── components/
│   │   ├── ui/                # Neutral, re-usable Shadcn UI primitives (Button, Card, Dialog)
│   │   └── shared/            # Shared layout wrappers (Header, Sidebar, Footer)
│   ├── features/              # Feature-Folder Modules (Domain-sliced logic)
│   │   ├── auth/              # Auth forms, session hooks, user types
│   │   ├── market-charts/     # TradingView chart wrappers, OHLCV hooks
│   │   ├── paper-trading/     # Trade entry forms, position tables, equity charts
│   │   └── ai-advisor/        # Persian AI signal cards, SSE stream consumers
│   ├── hooks/                 # Global cross-cutting custom hooks
│   ├── lib/                   # Utility helpers (utils.ts cn wrapper, Supabase clients)
│   └── types/                 # Shared global TypeScript contracts
│
├── backend/                   # Python FastAPI Backend Project (FFS)
│   ├── app/
│   │   ├── main.py            # FastAPI entrypoint (CORS, router registration)
│   │   ├── core/              # Infrastructure settings (Pydantic Settings), security, database
│   │   └── features/          # Feature-Folder Modules (Domain-sliced routes & services)
│   │       ├── market/        # CCXT market data endpoints & exchange clients
│   │       ├── quant/         # Technical indicator calculation engines & tests
│   │       └── ai_streaming/  # LLM prompt templates & SSE streaming routes
│   ├── tests/                 # Pytest test suite
│   ├── Dockerfile
│   └── pyproject.toml
│
├── docker-compose.yml         # Container orchestration
├── AGENTS.md                  # This file (AI Operating Guidelines)
└── CLAUDE.md                  # Claude Code reference file
```

---

## 🏛️ 4. Key Architectural Patterns & Guidelines

### A. Feature-Folder Structure (FFS)
- Keep domain logic co-located inside `frontend/features/<domain>/` or `backend/app/features/<domain>/`.
- A feature folder should contain its own components, hooks, services, schemas, and types.
- Import between features cleanly without deep relative path circular dependencies.

### B. Supabase Row Level Security (RLS)
- **Team Read-All Transparency**: All authenticated team members can view shared entities (signals, analyses):
  ```sql
  CREATE POLICY "Analyses viewable by team" ON public.analyses
    FOR SELECT TO authenticated USING (true);
  ```
- **Write-Own Data Integrity**: Only the owner can create or update their own data:
  ```sql
  CREATE POLICY "Users insert own analyses" ON public.analyses
    FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
  ```
- Never rely on `user_metadata` for authorization logic (it is user-editable). Store authorization claims in `app_metadata`.

### C. Quant & AI Feedback Loop
- **ATR Stop Loss Buffers**: Compute dynamic stop loss distance using ATR multiplier (e.g. $2.0 \times \text{ATR}$) to prevent tight sweeps.
- **Closed-Loop Feedback**: Query historical signal outcomes (`WIN`, `LOSS`, `INVALIDATED`) and supply them into LLM prompt contexts for self-correction.

---

## 💻 5. Local Command Reference

```bash
# Backend Execution (Local Development)
cd backend
python3 -m uvicorn app.main:app --reload --port 8000

# Backend Pytest Execution
cd backend
pytest

# Frontend Execution (Local Development)
cd frontend
npm run dev

# Full Containerized Stack
docker compose up --build
```
