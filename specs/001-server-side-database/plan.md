# Implementation Plan: Server-Side Database Storage

**Branch**: `001-server-side-database`  
**Feature Spec**: [spec.md](./spec.md)  
**Status**: Ready for Task Breakdown (`/speckit-tasks`)

## Technical Context
- **Framework**: Next.js 16 (App Router)
- **Database Engine**: SQLite (`better-sqlite3` driver)
- **Storage Location**: `data/trading.db`
- **Data Entities**: Analyses, Watchlist, Chat Messages, User Settings

## Phase 0: Research & Decisions
- Completed in [research.md](./research.md).
- Decision: Use `better-sqlite3` for synchronous local file access in Next.js API routes with zero server daemon setup.

## Phase 1: Architecture & Contracts
- Data Model: Documented in [data-model.md](./data-model.md).
- Quickstart Guide: Documented in [quickstart.md](./quickstart.md).

## Phase 2: Implementation Phases Overview
1. **Infrastructure**: Install `better-sqlite3` package and build `lib/db/sqlite-client.ts` initialization module.
2. **API Layer**: Build Next.js App Router API endpoints in `app/api/db/*`.
3. **Storage Engine Integration**: Update `lib/storage/app-db.ts` to seamlessly proxy reads and writes to `/api/db/*` with offline LocalStorage fallback.
4. **Data Migration Utility**: Implement auto-migration hook on frontend startup.
5. **Testing & Validation**: Unit tests for DB queries and API endpoints.
