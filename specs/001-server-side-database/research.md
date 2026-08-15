# Technical Research: Server-Side Database Storage

## Decision 1: Database Engine Choice
- **Chosen Technology**: SQLite (`better-sqlite3` or Node native SQLite)
- **Rationale**: 
  - Zero external server requirement (operates as a local file `data/trading.db`).
  - Extremely fast (sub-5ms read/write latency on local NVMe/SSD).
  - Perfect fit for desktop/local AI trading assistant architecture.
  - Native JSON column support for complex `StructuredLLMOutput` signal contracts.
- **Alternatives Considered**:
  - PostgreSQL: Overkill for a local single-user/team desktop trading app; requires running a separate postgres daemon.
  - MongoDB: Unnecessary overhead for structured signal records and key-value settings.

## Decision 2: Schema Migration & Auto-Sync Strategy
- **Chosen Approach**:
  - Store database file at `data/trading.db` (git-ignored).
  - Create table schema automatically on server startup (`CREATE TABLE IF NOT EXISTS`).
  - Implement a client-side migration trigger in `lib/storage/app-db.ts` that detects legacy `LocalStorage` records and pushes them to `/api/db/import` on first launch.
- **Rationale**: Guarantees zero data loss for existing users while seamlessly transitioning to server DB.

## Decision 3: API Architecture
- **Chosen Routes**:
  - `GET /api/db/analyses` — List/filter historical analyses
  - `POST /api/db/analyses` — Save new analysis record
  - `GET/POST /api/db/watchlist` — Manage watchlist items
  - `GET/POST /api/db/chats` — Manage chat history per analysis
  - `GET/POST /api/db/settings` — Read/write user settings
  - `POST /api/db/import` — Batch migration endpoint for legacy LocalStorage data
