# Feature Specification: Complete System Design Review & Architectural Audit

**Feature Branch**: `002-system-design-review`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "میخوام بیای باهام بخش سیتستم دیزاین کامل پروژه رو بررسی بکنیم از کجا باید شروع کنیم"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interactive System Design Walkthrough (Priority: P1)

As a trader and platform developer, I want a structured step-by-step review of the entire system architecture (from UI trigger to data pipeline, deterministic guardrails, LLM inference stream, and storage layer) so that I can understand how data flows through the application and identify potential bottlenecks or flaws.

**Why this priority**: Understanding the core data flow and architectural layers is essential before making any major system modifications or adding new trading strategies.

**Independent Test**: Can be tested by walking through the 6 architectural phases (UI -> Data Engine -> Deterministic Pre-Analysis -> LLM Stream -> No-Trade Guardrails -> Hybrid Persistence) and verifying each phase's input/output contracts.

**Acceptance Scenarios**:

1. **Given** the user requests a system design review, **When** starting the walkthrough, **Then** the system presents a clear 6-phase architectural map explaining data transformation at each stage.
2. **Given** a specific layer in the pipeline (e.g. No-Trade Gate or Decision Zones), **When** deep-diving into its specification, **Then** exact mathematical formulas, inputs, outputs, and failure modes are explicitly detailed.

---

### User Story 2 - Architectural Bottleneck & Vulnerability Audit (Priority: P2)

As a system owner, I want an audit of potential architectural failure points (such as API rate limits, non-deterministic model outputs, un-cached data feeds, and storage quota exhaustion) so that the system remains resilient under live trading conditions.

**Why this priority**: Identifies risks that could degrade user experience or cause financial loss during market volatility.

**Independent Test**: Can be tested independently by checking edge cases across each layer (e.g., API timeout, malformed JSON, browser quota limits).

**Acceptance Scenarios**:

1. **Given** network latency or exchange API rate limits, **When** market context is requested, **Then** the architecture employs caching and concurrency limits to maintain sub-second response times for cached components.
2. **Given** an unformatted or malformed response from the language model, **When** JSON parsing runs, **Then** multi-tiered fallback extraction prevents bypassing deterministic risk filters.

---

### User Story 3 - Interactive Q&A and Strategy Customization Guide (Priority: P3)

As a developer customizing trading logic, I want recommended starting points and guided Q&A options for customizing trading rules, adding new indicators, or swapping LLM backends.

**Why this priority**: Helps developers extend the platform with new quantitative features after understanding the existing baseline design.

**Independent Test**: Can be verified by reviewing extending guides and checklists for modifying indicators, risk parameters, or data sources.

**Acceptance Scenarios**:

1. **Given** a developer wanting to add a new indicator or risk rule, **When** following the architecture specification, **Then** clear guidelines specify which layer (Indicator Engine vs Decision Zones vs Conviction Scorer) should house the new logic.

---

### Edge Cases

- What happens when external market APIs (e.g. CCXT or Forex) time out or return empty orderbooks?
- How does the system handle model stream interruptions midway through JSON generation?
- What happens when browser LocalStorage exceeds capacity while SQLite sync is active?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a comprehensive 6-layer architecture map detailing UI trigger, data aggregation, deterministic pre-analysis, LLM streaming, post-processing guardrails, and hybrid storage.
- **FR-002**: System MUST enforce deterministic risk guardrails (No-Trade Gate, Playbook Validation, Conviction Scorer) that operate independently of LLM narrative output.
- **FR-003**: System MUST isolate closed candlestick data from forming candlesticks to prevent indicator repainting.
- **FR-004**: System MUST calculate net trade economics by factoring in round-trip exchange fees and live orderbook spreads.
- **FR-005**: System MUST provide a multi-tier JSON repair and extraction fallback mechanism so that risk validation steps are never bypassed.
- **FR-006**: System MUST persist heavy analysis payloads in server-side storage while maintaining a lightweight client-side cache to prevent storage quota exhaustion.

### Key Entities

- **Market Context Payload**: Aggregated market snapshot including OHLCV candles, technical indicators, orderbook depth, CVD, macro sentiment, and news.
- **Decision Zone Map**: Support and resistance zones calculated from historical swing pivots and ATR volatility bands.
- **Trade Setup & Playbook**: Structured trading plan containing entry range, stop loss, take profit targets, risk-reward ratios, and execution status.
- **Conviction Score**: 0-100% composite score calculated from 9 quantitative filters and risk penalties.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System architecture documentation and walkthrough covers 100% of data flow layers from button click to final signal rendering.
- **SC-002**: Risk guardrails deterministically decline trades with negative expected value (Net R:R < 1.0 or costs > target reward) 100% of the time.
- **SC-003**: Data aggregation endpoint utilizes caching for macro and news feeds to keep response times under 2 seconds for cached requests.
- **SC-004**: Client storage quota usage remains under 1MB even after 100+ saved analysis runs.

## Assumptions

- The platform operates on Next.js with server-side API routes and client-side React UI components.
- Market data is fetched from live CCXT exchange endpoints for crypto or dedicated Forex endpoints.
- Local LLM inference (e.g. 9router/Hermes) or OpenAI-compatible API endpoints deliver streaming completions.
