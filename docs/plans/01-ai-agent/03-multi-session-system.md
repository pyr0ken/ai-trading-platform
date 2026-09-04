# 🗂️ AI Agent — Part 3: Multi-Session & Artifact Persistence

> **Module:** `backend/app/features/ai_agent/sessions/`  
> **Key Capabilities:** Session Encapsulation, Symbol Indexing, Auto-Titling, Chart State Restoration.

---

## 1. Architectural Model

Every analytical discussion is an isolated `AgentSession`. When a session is loaded or switched:
1. **Chat Stream Restored:** Full history of user queries, agent explanations, reasoning blocks, and tool executions.
2. **Chart Overlays Restored:** All lines, AVWAPs, and zones drawn by the agent for that session's active symbols are rendered onto the chart.
3. **Analyzed Coins Tracked:** A set of unique symbols (e.g., `["BTC/USDT", "ETH/USDT"]`) is indexed for quick filtering in the sidebar.

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Session Container                 │
├─────────────────────────────────────────────────────────────┤
│ • session_id: UUID                                          │
│ • title: "BTC Liquidity Sweep & 4H Demand Rebound"          │
│ • active_symbol: "BTC/USDT"                                 │
│ • analyzed_symbols: ["BTC/USDT", "ETH/USDT"]                │
│ • messages: List[MessageRecord]                             │
│ • chart_overlays: Map[Symbol, List[OverlayGeometry]]        │
│ • trade_setups: List[TradeSetupRecord]                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoints

- `GET /api/v1/agent/sessions`: Returns list of user sessions with badges of analyzed coins.
- `POST /api/v1/agent/sessions`: Creates a new session container.
- `GET /api/v1/agent/sessions/{id}`: Retrieves full session message history and chart overlay state.
- `PATCH /api/v1/agent/sessions/{id}`: Renames title or updates active symbol.
- `DELETE /api/v1/agent/sessions/{id}`: Archives/deletes session.
