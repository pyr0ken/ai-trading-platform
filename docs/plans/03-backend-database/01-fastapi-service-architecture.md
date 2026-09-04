# ⚡ Backend & Database — Part 1: FastAPI Service Architecture & SSE Protocols

> **Module:** `backend/app/`  
> **Core Stack:** FastAPI, Uvicorn, Asyncio, Pydantic v2, Server-Sent Events (SSE).

---

## 1. API Route Topology

```text
backend/app/
├── main.py                     # Entrypoint, CORS, exception handlers
├── core/
│   ├── config.py               # Pydantic Settings (.env validator)
│   ├── database.py             # Supabase & SQLite async engines
│   └── security.py             # Auth verification & bearer token handlers
└── features/
    ├── ai_agent/routes.py      # /api/v1/agent/chat/stream, /api/v1/agent/sessions
    ├── market/routes.py        # /api/v1/market/ohlcv, /api/v1/market/orderbook
    ├── quant/routes.py         # /api/v1/quant/indicators, /api/v1/quant/backtest
    └── news/routes.py          # /api/v1/news/feed, /api/v1/news/sentiment
```

---

## 2. SSE Streaming Protocol (`/api/v1/agent/chat/stream`)

- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "session_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "message": "Is BTC showing absorption on the 4H support?",
    "chart_context": {
      "symbol": "BTC/USDT",
      "selected_range": {
        "price_low": 63200,
        "price_high": 64800,
        "from_time": "2026-09-01T00:00:00Z",
        "to_time": "2026-09-02T12:00:00Z"
      }
    }
  }
  ```
- **Response Headers:**
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
