# Task List: Supabase Online Migration & Team Collaboration

**Feature**: `003-supabase-migration`  
**Target Branch**: `main`  
**SpecKit Plan**: `specs/003-supabase-migration/plan.md`

---

## Task Breakdown

### Task 1: Package Installation & Supabase SDK Setup
- [x] Run `npm install @supabase/supabase-js`
- [x] Create `lib/supabase/client.ts` using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] Create `lib/supabase/server.ts` using `SUPABASE_SECRET_KEY`

### Task 2: Auth Provider & Team Login Component
- [x] Create `types/auth.ts` defining `UserProfile` and `TeamAuthSession`
- [x] Create `components/providers/auth-provider.tsx` for managing active user state
- [x] Create `components/auth/team-login-page.tsx` with simple username/password login & profile setup for the 3 team members

### Task 3: Database Storage Adapter Upgrade (`AppStorageEngine`)
- [x] Update `lib/storage/app-db.ts` to sync `saveAnalysis`, `getAnalyses`, `savePosition`, `updatePositionStatus` with Supabase REST API
- [x] Update `app/api/db/analyses/route.ts` to query Supabase
- [x] Update `app/api/db/paper/route.ts` to query Supabase

### Task 4: UI Trader Badges & Attribution
- [x] Update `components/terminal/executive-signal-card.tsx` to render trader `@username` badge
- [x] Update `components/terminal/history-signal-table.tsx` to display `@username` column
- [x] Update `components/dashboard/dashboard-ticker-tape.tsx` to display position creator `@username`

### Task 5: Realtime Subscription Setup
- [x] Add Supabase Realtime channel subscription in `AppStorageEngine` to push new signals & position updates to all 3 connected team browsers live

### Task 6: Verification & Cleanup
- [x] Run `npm run test`
- [x] Run `npm run build`
