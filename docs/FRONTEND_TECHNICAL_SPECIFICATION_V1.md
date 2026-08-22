# Frontend Technical Core Specification (v1.7)

> **Document Status**: Production Specification  
> **Version**: `v1.7.0`  
> **Target Scope**: Next.js 16 (React 19) Frontend Architecture, Data Models & Type Contract Matrix, Mathematical Engines, Risk Management, Paper Trading Engine, LLM Pipelines, News Intelligence, On-Chain Whales Analysis, TradingView PineScript Generator, Market Heatmap, Forex Data Service, Executive Dashboard UI, Layout Components & Styling Systems, Supabase RLS Schema & Security Policies, Persian Analysis Cards, and Persistence Subsystems.

---

## 🧭 Executive Overview

This document provides an exhaustive, structural registry of all technical functions, interfaces, algorithms, risk gates, machine learning interfaces, paper trading engines, UI layout adapters, Supabase schema tables, and persistence handlers implemented within the **Frontend (`frontend/`)** of the AI Trading Platform.

---

## 💎 1. Core Data Models & Type Contract Matrix (`frontend/types/`)

Strict TypeScript interfaces and contracts governing payload schemas across the frontend subsystems:

| Interface / Contract | Source File | Technical Description & Structural Fields |
| :--- | :---: | :--- |
| `FullMarketContextPayload` | `types/analysis.ts` | Complete payload injected into LLM streams (symbol, exchange, timeframe, regime, decision zones, technical facts, news, whale flows). |
| `StructuredLLMOutput` | `types/analysis.ts` | Schema contract enforcing structured JSON output from LLM (signal, confidence, trade_setup, risk_reward_ratio, reasoning). |
| `TradeSetup` | `types/analysis.ts` | Unified Trade Setup object detailing entry ranges, SL, TP1–3, recommended leverage, and position direction. |
| `CandleData` | `types/market.ts` | Base OHLCV candlestick interface (`timestamp`, `open`, `high`, `low`, `close`, `volume`). |
| `CalculatedIndicators` | `types/market.ts` | Computed technical indicator values (`sma_20`, `ema_50`, `rsi_14`, `macd_line`, `macd_hist`, `adx_14`, `atr_14`). |
| `MarketTechnicalFacts` | `types/market.ts` | Extracted facts summarizing RSI condition, MACD crossover, ADX value, volume surge ratio, and ATR volatility. |
| `PaperAccount` | `types/paper-trading.ts` | Paper portfolio balance, equity, total trades, win/loss stats, and historical equity curve tracking. |
| `PaperPosition` | `types/paper-trading.ts` | Simulated trade position tracking entry price, current price, margin, leverage, live PnL, SL, and TP. |
| `NewsArticle` | `types/news.ts` | Ingested news item metadata (`id`, `title`, `url`, `source`, `publishedAt`, `relevanceScore`, `sentiment`). |
| `NewsIntelligenceBrief` | `types/news.ts` | Stage-1 LLM/Deterministic news brief summarizing market regime bias, time sensitivity, and macro drivers. |
| `WhaleTransaction` | `lib/whale/types.ts` | Large-volume on-chain transfer event (`hash`, `from`, `to`, `amount`, `usdValue`, `severity`, `direction`). |
| `DashboardLayoutConfig` | `types/layout.ts` | Grid layout configuration defining visible widgets, order, and panel dimensions. |

---

## 🌐 2. API Endpoints & Gateway Routes (`frontend/app/api/`)

HTTP API routes embedded inside Next.js acting as edge controllers, server-sent event (SSE) streaming targets, and database sync proxies:

| Route Path | Subsystem | Technical Responsibility |
| :--- | :---: | :--- |
| `app/api/market/ticker/route.ts` | Data Fetching | Ingests real-time prices and 24h ticker metadata via unified CCXT exchange layer. |
| `app/api/market/history-ohlcv/route.ts` | Data Fetching | Fetches historical candlestick (OHLCV) arrays for charting and technical analysis. |
| `app/api/analysis/stream/route.ts` | LLM Engine | Initiates Server-Sent Events (SSE) streaming for real-time AI Trade Setup generation. |
| `app/api/chat/route.ts` | LLM Engine | Manages streaming interactive chat sessions with the AI trading assistant. |
| `app/api/db/analyses/route.ts` | Database | CRUD operations for persistent trade setup records and signal evaluation logs. |
| `app/api/db/paper/route.ts` | Paper Trading | Persists paper trading positions, equity history, and account metrics. |
| `app/api/db/auth/[login/register]` | Auth | User registration, authentication token validation, and session management. |
| `app/api/db/watchlist/route.ts` | User Storage | Manages pinned, favorite, and custom watchlist symbols. |
| `app/api/db/whale/route.ts` | Intelligence | Queries and stores historical large-volume on-chain whale transactions. |
| `app/api/db/settings/route.ts` | User Storage | Persists trader risk parameters, default timeframes, and model selections. |
| `app/api/intel/scrape-trigger/route.ts` | Edge Trigger | Triggers external scraping routines for social intelligence ingestion. |
| `app/api/news/route.ts` | News Engine | Aggregates, filters, and serves pre-ranked financial news feeds. |

---

## 📐 3. Mathematical Engines & Indicator Calculators (`frontend/lib/market/`)

Deterministic technical indicator implementations optimized for in-browser calculation:

| Function / Component | Source File | Mathematical Algorithm & Formula |
| :--- | :---: | :--- |
| `calculateSMA` | `lib/market/indicators.ts` | Simple Moving Average using a memory-efficient sliding-window sum ($\sum P_i / n$). |
| `calculateEMA` | `lib/market/indicators.ts` | Exponential Moving Average with multiplier $k = 2 / (n + 1)$, seeded by initial SMA. |
| `calculateRSI` | `lib/market/indicators.ts` | Relative Strength Index tracking average gains/losses ($100 - \frac{100}{1 + RS}$). |
| `calculateMACD` | `lib/market/indicators.ts` | MACD Line ($\text{EMA}_{12} - \text{EMA}_{26}$), Signal Line ($\text{EMA}_9$), and Histogram. |
| `smoothWilders` | `lib/market/wilder-smoothing.ts` | Wilder's Smoothing algorithm for volatility-sensitive indicators (ATR/ADX). |
| `computeVolumeSurgeRatio` | `lib/market/volume-surge.ts` | Relative volume ratio ($\text{Volume}_{\text{latest}} / \text{SMA}_{50}(\text{Volume})$). |
| `splitClosedCandles` | `lib/market/closed-candle.ts` | Separates completed historical candles from the active unclosed forming bar. |
| `dropUnclosedCandle` | `lib/market/closed-candle.ts` | Strips forming bar to prevent indicator skew during closed-bar analysis. |
| `describeFormingCandle` | `lib/market/closed-candle.ts` | Analyzes intraday momentum and completion percentage of the active bar. |
| `timeframeToMs` | `lib/market/closed-candle.ts` | Converts human timeframe strings (`1m`, `1h`, `1d`) to exact millisecond integers. |
| `ForexMarketService` | `lib/market/forex-service.ts` | Dedicated fallback pricing and Pip value calculator for FX currency pairs (EUR/USD, GBP/USD). |
| `getPipInfo` | `lib/constants/forex-pairs.ts` | Computes precision, pip size ($0.0001$ vs $0.01$), and pip values across forex symbols. |
| `MacroSentimentService` | `lib/market/macro-service.ts` | Fetches interest rates, inflation markers, and macro risk bias indicators. |
| `EconomicCalendar` | `lib/market/economic-calendar.ts` | High-impact macroeconomic calendar events parser (CPI, NFP, FOMC decisions). |

---

## ⚖️ 4. Risk Management & Execution Economics (`frontend/lib/analysis/`)

Strict mathematical risk gates protecting capital against unviable trade setups and high execution friction:

| Function / Component | Source File | Risk & Money Management Role |
| :--- | :---: | :--- |
| `buildCostModel` | `lib/analysis/trading-costs.ts` | Constructs total cost model including taker fees, live exchange spread, and slippage. |
| `computeNetEconomics` | `lib/analysis/trading-costs.ts` | Calculates Net Risk-to-Reward ratio ($\text{Net R:R}$) after friction; flags `unwinnable` trades. |
| `minimumViableMovePct` | `lib/analysis/trading-costs.ts` | Calculates minimum price move required to cover round-trip execution costs. |
| `evaluateNoTradeGate` | `lib/analysis/no-trade-gate.ts` | **Blocking Gate**: Rejects setups with Net R:R < 1.0, low ADX chop, wide spreads, or HTF opposition. |
| `renderGateRulesForPrompt` | `lib/analysis/no-trade-gate.ts` | Formats active risk gate rules into readable text blocks for LLM prompt context. |

---

## 🎯 5. Market Regime & Structural Decision Zones (`frontend/lib/analysis/`)

Deterministic market state classification and machine-assisted support/resistance zone mapping:

| Function / Component | Source File | Structural Analysis Role |
| :--- | :---: | :--- |
| `detectMarketRegime` | `lib/analysis/market-regime.ts` | Classifies market state (`TRENDING_UP`, `RANGING`, `COMPRESSION`) via ADX & Bollinger Bandwidth. |
| `voteForTimeframe` | `lib/analysis/market-regime.ts` | Evaluates multi-timeframe directional agreement from EMA alignment and price position. |
| `bandwidthPercentile` | `lib/analysis/market-regime.ts` | Computes Bollinger Bandwidth percentile to detect volatility compression vs expansion. |
| `buildDecisionZones` | `lib/analysis/decision-zones.ts` | Aggregates swing pivots into cluster-based Support/Resistance bands weighted by touch count and ATR. |
| `rejectionProbability` | `lib/analysis/decision-zones.ts` | Computes mathematical probability of price holding vs breaking at a structural zone. |
| `levelStrength` | `lib/analysis/decision-zones.ts` | Scores level significance (0–100) based on touch frequency and recency. |
| `priceDecimals` | `lib/analysis/decision-zones.ts` | Dynamic precision formatter scaling decimal places with asset price magnitude. |

---

## 🎮 6. Client-Side Paper Trading Engine (`frontend/lib/storage/` & `frontend/hooks/`)

Real-time simulated execution, portfolio accounting, and automated SL/TP price monitoring:

| Function / Component | Source File | Paper Trading Subsystem |
| :--- | :---: | :--- |
| `openPaperPosition` | `lib/storage/app-db.ts` | Instantiates simulated long/short position and deducts required margin from virtual balance. |
| `closePaperPosition` | `lib/storage/app-db.ts` | Closes position, calculates leveraged PnL ($\Delta P \times \text{Leverage}$), updates account history. |
| `getPaperAccount` | `lib/storage/app-db.ts` | Retrieves virtual balance, equity, win/loss stats, and equity curve history. |
| `getPaperPositions` | `lib/storage/app-db.ts` | Lists active open positions and closed trade history. |
| `resetPaperTrading` | `lib/storage/app-db.ts` | Wipes paper trading history and restores default $10,000 capital. |
| `fetchClientSidePrice` | `hooks/use-paper-trading.ts` | Non-blocking fetch with dedicated `AbortController` for lightweight price checks. |
| `monitorPrices` | `hooks/use-paper-trading.ts` | **Automated Execution Hook**: Monitors active positions; triggers auto SL/TP exits and updates live PnL. |
| `usePaperTrading` | `hooks/use-paper-trading.ts` | React state hook connecting UI widgets to the client storage paper engine. |

---

## 🤖 7. LLM Orchestration, Prompt Engineering & Self-Repair (`frontend/lib/llm/`)

Prompt assembly, streaming payload construction, JSON self-healing, and output coherence verification:

| Function / Component | Source File | LLM Architecture Role |
| :--- | :---: | :--- |
| `buildInstitutionalSystemPrompt` | `lib/llm/institutional-prompt.ts` | Defines institutional analyst personality, risk constraints, and strict JSON output schema. |
| `buildInstitutionalUserPrompt` | `lib/llm/institutional-prompt.ts` | Assembles market facts, regime summaries, whale flows, and news into the final prompt payload. |
| `renderWhaleFlowBlock` | `lib/llm/institutional-prompt.ts` | Formats large exchange inflows/outflows into directional conviction signals. |
| `createLLMAnalysisStream` | `lib/llm/llm-client.ts` | Dispatches payload to local LLM server (9router/Hermes) and manages SSE streaming. |
| `extractAndParseJSON` | `lib/llm/json-guard.ts` | Safely extracts and parses JSON blobs embedded in LLM Markdown responses. |
| `tryRepairJSON` | `lib/llm/json-guard.ts` | **Self-Repair Algorithm**: Balances unclosed brackets/quotes to fix truncated LLM JSON. |
| `enforceSignalCoherence` | `lib/llm/signal-coherence.ts` | Validates logical consistency between trade direction, entry ranges, and targets. |
| `computeConvictionScore` | `lib/analysis/conviction-scorer.ts` | Calculates 1–100 composite conviction score by cross-referencing HTF alignment. |
| `validateAndCorrectPlaybook` | `lib/analysis/playbook-validator.ts` | Auto-corrects invalid LLM target/stop levels against structural decision zones. |
| `resolveTradeSetup` | `lib/analysis/setup-resolver.ts` | Normalizes legacy vs modern LLM output schemas into unified setup objects. |
| `logPromptToFile` | `lib/llm/prompt-logger.ts` | Audit logger persisting exact prompt inputs to `./logs/` for prompt drift analysis. |
| `useLLMAnalysis` | `hooks/use-llm-analysis.ts` | Main UI hook managing streaming state, progress log steps, and setup persistence. |
| `AnalysisPromptBuilder` | `lib/prompts/analysis-prompt.ts` | Additional prompt builder template generator for custom analysis modes. |

---

## 🖥️ 8. Trading Terminal & Layout Components (`frontend/components/`)

Visual analytics widgets, layout frames, top navbars, sidebars, and Persian localized card renderers:

| Component / Widget | Source File | UI Architecture Role |
| :--- | :---: | :--- |
| `BuySellMeter` | `components/terminal/buy-sell-meter.tsx` | Visual sentiment gauge computing buyer vs seller pressure percentages. |
| `TechnicalScoreRadar` | `components/terminal/technical-score-radar.tsx` | Radar chart rendering technical scores across Volume, Trend, Volatility, and Momentum. |
| `MultiTimeframeMatrix` | `components/terminal/multi-timeframe-matrix.tsx` | Grid matrix displaying directional alignment across timeframes (1m to 1w). |
| `DecisionZonesMapComponent` | `components/terminal/decision-zones-map.tsx` | Visual mapping component displaying Support & Resistance price zones and rejection probabilities. |
| `ConvictionBreakdownComponent` | `components/terminal/conviction-breakdown.tsx` | Renders conviction score factors (Timeframe alignment, Regime fit, On-chain flow). |
| `PreflightFactsPanel` | `components/terminal/preflight-facts-panel.tsx` | Displays pre-analysis facts injected into the LLM prompt (ADX, ATR, RSI, Spreads). |
| `SingleExecutionBox` | `components/terminal/single-execution-box.tsx` | Compact order entry and position sizing box with automatic Risk/Reward calculation. |
| `AnalysisReplayModal` | `components/terminal/analysis-replay-modal.tsx` | Interactive modal replaying historical trade setups against market price outcomes. |
| `HistorySignalTable` | `components/terminal/history-signal-table.tsx` | Searchable table listing historical signals with Win/Loss badges and accuracy metrics. |
| `AIChatWidget` | `components/terminal/ai-chat-widget.tsx` | Embedded interactive chat widget communicating directly with the LLM API stream. |
| `ExecutiveReportingDashboard` | `components/dashboard/executive-reporting-dashboard.tsx` | High-level executive reporting dashboard aggregating portfolio PnL, win rates, and active signals. |
| `DashboardTickerTape` | `components/dashboard/dashboard-ticker-tape.tsx` | Real-time sliding price ticker tape rendering top market symbols. |
| `QuickSymbolSearch` | `components/dashboard/quick-symbol-search.tsx` | Fast-access modal search component for Instant asset switching. |
| `DashboardLayoutToolbar` | `components/dashboard/dashboard-layout-toolbar.tsx` | Custom dashboard grid toolbar allowing widget reordering and layout persistence. |
| `PersianAnalysisCard` | `components/analysis/persian-analysis-card.tsx` | Right-to-Left (RTL) Persian translation card renderer formatting AI analysis markdown. |
| `LiveStatusLogger` | `components/analysis/live-status-logger.tsx` | Step-by-step live status logger component displaying pipeline execution milestones. |
| `AnalysisSkeleton` | `components/analysis/analysis-skeleton.tsx` | Progressive skeleton loader component preventing full-page blocking spinners during LLM stream load. |
| `MarketHeatmap` | `components/market/market-heatmap.tsx` | Real-time 24h market heatmap fetching parallel price deltas & volume from Binance/KuCoin APIs. |
| `WatchlistManager` | `components/market/watchlist-manager.tsx` | Interactive watchlist management grid with search, pinning, and symbol selection. |
| `CoinSelector` | `components/market/coin-selector.tsx` | Searchable dropdown component for quick market asset switching across Top 300 coins. |
| `AppSidebar` | `components/layout/app-sidebar.tsx` | High-density Atlantic navigation sidebar with quick view tabs and active symbol selector. |
| `AtlanticTopNav` | `components/layout/atlantic-top-nav.tsx` | Horizontal institutional top navigation bar displaying platform status and active mode. |
| `Header` | `components/layout/header.tsx` | Global terminal header with search bar, notification indicators, and profile dropdown. |
| `BorderedContainerFrame` | `components/layout/bordered-container-frame.tsx` | Specialized high-tech dark theme border container frame wrapping widgets. |
| `DecorativeSparkle` | `components/layout/decorative-sparkle.tsx` | Vector sparkle asset decorator highlighting active AI recommendations and badges. |
| `ParticleCloudCanvas` | `components/layout/particle-cloud-canvas.tsx` | High-performance HTML5 Canvas rendering animated background particle effects. |

---

## 📈 9. TradingView PineScript Code Generator (`frontend/lib/tradingview/`)

Automatic generation of institutional TradingView PineScript v4/v5 overlay strategies:

| Function / Component | Source File | PineScript Generator Role |
| :--- | :---: | :--- |
| `generateAdvancedPineScriptCode` | `lib/tradingview/pine-generator.ts` | Converts LLM setups into executable PineScript v5 indicator overlays with Entry, SL, TP1–3 boxes, Trailing Stops, and Dashboard tables. |
| `PineScriptEditor` | `components/terminal/pine-script-editor.tsx` | Interactive code editor component allowing traders to customize EMA periods and export PineScript. |
| `PineScriptCard` | `components/terminal/pine-script-card.tsx` | Card widget displaying generated PineScript code with one-click copy to clipboard. |

---

## 📰 10. News Intelligence & Social Intelligence Pipeline (`frontend/lib/news/` & `frontend/lib/intel/`)

Headline scoring, source credibility profiling, and temporal decay algorithms:

| Function / Component | Source File | Intelligence Subsystem |
| :--- | :---: | :--- |
| `computeTimeDecay` | `lib/news/news-lexicon.ts` | Exponential decay algorithm reducing news impact weight based on publication age. |
| `analyzeSentimentDeterministic` | `lib/news/news-lexicon.ts` | Static dictionary sentiment scoring using weighted financial/crypto lexicons. |
| `scoreArticleRelevance` | `lib/news/news-relevance.ts` | Keyword relevance scoring matching news articles against traded symbol profiles. |
| `getSymbolNewsContext` | `lib/news/news-intelligence.ts` | Selects and ranks top $N$ symbol-relevant news articles for prompt inclusion. |
| `aggregateIntel` | `lib/intel/intel-aggregator.ts` | Combines, deduplicates, and ranks multi-source tweets and news items. |
| `enrichIntel` | `lib/intel/intel-enricher.ts` | Additive LLM layer interpreting sarcasm, implication, and subtle sentiment. |
| `buildSocialIntel` | `lib/intel/social-intel.ts` | Isolates macro shock events (Fed interest rates, regulatory orders) from asset-specific news. |
| `getSourceProfile` | `lib/intel/source-registry.ts` | Scores source authority and flags primary market movers. |

---

## 💾 11. Hybrid Persistence & Intelligence Settings Toggles (`frontend/lib/storage/` & `frontend/lib/db/`)

Multi-tiered storage engine combining LocalStorage, SQLite, and cloud Supabase sync with feature-flag toggles:

| Function / Component | Source File | Persistence Architecture Role |
| :--- | :---: | :--- |
| `AppStorageEngine` | `lib/storage/app-db.ts` | Central class orchestrating instant LocalStorage cache + async SQLite/Supabase sync. |
| `saveAnalysis` / `getAnalyses` | `lib/storage/app-db.ts` | Stores and retrieves AI analysis records and win/loss trade evaluations. |
| `updateAnalysisRecordStatus` | `lib/storage/app-db.ts` | Updates setup status (`WIN`, `LOSS`, `INVALIDATED`) based on market price tracking. |
| `syncListToSupabase` | `lib/storage/app-db.ts` | Async background queue syncing client records to cloud Supabase tables. |
| `subscribeToRealtimeChanges` | `lib/storage/app-db.ts` | Subscribes to Supabase WebSocket channels for realtime cloud state updates. |
| `exportFullBackup` / `importFullBackup` | `lib/storage/app-db.ts` | Exports/imports JSON archives containing watchlists, accounts, setups, and settings. |
| `getDatabase` | `lib/db/sqlite-client.ts` | Server-side SQLite connection initializer (`better-sqlite3`). |
| `useAutoResolver` | `hooks/use-auto-resolver.ts` | Background task hook auto-evaluating pending setups against market price outcomes. |
| `readIntelToggles` / `setIntelToggle` | `lib/storage/intel-toggles.ts` | State persistence handlers for news, social, and macro intel feature toggles. |
| `useActiveLLMModel` / `setLLMModel` | `lib/storage/intel-toggles.ts` | Active LLM model selector persistence handlers (`hermes` vs local models). |

---

## 🐳 12. On-Chain Whale Analytics (`frontend/lib/whale/` & `frontend/components/whale/`)

Multi-chain tracking services and UI overlays monitoring large movements of capital on Ethereum and BSC network RPCs:

| Function / Component | Source File | On-Chain Analytics Role |
| :--- | :---: | :--- |
| `fetchWhaleSnapshot` | `lib/whale/whale-service.ts` | Orchestrates Ethereum & BSC RPC fetching to identify whale movements > $minUSD. |
| `fetchEtherscanTransfers` | `lib/whale/whale-service.ts` | Ingests Etherscan & BscScan ERC20 token transfer events using API endpoints. |
| `fetchRpcNativeTransfers` | `lib/whale/whale-service.ts` | RPC fallback client tracking native network assets (ETH/BNB) directly via JSON-RPC. |
| `detectDirection` | `lib/whale/whale-service.ts` | Evaluates exchange inflows/outflows using classified hot exchange deposit targets. |
| `lookupLabel` | `lib/whale/known-addresses.ts` | Cross-references hex addresses against a curated directory of exchanges and whales. |
| `addWhaleHistory` | `lib/whale/whale-history-store.ts` | Appends and manages a persistent client-side ring history of recent whale transfer events. |
| `getSeverity` | `lib/whale/whale-service.ts` | Scores whale threat/impact levels (`INFO` to `LEGENDARY`) based on USD transaction volume. |
| `WhaleSidebar` | `components/whale/whale-sidebar.tsx` | Interactive sidebar widget rendering live whale transactions with severity filters. |
| `WhalePopupContainer` | `components/whale/whale-popup.tsx` | Real-time toast alert container popping up when high-severity whale transactions occur. |

---

## 🛠️ 13. Utility & Pricing Helpers & Formatters (`frontend/lib/utils/`)

Helper modules providing formatting logic, color styling, and numeric rounding:

| Function / Component | Source File | Utility Role |
| :--- | :---: | :--- |
| `formatPrice` | `lib/utils/price-format.ts` | Formats asset prices to appropriate significant decimals based on magnitude. |
| `formatPriceChange` | `lib/utils/price-format.ts` | Formats percentage price delta with clean signed flags (`+` / `-`). |
| `priceDecimals` | `lib/utils/price-format.ts` | Determines the correct decimal precision for an asset dynamically (DOGE vs BTC). |
| `getUserColor` | `lib/utils/user-colors.ts` | Generates stable user color coding for chat interfaces based on username hash. |
| `cn` | `utils/cn.ts` | Tailwind CSS utility merging packages smoothly (`clsx` + `tailwind-merge`). |

---

## ⚡ 14. Team Multi-Tenant Supabase Schema & RLS Policies (`frontend/supabase/schema.sql`)

Postgres relational schema definitions and Row-Level Security (RLS) policies enforcing multi-tenant team isolation and realtime collaboration:

| Table / Trigger | Schema Type | Technical & Security Role |
| :--- | :---: | :--- |
| `public.profiles` | Postgres Table | User profile contract connected via FK to `auth.users(id)` with cascading deletion. |
| `public.strategies` | Postgres Table | Quantitative strategy parameter definitions with JSONB config storage. |
| `public.analyses` | Postgres Table | Core AI signal log storing symbol, signal, confidence, conviction, JSON setups, and PnL. |
| `public.market_snapshots` | Postgres Table | Point-in-time snapshot of candles, technical facts, and decision zones when signal was generated. |
| `public.chat_messages` | Postgres Table | Shared interactive AI chat log accessible across team members for collaborative analysis. |
| `public.paper_accounts` | Postgres Table | Multi-user virtual trading capital account tracking equity history and win rates. |
| `public.paper_positions` | Postgres Table | Simulated positions with live entry, leverage, PnL percentage, status, and exit prices. |
| `public.trade_reflections` | Postgres Table | Closed-loop self-tuning AI reflection records evaluating trade outcomes and mistakes. |
| `public.backtest_runs` | Postgres Table | Stores historical backtest runs, trades array, equity curve JSONB, and Sharpe ratios. |
| `public.watchlists` | Postgres Table | Per-user symbol watchlists with unique constraints (`user_id`, `symbol`, `exchange`). |
| `public.alerts` | Postgres Table | Webhook and alert channel configurations triggering on market condition thresholds. |
| `public.whale_transactions` | Postgres Table | Global log of large-volume whale transfer events across EVM RPCs. |
| `public.audit_logs` | Postgres Table | Security action tracking log recording administrative actions and updates. |
| `handle_new_user()` | Pl/pgSQL Trigger | Automated trigger instantiating profile and $10,000 paper trading account upon auth sign-up. |
| `RLS Team Security Policies` | Row Level Security | **Security Model**: `READ-ALL` for team transparency, `WRITE-OWN` for authenticated user integrity. |
