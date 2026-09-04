# 🗺️ Master Plan & Technical Architecture Index
## Institutional AI Quantitative Trading Platform

> **Status:** Production Architecture Blueprint  
> **Target Monorepo:** `frontend/` (Next.js 16 + React 19) & `backend/` (FastAPI + Pandas + CCXT)  
> **Database:** Supabase (PostgreSQL + RLS) + SQLite Fallback  

---

## 📂 Subsystem Plan Directory Map

```text
docs/plans/
├── README.md                                 # This Index File (Master Architecture & Navigation)
│
├── 01-ai-agent/                              # AI Quant Agent Core (Hermes-inspired ReAct Engine)
│   ├── 01-react-engine-and-tools.md          # Pure Python ReAct loop, tool registry, JSON schemas
│   ├── 02-memory-skills-reflection.md        # 3-tier memory, progressive trading skills & self-correction
│   └── 03-multi-session-system.md            # Session encapsulation, artifact persistence & recovery
│
├── 02-frontend-ui/                           # Interactive Split-Screen Terminal & Beautiful UI
│   ├── 01-split-screen-workspace.md          # Split-screen responsive layout & session sidebar
│   ├── 02-beautiful-ui-primitives.md         # Crafted AI primitives (Thinking, Tool chips, Approvals)
│   ├── 03-interactive-chart-overlays.md      # Lightweight Charts + SVG/Canvas dynamic drawing layer
│   └── 04-libraries-dev-visual-effects.md    # High-crafted AI effects (Thinking Orb, Border Beam, Metal FX)
│
├── 03-backend-database/                      # High-Performance Backend & Database Architecture
│   ├── 01-fastapi-service-architecture.md    # Async FastAPI endpoints, SSE streaming, SSE protocol
│   └── 02-supabase-postgres-rls-schema.md    # PostgreSQL schemas, RLS policies, migrations & tables
│
├── 04-quant-finance/                         # Quantitative Engine & Microstructure Analytics
│   ├── 01-deterministic-indicators-sr.md     # Vectorized Pandas indicators & DBSCAN S&R clustering
│   ├── 02-orderflow-avwap-microstructure.md  # Order book imbalance ratio, CVD & Anchored VWAP
│   └── 03-risk-kelly-backtesting.md          # Institutional position sizing, Kelly criterion & backtest
│
├── 05-news-sentiment-scraping/               # News, Social Sentiment & Macro Intelligence
│   ├── 01-multi-source-news-scraper.md       # Financial news aggregator (CryptoPanic, RSS, Coindesk)
│   └── 02-twitter-social-sentiment-nlp.md    # Twitter/X sentiment pipeline, VADER/FinBERT & Fear/Greed
│
└── 06-advanced-innovations/                  # 🚀 Cutting-Edge Institutional AI Quant Innovations
    ├── 01-adversarial-multi-agent-debate.md  # Red Team vs Blue Team internal debate protocol
    ├── 02-drawdown-circuit-breaker-risk.md   # Dynamic Kelly contraction & anti-revenge trading guard
    ├── 03-pinescript-v5-generator-tool.md    # In-chat one-click compile-ready PineScript v5 synthesizer
    ├── 04-whale-orderbook-confluence-radar.md# On-chain whale inflows + L2 order book wall confluence
    └── 05-conversational-vectorbt-engine.md  # Real-time <500ms vectorized backtesting in chat stream
```

---

## 🎯 Global System Invariants

1. **Deterministic Analytics Separation:** The LLM is strictly prohibited from estimating price levels, indicators, or position sizes. All mathematical calculations are computed deterministically in Python (Pandas/NumPy).
2. **Copy-Paste Crafted Primitives:** Frontend AI components follow the `Beautiful UI` & `Libraries.dev` zero-bloat philosophy without heavy external dependencies.
3. **Multi-Session Isolation:** Every analytical conversation is scoped to a unique `session_id`, storing messages, analyzed coins, and associated chart overlays.
4. **Human-in-the-Loop Trading Safety:** No real or simulated orders are placed without an explicit interactive approval card and hard risk limit checks ($R:R \ge 1.5$, $\text{Risk} \le 5\%$).
5. **Adversarial Gatekeeping:** Major trade signals pass through the internal Red-Team critique before reaching the user.
