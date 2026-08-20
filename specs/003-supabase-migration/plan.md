# Implementation Plan: Supabase Online Migration & 3-User Team Workspace

**Feature**: `003-supabase-migration`  
**Created**: 2026-08-20  
**Status**: In Progress  
**Database Target**: Supabase PostgreSQL (`https://ecfzfcpiyalrcavgytyk.supabase.co`)

---

## 1. Executive Summary & Goal

Migrate the AI Trading Platform from a single-user local SQLite (`better-sqlite3`) setup to an online, multi-user Supabase PostgreSQL database. The application will support a 3-member trading team where:
- All signals, analyses, paper positions, backtests, and chat messages are transparently readable by all team members.
- Write/Update permissions are strictly restricted to the user who created the record (enforced via Row Level Security - RLS).
- Signals and positions are tagged with the creator's `@username`.
- LocalStorage caching remains active for 0ms instantaneous UI renders, backed by asynchronous Supabase cloud persistence and Realtime WebSocket updates.

---

## 2. Technical Architecture & Component Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           Client Browser (React 19)                       │
│  ┌───────────────────────┐   ┌────────────────────┐   ┌─────────────────┐ │
│  │ LocalStorage 0ms Cache │   │ @supabase/client   │   │ Realtime WS     │ │
│  └───────────┬───────────┘   └─────────┬──────────┘   └────────┬────────┘ │
└──────────────┼─────────────────────────┼───────────────────────┼──────────┘
               │ sync                    │ REST                  │ Live Push
               ▼                         ▼                       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      Supabase Cloud Backend (PostgreSQL)                  │
│  ┌─────────────────────────┐           ┌──────────────────────────────┐   │
│  │ auth.users (3 Members)  │ ────────> │ public.profiles (Usernames)  │   │
│  └─────────────────────────┘           └──────────────┬───────────────┘   │
│                                                       │ 1:N               │
│  ┌─────────────────────────┐           ┌──────────────▼───────────────┐   │
│  │ public.analyses         │ <───────> │ public.paper_positions       │   │
│  └─────────────────────────┘           └──────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Implementation Phases

### Phase 1: Dependencies & Supabase SDK Integration
- [x] Create DDL Schema script `supabase/schema.sql` and execute on Supabase project via MCP.
- [ ] Install `@supabase/supabase-js` package.
- [ ] Create `lib/supabase/client.ts` for browser component connections.
- [ ] Create `lib/supabase/server.ts` for server-side Next.js route handlers.

### Phase 2: Team Authentication & Profile Context
- [ ] Implement team login / sign-in modal (`components/auth/team-login-modal.tsx`).
- [ ] Create `AuthContext` provider (`components/providers/auth-provider.tsx`) to supply current active user state (`user`, `profile`).
- [ ] Bind user metadata (`username`, `avatar_url`) on registration / login.

### Phase 3: Hybrid Storage Engine Upgrade (`AppStorageEngine`)
- [ ] Refactor `lib/storage/app-db.ts` to route all queries (`saveAnalysis`, `getAnalyses`, `savePosition`, `updatePosition`) to Supabase REST API when authenticated.
- [ ] Update API routes under `app/api/db/` to proxy requests to Supabase with session credentials.
- [ ] Maintain LocalStorage caching layer for zero-latency UI rendering.

### Phase 4: Trader Attribution UI Enhancements
- [ ] Update `ExecutiveSignalCard` and `HistorySignalTable` to render trader username badge (e.g. `@omid`, `@reza`).
- [ ] Update `PaperPortfolio` to show trader username for each active position.
- [ ] Update `AIChatWidget` to display team member usernames and avatars on chat messages.

### Phase 5: Supabase Realtime Collaboration
- [ ] Add Realtime subscriptions in `useLLMAnalysis` and `useMarketData` to auto-receive signals and position updates created by other team members without page refresh.

### Phase 6: Legacy SQLite Data Migration & Verification
- [ ] Create one-time migration script `scripts/migrate_sqlite_to_supabase.ts` to port existing local SQLite analysis records to Supabase.
- [ ] Run test suite (`npm run test`) and production build (`npm run build`).

---

## 4. Security & RLS Verification Matrix

| Entity | Read Access | Write Access | Delete Access | RLS Policy Name |
|---|---|---|---|---|
| `profiles` | All 3 Members | Own profile only | Blocked | `Profiles viewable by team` |
| `analyses` | All 3 Members | Own user_id only | Own user_id only | `Analyses viewable by team` |
| `paper_accounts` | All 3 Members | Own user_id only | Blocked | `Paper accounts viewable by team` |
| `paper_positions` | All 3 Members | Own user_id only | Own user_id only | `Paper positions viewable by team` |
| `chat_messages` | All 3 Members | Own user_id only | Own user_id only | `Chat viewable by team` |
| `backtest_runs` | All 3 Members | Own user_id only | Own user_id only | `Backtest runs viewable by team` |

---

## 5. Verification Commands

1. **Verify Supabase SDK**: `npm run test`
2. **Verify Build**: `npm run build`
3. **Verify RLS**: Query Supabase as User A and attempt to update User B's position (must fail with HTTP 403 / RLS policy violation).
