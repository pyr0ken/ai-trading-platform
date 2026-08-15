# Tasks: Server-Side Database Storage

**Input**: Design documents from `/specs/001-server-side-database/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Install `better-sqlite3` and `@types/better-sqlite3` dependencies in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T002 Create database initialization and connection singleton in `lib/db/sqlite-client.ts`
- [x] T003 Create auto-table initialization and DDL schema execution in `lib/db/schema.ts`

---

## Phase 3: User Story 1 - Persistent Analysis & Signal History (Priority: P1) 🎯 MVP

**Goal**: Store all AI market analysis records, signals, reports, and accuracy updates in SQLite.

- [x] T004 [US1] Implement REST API endpoints for GET/POST/PATCH/DELETE analysis records in `app/api/db/analyses/route.ts`
- [x] T005 [US1] Update `lib/storage/app-db.ts` to fetch and persist analysis records via `/api/db/analyses`

---

## Phase 4: User Story 2 - Server-Synced Watchlist & Settings (Priority: P2)

**Goal**: Store custom watchlists and user workspace settings on the server DB.

- [x] T006 [P] [US2] Implement REST API endpoints for GET/POST watchlist items in `app/api/db/watchlist/route.ts`
- [x] T007 [P] [US2] Implement REST API endpoints for GET/POST user settings in `app/api/db/settings/route.ts`
- [x] T008 [US2] Update `lib/storage/app-db.ts` to sync watchlist and settings changes with the server

---

## Phase 5: User Story 3 - Chat & Interactive History (Priority: P3)

**Goal**: Store interactive AI chat threads attached to analysis records and import legacy LocalStorage data.

- [x] T009 [P] [US3] Implement REST API endpoints for GET/POST chat messages in `app/api/db/chats/route.ts`
- [x] T010 [US3] Implement batch data migration endpoint for legacy browser storage in `app/api/db/import/route.ts`

---

## Phase 6: Polish & Verification

- [x] T011 Run vitest test suite (`npm run test`) and verify sub-50ms database operations
