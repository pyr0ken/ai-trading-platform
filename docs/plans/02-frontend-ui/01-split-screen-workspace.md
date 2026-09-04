# 🖥️ Frontend UI — Part 1: Split-Screen Responsive Workspace

> **Module:** `frontend/features/ai-advisor/components/` & `frontend/features/market-charts/components/`  
> **Layout Pattern:** 45/55 Split-Screen Desktop Grid + Slide-Over Session Drawer.

---

## 1. Split-Screen Layout Topology

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: Ticker [BTC/USDT ▾] · Price [$64,210.5] · 24h Change [+3.4%] · Session Title · Status  │
├────────────────────────────────────────────────────┬─────────────────────────────────────────────┤
│ ◀ LEFT PANEL: AI Agent Chat & Controls (45%)       │ ▶ RIGHT PANEL: Chart Canvas & Watchlist (55%)│
│                                                    │                                             │
│ ┌────────────────────────────────────────────────┐ │ ┌─────────────────────────────────────────┐ │
│ │ 🗂️ Session Header [Drawer ☰] [BTC, ETH]        │ │ │ 📈 Primary Chart (TradingView LW + SVG) │ │
│ ├────────────────────────────────────────────────┤ │ │    ├── Dynamic S&R Lines / AVWAP Bands  │ │
│ │ 💬 Message Stream (Auto-scroll, Virtuoso)       │ │ │    └── Box Selection Tool (Coordinates) │ │
│ │    ├── Thinking Accordion                      │ │ └─────────────────────────────────────────┘ │
│ │    ├── Tool Status Chips                       │ │ ┌─────────────────────────────────────────┐ │
│ │    ├── Markdown / Code Blocks                  │ │ │ 📑 Watchlist Carousel (Mini-Charts)     │ │
│ │    └── Actionable Trade Setup Cards            │ │ │    ├── [ETH] 🔥 Bullish Breakout        │ │
│ ├────────────────────────────────────────────────┤ │ │    ├── [SOL] ⚠️ Resistance Rejection    │ │
│ │ ⌨️ Chat Composer & Quick Action Buttons         │ │ │    └── [BNB] 💤 Consolidation          │ │
│ └────────────────────────────────────────────────┘ │ └─────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 2. Key Responsiveness & State Behaviors

- **Desktop (>= 1280px):** Simultaneous side-by-side view with instant drag-and-drop or resize divider.
- **Tablet / Mobile (< 1280px):** Tabbed switching between `Chat Agent` view and `Chart Terminal` view with sticky notification badges when the agent finishes calculating.
- **Session Drawer:** Slide-over panel displaying all historical sessions with search and badge filters.
