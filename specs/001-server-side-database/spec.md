# Feature Specification: Server-Side Database Storage

**Feature Branch**: `001-server-side-database`  
**Created**: 2026-08-14  
**Status**: Draft  
**Input**: Server-side database persistence using SQLite for storing analysis records, chat history, watchlists, and settings.

---

## Executive Summary

Currently, analysis history, user watchlists, AI terminal chats, and trading settings are saved only in browser local storage (`LocalStorage` / `IndexedDB`). If a user clears browser cache, switches browsers, or opens the app on another device, all past trading signals, performance history, and settings are lost.

This feature introduces a reliable, zero-config server-side database (SQLite) to store all platform data persistently on disk.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Persistent Analysis & Signal History (Priority: P1)

As a trader, I want all my AI market analyses, generated trade setups, and prediction tracking stored permanently on the server, so that my trade history and accuracy logs are never lost when I refresh or clear my browser cache.

**Why this priority**: Signal history and closed-loop feedback are core to the platform's win-rate tracking and LLM self-correction.

**Independent Test**: Can be tested by running an AI analysis on BTC/USDT, clearing browser storage, reloading the page, and verifying that all past analyses and signals are still listed in the History Table.

**Acceptance Scenarios**:
1. **Given** an AI analysis is completed, **When** the signal is saved, **Then** it is written to the server database with full JSON payload, markdown report, and market metadata.
2. **Given** a user opens the terminal on a fresh browser window, **When** the page loads, **Then** all historical signals are fetched from the server database and displayed immediately.
3. **Given** an automated signal resolution updates trade status (WIN / LOSS / INVALIDATED), **When** status updates, **Then** the updated record persists on the server.

---

### User Story 2 — Server-Synced Watchlist & Settings (Priority: P2)

As a user, I want my custom watchlist items, preferred exchange, default timeframe, and AI model selection stored on the server, so that my workspace layout and settings remain consistent across sessions.

**Why this priority**: Improves user experience and prevents users from having to re-configure their workspace repeatedly.

**Independent Test**: Can be tested by adding 3 custom coins to the watchlist, changing the default exchange to KuCoin, reloading the page in incognito mode, and confirming all settings and watchlist items persist.

**Acceptance Scenarios**:
1. **Given** a user adds or reorders coins in their watchlist, **When** the operation completes, **Then** the watchlist state is synchronized with the server.
2. **Given** a user changes model settings (e.g. model selection or analysis mode), **When** saved, **Then** subsequent sessions load these exact preferences automatically.

---

### User Story 3 — Chat & Interactive Reasoning History (Priority: P3)

As a trader, I want my follow-up chats with the AI analyst regarding specific market signals preserved on the server, so I can review previous reasoning and discussions later.

**Why this priority**: Enables auditability of past AI discussions and trading rationale.

**Independent Test**: Can be tested by asking a follow-up question on an analysis, navigating away, and returning to verify the chat thread is intact.

**Acceptance Scenarios**:
1. **Given** a user sends a follow-up question in the AI Chat Widget, **When** the AI responds, **Then** both user prompt and AI response are attached to the analysis record in the database.

---

## Edge Cases

- **Database Concurrency & Locking**: Multiple API requests (e.g., streaming LLM analysis + ticker polling) must not block or crash SQLite reads/writes.
- **Network Disconnection / Offline Mode**: If the server API is temporarily unreachable, the frontend should gracefully fall back to local memory without crashing the UI.
- **Migration & Backwards Compatibility**: Existing users with signals stored in browser `LocalStorage` must have their existing records automatically migrated to the server DB on first load.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store all generated AI market analyses, JSON signal payloads, markdown reports, and Pine Scripts in a local server SQLite database.
- **FR-002**: System MUST provide REST API endpoints (`GET`, `POST`, `PATCH`, `DELETE`) for querying, creating, updating, and deleting analysis records.
- **FR-003**: System MUST store user watchlist items (symbol, exchange, pin status, order) in the database.
- **FR-004**: System MUST store terminal session settings (default exchange, selected timeframe, analysis mode, LLM model choice).
- **FR-005**: System MUST store chat history associated with specific market analyses.
- **FR-006**: System MUST perform seamless auto-migration of existing `LocalStorage` data into SQLite on client startup without duplicate records.
- **FR-007**: Database schema MUST include indexes on `symbol`, `created_at`, and `status` for sub-50ms query performance.

---

## Key Entities & Data Contracts

- **AnalysisRecord**: `id`, `symbol`, `exchange`, `timeframe`, `price`, `signal`, `confidence`, `risk_level`, `json_output` (JSON), `markdown_report`, `pine_script`, `round_trip_cost_pct`, `created_at`, `updated_at`.
- **SignalEvaluation**: `analysis_id`, `status` (PENDING / WIN / LOSS / INVALIDATED / NOT_FILLED), `current_price`, `pnl_percentage`, `gross_pnl_percentage`, `entry_fill_price`, `resolved_at`.
- **WatchlistItem**: `symbol`, `exchange`, `pinned`, `favorite`, `order_index`, `added_at`.
- **ChatMessage**: `id`, `analysis_id`, `symbol`, `role` (user / assistant), `content`, `timestamp`.
- **UserSettings**: `key`, `value`, `updated_at`.

---

## Success Criteria *(mandatory)*

1. **100% Data Persistence**: Analysis records and settings persist across browser restarts, cache wipes, and incognito sessions.
2. **Sub-50ms Response Time**: Fetching the last 50 analysis records or watchlist items from the SQLite database takes under 50 milliseconds.
3. **Zero Loss Data Migration**: 100% of existing browser local storage records are successfully imported into SQLite without data corruption or duplicates.
4. **Zero-Config Deployment**: The database operates as a single SQLite file (`data/app.db`) requiring no separate database server process.

---

## Specification Quality Checklist

- [x] No implementation details (languages, frameworks, specific ORM syntax) in spec requirements
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed
- [x] Acceptance criteria defined for every user story
- [x] Success criteria are measurable and technology-agnostic
