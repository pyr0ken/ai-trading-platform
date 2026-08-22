# Frontend Technical Core Specification (v1.2)

> **Document Status**: Production Specification  
> **Version**: `v1.2.0`  
> **Target Scope**: Next.js 16 (React 19) Frontend Architecture, Mathematical Engines, Risk Management, Paper Trading, LLM Pipelines, News Intelligence, On-Chain Whales analysis, Utility systems, TradingView PineScript generation, Forex Data Service, Toggle State Management, Pip Calculations, and Persistence Subsystems.

---

## 🧭 Executive Overview

This document provides an exhaustive, structural registry of all technical functions, algorithms, risk gates, machine learning interfaces, paper trading engines, and persistence handlers implemented within the **Frontend (`frontend/`)** of the AI Trading Platform.

---

## 🌐 1. API Endpoints & Gateway Routes (`frontend/app/api/`)

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

## 📐 2. Mathematical Engines & Indicator Calculators (`frontend/lib/market/`)

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

## ⚖️ 3. Risk Management & Execution Economics (`frontend/lib/analysis/`)

Strict mathematical risk gates protecting capital against unviable trade setups and high execution friction:

| Function / Component | Source File | Risk & Money Management Role |
| :--- | :---: | :--- |
| `buildCostModel` | `lib/analysis/trading-costs.ts` | Constructs total cost model including taker fees, live exchange spread, and slippage. |
| `computeNetEconomics` | `lib/analysis/trading-costs.ts` | Calculates Net Risk-to-Reward ratio ($\text{Net R:R}$) after friction; flags `unwinnable` trades. |
| `minimumViableMovePct` | `lib/analysis/trading-costs.ts` | Calculates minimum price move required to cover round-trip execution costs. |
| `evaluateNoTradeGate` | `lib/analysis/no-trade-gate.ts` | **Blocking Gate**: Rejects setups with Net R:R < 1.0, low ADX chop, wide spreads, or HTF opposition. |
| `renderGateRulesForPrompt` | `lib/analysis/no-trade-gate.ts` | Formats active risk gate rules into readable text blocks for LLM prompt context. |

---

## 🎯 4. Market Regime & Structural Decision Zones (`frontend/lib/analysis/`)

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

## 🎮 5. Client-Side Paper Trading Engine (`frontend/lib/storage/` & `frontend/hooks/`)

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

## 🤖 6. LLM Orchestration, Prompt Engineering & Self-Repair (`frontend/lib/llm/`)

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

## 📈 7. TradingView PineScript Code Generator (`frontend/lib/tradingview/`)

Automatic generation of institutional TradingView PineScript v4/v5 overlay strategies:

| Function / Component | Source File | PineScript Generator Role |
| :--- | :---: | :--- |
| `generateAdvancedPineScriptCode` | `lib/tradingview/pine-generator.ts` | Converts LLM setups into executable PineScript v5 indicator overlays with Entry, SL, TP1–3 boxes, Trailing Stops, and Dashboard tables. |
| `handleCopyPine` | `components/tradingview/tradingview-chart.tsx` | Helper copying generated PineScript code directly to clipboard. |

---

## 📰 8. News Intelligence & Social Intelligence Pipeline (`frontend/lib/news/` & `frontend/lib/intel/`)

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

## 💾 9. Hybrid Persistence & Intelligence Settings Toggles (`frontend/lib/storage/` & `frontend/lib/db/`)

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

## 🐳 10. On-Chain Whale Analytics (`frontend/lib/whale/`)

Multi-chain tracking services monitoring large movements of capital on Ethereum and BSC network RPCs:

| Function / Component | Source File | On-Chain Analytics Role |
| :--- | :---: | :--- |
| `fetchWhaleSnapshot` | `lib/whale/whale-service.ts` | Orchestrates Ethereum & BSC RPC fetching to identify whale movements > $minUSD. |
| `fetchEtherscanTransfers` | `lib/whale/whale-service.ts` | Ingests Etherscan & BscScan ERC20 token transfer events using API endpoints. |
| `fetchRpcNativeTransfers` | `lib/whale/whale-service.ts` | RPC fallback client tracking native network assets (ETH/BNB) directly via JSON-RPC. |
| `detectDirection` | `lib/whale/whale-service.ts` | Evaluates exchange inflows/outflows using classified hot exchange deposit targets. |
| `lookupLabel` | `lib/whale/known-addresses.ts` | Cross-references hex addresses against a curated directory of exchanges and whales. |
| `addWhaleHistory` | `lib/whale/whale-history-store.ts` | Appends and manages a persistent client-side ring history of recent whale transfer events. |
| `getSeverity` | `lib/whale/whale-service.ts` | Scores whale threat/impact levels (`INFO` to `LEGENDARY`) based on USD transaction volume. |

---

## 🛠️ 11. Utility & Pricing Helpers & Formatters (`frontend/lib/utils/`)

Helper modules providing formatting logic, color styling, and numeric rounding:

| Function / Component | Source File | Utility Role |
| :--- | :---: | :--- |
| `formatPrice` | `lib/utils/price-format.ts` | Formats asset prices to appropriate significant decimals based on magnitude. |
| `formatPriceChange` | `lib/utils/price-format.ts` | Formats percentage price delta with clean signed flags (`+` / `-`). |
| `priceDecimals` | `lib/utils/price-format.ts` | Determines the correct decimal precision for an asset dynamically (DOGE vs BTC). |
| `getUserColor` | `lib/utils/user-colors.ts` | Generates stable user color coding for chat interfaces based on username hash. |
| `cn` | `utils/cn.ts` | Tailwind CSS utility merging packages smoothly (`clsx` + `tailwind-merge`). |
