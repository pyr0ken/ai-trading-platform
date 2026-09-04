# 🗄️ Backend & Database — Part 2: Supabase PostgreSQL Schema & RLS Policies

> **Target Database:** Supabase (PostgreSQL 16) with Row Level Security (RLS) enabled on all tables.

---

## 1. Relational Database Schema (DDL)

```sql
-- 1. Agent Sessions Table
CREATE TABLE public.agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Quant Session',
    active_symbol TEXT NOT NULL DEFAULT 'BTC/USDT',
    analyzed_symbols TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

-- 2. Agent Session Messages
CREATE TABLE public.agent_session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    thinking_content TEXT,
    tool_calls JSONB,
    tool_call_id TEXT,
    chart_overlays JSONB,
    trade_setups JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Session Chart Overlays (Per symbol geometry cache)
CREATE TABLE public.agent_session_overlays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    overlays JSONB NOT NULL DEFAULT '[]'::JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, symbol)
);

-- 4. User Declarative Profile
CREATE TABLE public.agent_user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    risk_per_trade_pct NUMERIC(4, 2) NOT NULL DEFAULT 1.50,
    max_open_positions INT NOT NULL DEFAULT 3,
    trading_style TEXT NOT NULL DEFAULT 'SWING',
    favored_symbols TEXT[] DEFAULT ARRAY['BTC/USDT', 'ETH/USDT', 'SOL/USDT']::TEXT[],
    custom_rules TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Historical Trade Reflections & Lessons Learned
CREATE TABLE public.agent_trade_reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('WIN', 'LOSS', 'INVALIDATED')),
    pnl_percentage NUMERIC(6, 2),
    root_cause_analysis TEXT NOT NULL,
    lesson_learned TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 2. Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_session_overlays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_trade_reflections ENABLE ROW LEVEL SECURITY;

-- Team Transparency: Team members can view sessions & reflections
CREATE POLICY "Sessions viewable by authenticated team" ON public.agent_sessions
    FOR SELECT TO authenticated USING (true);

-- User Integrity: Users can only create/update their own sessions
CREATE POLICY "Users insert own sessions" ON public.agent_sessions
    FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users update own sessions" ON public.agent_sessions
    FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);
```
