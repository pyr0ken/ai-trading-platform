-- ====================================================================
-- STEEP QUANT AI TRADING PLATFORM — INSTITUTIONAL SUPABASE SCHEMA
-- Optimized for 3-User Team Trading & Realtime Collaboration
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. User Profiles Table (Connected to Supabase Auth)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 2. Quantitative Trade Strategies Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  timeframe VARCHAR(10) DEFAULT '1h',
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 3. Analyses Table (AI Trade Signals & Quantitative Reports)
-- Tracks EXACTLY which user generated/saved each signal
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  symbol VARCHAR(20) NOT NULL,
  exchange VARCHAR(30) NOT NULL DEFAULT 'kucoin',
  timeframe VARCHAR(10) NOT NULL DEFAULT '1h',
  price DECIMAL(18,8) NOT NULL,
  signal VARCHAR(10) NOT NULL,
  confidence INTEGER NOT NULL,
  conviction_score DECIMAL(5,2),
  risk_level VARCHAR(15) NOT NULL,
  json_output JSONB,
  markdown_report TEXT NOT NULL,
  pine_script TEXT,
  round_trip_cost_pct DECIMAL(5,4) DEFAULT 0.0030,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  entry_fill_price DECIMAL(18,8),
  current_price DECIMAL(18,8),
  pnl_percentage DECIMAL(8,4),
  gross_pnl_percentage DECIMAL(8,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_symbol ON public.analyses(symbol);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON public.analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_created ON public.analyses(created_at DESC);

-- --------------------------------------------------------------------
-- 4. Market Snapshots Table (Exact Orderbook, Indicators & News at Signal Time)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.market_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  ohlcv_candles JSONB NOT NULL,
  technical_facts JSONB NOT NULL,
  decision_zones JSONB NOT NULL,
  microstructure JSONB NOT NULL,
  news_sentiment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 5. Team Interactive AI Chat Messages
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  role VARCHAR(15) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_analysis ON public.chat_messages(analysis_id);

-- --------------------------------------------------------------------
-- 6. Paper Trading Accounts (Per-User Virtual Capital)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paper_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance DECIMAL(18,4) NOT NULL DEFAULT 10000.00,
  equity DECIMAL(18,4) NOT NULL DEFAULT 10000.00,
  total_trades INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  balance_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 7. Paper Trading Positions (Linked to Signal & Trader)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paper_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.paper_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL,
  entry_price DECIMAL(18,8) NOT NULL,
  amount DECIMAL(18,8) NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 1,
  stop_loss DECIMAL(18,8),
  take_profit DECIMAL(18,8),
  pnl DECIMAL(18,4) NOT NULL DEFAULT 0,
  pnl_pct DECIMAL(8,4) NOT NULL DEFAULT 0,
  status VARCHAR(15) NOT NULL DEFAULT 'OPEN',
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_positions_user_status ON public.paper_positions(user_id, status);

-- --------------------------------------------------------------------
-- 8. AI Trade Reflections (Closed-Loop Self-Tuning Analysis)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trade_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.paper_positions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outcome VARCHAR(15) NOT NULL,
  ai_reflection TEXT NOT NULL,
  mistake_category VARCHAR(50),
  suggested_penalty DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 9. Backtest Runs Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.backtest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  symbol VARCHAR(20) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  initial_balance DECIMAL(18,4) NOT NULL DEFAULT 10000.00,
  final_balance DECIMAL(18,4) NOT NULL,
  sharpe_ratio DECIMAL(6,3),
  max_drawdown_pct DECIMAL(6,3),
  win_rate_pct DECIMAL(5,2),
  trades_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  equity_curve JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 10. Per-User Watchlists Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  exchange VARCHAR(30) NOT NULL DEFAULT 'kucoin',
  pinned BOOLEAN NOT NULL DEFAULT false,
  favorite BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_symbol_exchange UNIQUE (user_id, symbol, exchange)
);

-- --------------------------------------------------------------------
-- 11. Alerts & Webhooks Configuration
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alert_type VARCHAR(30) NOT NULL,
  target_channel VARCHAR(20) NOT NULL,
  webhook_url TEXT,
  conditions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 12. Global Whale Transactions Log
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whale_transactions (
  id VARCHAR(100) PRIMARY KEY,
  token VARCHAR(15) NOT NULL,
  amount DECIMAL(24,8) NOT NULL,
  value_usd DECIMAL(18,2) NOT NULL,
  from_address TEXT,
  to_address TEXT,
  from_label TEXT,
  to_label TEXT,
  direction VARCHAR(20) NOT NULL,
  severity VARCHAR(15) NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 13. Audit Trail Log (Security & Action Tracking)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- Automatic Profile & Account Initialization Trigger
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create Profile
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create Paper Trading Account (Default $10,000)
  INSERT INTO public.paper_accounts (user_id, balance, equity)
  VALUES (NEW.id, 10000.00, 10000.00);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------
-- TEAM SECURITY POLICIES (Row Level Security - RLS)
-- Rule: READ-ALL for team transparency, WRITE-OWN ONLY for data integrity
-- --------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

-- 1. Profiles (Read all, Update own)
CREATE POLICY "Profiles viewable by team" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id);

-- 2. Analyses (Read all team signals, Write/Update own)
CREATE POLICY "Analyses viewable by team" ON public.analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own analyses" ON public.analyses FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users update own analyses" ON public.analyses FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users delete own analyses" ON public.analyses FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 3. Market Snapshots (Read all team snapshots, Insert own)
CREATE POLICY "Snapshots viewable by team" ON public.market_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert snapshots" ON public.market_snapshots FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Chat Messages (Read all, Insert own, Delete own)
CREATE POLICY "Chat viewable by team" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own chat" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users delete own chat" ON public.chat_messages FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 5. Paper Accounts (Read all team accounts for leaderboard/transparency, Update own)
CREATE POLICY "Paper accounts viewable by team" ON public.paper_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own paper account" ON public.paper_accounts FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- 6. Paper Positions (Read all team positions, Write/Update own)
CREATE POLICY "Paper positions viewable by team" ON public.paper_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own positions" ON public.paper_positions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users update own positions" ON public.paper_positions FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users delete own positions" ON public.paper_positions FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 7. Backtest Runs (Read all team backtests, Write own)
CREATE POLICY "Backtest runs viewable by team" ON public.backtest_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own backtests" ON public.backtest_runs FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users delete own backtests" ON public.backtest_runs FOR DELETE USING ((select auth.uid()) = user_id);

-- 8. Watchlists (Read own/team watchlists, Write own)
CREATE POLICY "Watchlists viewable by team" ON public.watchlists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own watchlist" ON public.watchlists FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users update own watchlist" ON public.watchlists FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users delete own watchlist" ON public.watchlists FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 9. Strategies (Read all, Write own)
CREATE POLICY "Strategies viewable by team" ON public.strategies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own strategy" ON public.strategies FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = created_by);
CREATE POLICY "Users update own strategy" ON public.strategies FOR UPDATE TO authenticated USING ((select auth.uid()) = created_by) WITH CHECK ((select auth.uid()) = created_by);
