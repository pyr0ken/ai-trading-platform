'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  BarChart2,
  LineChart,
  Coins,
  Target,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { AppStorageEngine, StoredAnalysisRecord } from '@/lib/storage/app-db';

interface ExecutiveReportingDashboardProps {
  onNavigateToTerminal?: (symbol?: string, exchange?: string, timeframe?: string) => void;
}

export const ExecutiveReportingDashboard: React.FC<ExecutiveReportingDashboardProps> = ({
  onNavigateToTerminal,
}) => {
  const [analyses, setAnalyses] = useState<StoredAnalysisRecord[]>([]);
  const [fearGreed, setFearGreed] = useState<{ value: number; label: string }>({
    value: 50,
    label: 'Neutral',
  });
  const [paperStats, setPaperStats] = useState({ openCount: 0, totalPnl: 0 });

  // Independent loading states for progressive loading
  const [isAnalysesLoading, setIsAnalysesLoading] = useState(true);
  const [isFearGreedLoading, setIsFearGreedLoading] = useState(true);
  const [isPaperLoading, setIsPaperLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Analyses asynchronously
    const fetchAnalyses = async () => {
      setIsAnalysesLoading(true);
      try {
        const records = await AppStorageEngine.fetchAnalysesFromDb();
        setAnalyses(records);
      } catch (err) {
        console.warn('Failed to load analyses:', err);
      } finally {
        setIsAnalysesLoading(false);
      }
    };

    // 2. Fetch Fear & Greed asynchronously
    const fetchFearGreed = async () => {
      setIsFearGreedLoading(true);
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=1');
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.[0]) {
            setFearGreed({
              value: parseInt(json.data[0].value, 10),
              label: json.data[0].value_classification,
            });
          }
        }
      } catch {
        // Fallback default
      } finally {
        setIsFearGreedLoading(false);
      }
    };

    // 3. Fetch Paper Portfolio asynchronously
    const fetchPaper = async () => {
      setIsPaperLoading(true);
      try {
        const positions = AppStorageEngine.getPaperPositions() || [];
        const openTrades = positions.filter((t) => t.status === 'OPEN');
        const pnl = positions.reduce((acc, t) => acc + (t.pnl || 0), 0);
        setPaperStats({ openCount: openTrades.length, totalPnl: pnl });
      } catch {
        // Fallback
      } finally {
        setIsPaperLoading(false);
      }
    };

    fetchAnalyses();
    fetchFearGreed();
    fetchPaper();

    const handleStorage = () => {
      setAnalyses(AppStorageEngine.getAnalyses());
      try {
        const positions = AppStorageEngine.getPaperPositions() || [];
        const openTrades = positions.filter((t) => t.status === 'OPEN');
        const pnl = positions.reduce((acc, t) => acc + (t.pnl || 0), 0);
        setPaperStats({ openCount: openTrades.length, totalPnl: pnl });
      } catch {}
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-storage-updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-storage-updated', handleStorage);
    };
  }, []);

  // Compute key executive metrics
  const metrics = useMemo(() => {
    const total = analyses.length;
    const resolved = analyses.filter(
      (a) =>
        a.accuracy_evaluation &&
        a.accuracy_evaluation.status !== 'PENDING' &&
        a.accuracy_evaluation.status !== 'NOT_FILLED'
    );
    const wins = resolved.filter((a) => a.accuracy_evaluation?.status === 'WIN').length;
    const losses = resolved.filter((a) => a.accuracy_evaluation?.status === 'LOSS').length;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    const bullishCount = analyses.filter((a) => a.signal === 'BULLISH' || a.signal === 'SCALP_LONG').length;
    const bearishCount = analyses.filter((a) => a.signal === 'BEARISH' || a.signal === 'SCALP_SHORT').length;

    return {
      totalAnalyses: total,
      wins,
      losses,
      winRate,
      bullishRatio: total > 0 ? Math.round((bullishCount / total) * 100) : 50,
      bearishRatio: total > 0 ? Math.round((bearishCount / total) * 100) : 50,
    };
  }, [analyses]);

  // Symbol Accuracy Breakdown
  const symbolBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; wins: number; losses: number }>();
    analyses.forEach((item) => {
      const sym = item.symbol || 'BTC/USDT';
      const existing = map.get(sym) || { total: 0, wins: 0, losses: 0 };
      existing.total += 1;
      if (item.accuracy_evaluation?.status === 'WIN') existing.wins += 1;
      if (item.accuracy_evaluation?.status === 'LOSS') existing.losses += 1;
      map.set(sym, existing);
    });
    return Array.from(map.entries()).map(([symbol, stat]) => ({
      symbol,
      total: stat.total,
      wins: stat.wins,
      losses: stat.losses,
      winRate: stat.wins + stat.losses > 0 ? Math.round((stat.wins / (stat.wins + stat.losses)) * 100) : 0,
    }));
  }, [analyses]);

  return (
    <div className="h-full w-full bg-[#08080a] text-[#e2e3e9] overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
      {/* Header Banner - Sleek Theme Card */}
      <div className="bg-gradient-to-r from-[#0c0d13] via-[#0e1017] to-[#08080a] border border-[#1c1d26] rounded-[10px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.6)] flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Glow Accent Sheen */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#cc9166]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#cc9166]/15 border border-[#cc9166]/30 flex items-center justify-center shadow-[0_0_12px_rgba(204,145,102,0.2)]">
              <ShieldCheck className="w-4.5 h-4.5 text-[#cc9166]" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-[#ffffff] tracking-tight font-mono">
                EXECUTIVE PERFORMANCE OVERVIEW
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SYSTEM NOMINAL
                </span>
                <span className="text-xs text-[#9194a1] font-sans">
                  AI signals, win rates & portfolio telemetry
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => onNavigateToTerminal?.()}
            className="flex items-center gap-2 bg-gradient-to-r from-[#cc9166] to-[#d4a373] text-[#08080a] hover:brightness-110 px-4 py-2 text-xs font-bold font-mono rounded-[6px] transition-all cursor-pointer shadow-[0_2px_12px_rgba(204,145,102,0.3)]"
          >
            <LineChart className="w-4 h-4" />
            <span>Open Live Terminal</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid with Theme Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Signal Win Rate KPI Box */}
        {isAnalysesLoading ? (
          <div className="bg-[#0c0d12] border border-[#1c1d26] p-4 rounded-[10px] space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-[#161822] rounded" />
              <div className="h-4 w-4 bg-[#161822] rounded" />
            </div>
            <div className="h-7 w-20 bg-[#161822] rounded" />
            <div className="h-2 w-full bg-[#12131a] rounded" />
          </div>
        ) : (
          <div className="bg-gradient-to-b from-[#0e0f16] to-[#090a0d] border border-[#1c1d26] border-t-2 border-t-emerald-500 hover:border-emerald-500/50 p-4 rounded-[10px] space-y-2.5 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] group relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-[#9194a1] uppercase tracking-wider">
                Signal Win Rate
              </span>
              <div className="w-7 h-7 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-[#ffffff]">
                {metrics.winRate}%
              </span>
              <span className="text-xs font-mono text-[#9194a1]">
                ({metrics.wins}W / {metrics.losses}L)
              </span>
            </div>
            <div className="w-full bg-[#161822] h-1.5 rounded-full overflow-hidden border border-[#222432]">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                style={{ width: `${metrics.winRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Total AI Signals Evaluated KPI Box */}
        {isAnalysesLoading ? (
          <div className="bg-[#0c0d12] border border-[#1c1d26] p-4 rounded-[10px] space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-[#161822] rounded" />
              <div className="h-4 w-4 bg-[#161822] rounded" />
            </div>
            <div className="h-7 w-16 bg-[#161822] rounded" />
            <div className="h-3 w-32 bg-[#12131a] rounded" />
          </div>
        ) : (
          <div className="bg-gradient-to-b from-[#0e0f16] to-[#090a0d] border border-[#1c1d26] border-t-2 border-t-[#cc9166] hover:border-[#cc9166]/50 p-4 rounded-[10px] space-y-2.5 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] group relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-[#9194a1] uppercase tracking-wider">
                AI Signals Run
              </span>
              <div className="w-7 h-7 rounded-[6px] bg-[#cc9166]/10 border border-[#cc9166]/20 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-[#cc9166]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-[#ffffff]">
                {metrics.totalAnalyses}
              </span>
              <span className="text-xs text-[#9194a1] font-mono">Total Runs</span>
            </div>
            <div className="text-[11px] text-[#9194a1] font-mono flex items-center justify-between pt-0.5">
              <span>
                Bullish: <span className="text-emerald-400 font-bold">{metrics.bullishRatio}%</span>
              </span>
              <span>
                Bearish: <span className="text-rose-400 font-bold">{metrics.bearishRatio}%</span>
              </span>
            </div>
          </div>
        )}

        {/* Market Sentiment (Fear & Greed) KPI Box */}
        {isFearGreedLoading ? (
          <div className="bg-[#0c0d12] border border-[#1c1d26] p-4 rounded-[10px] space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-32 bg-[#161822] rounded" />
              <div className="h-4 w-4 bg-[#161822] rounded" />
            </div>
            <div className="h-7 w-14 bg-[#161822] rounded" />
            <div className="h-2 w-full bg-[#12131a] rounded" />
          </div>
        ) : (
          <div className="bg-gradient-to-b from-[#0e0f16] to-[#090a0d] border border-[#1c1d26] border-t-2 border-t-amber-400 hover:border-amber-400/50 p-4 rounded-[10px] space-y-2.5 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] group relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-[#9194a1] uppercase tracking-wider">
                Market Sentiment
              </span>
              <div className="w-7 h-7 rounded-[6px] bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-amber-400">
                {fearGreed.value}
              </span>
              <span className="text-xs text-[#9194a1] font-mono uppercase font-bold">
                ({fearGreed.label})
              </span>
            </div>
            <div className="w-full bg-[#161822] h-1.5 rounded-full overflow-hidden border border-[#222432]">
              <div
                className="bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 h-full transition-all duration-500"
                style={{ width: `${fearGreed.value}%` }}
              />
            </div>
          </div>
        )}

        {/* Paper Portfolio PnL KPI Box */}
        {isPaperLoading ? (
          <div className="bg-[#0c0d12] border border-[#1c1d26] p-4 rounded-[10px] space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-[#161822] rounded" />
              <div className="h-4 w-4 bg-[#161822] rounded" />
            </div>
            <div className="h-7 w-24 bg-[#161822] rounded" />
            <div className="h-3 w-20 bg-[#12131a] rounded" />
          </div>
        ) : (
          <div
            className={`bg-gradient-to-b from-[#0e0f16] to-[#090a0d] border border-[#1c1d26] ${
              paperStats.totalPnl >= 0 ? 'border-t-2 border-t-emerald-500' : 'border-t-2 border-t-rose-500'
            } p-4 rounded-[10px] space-y-2.5 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] group relative overflow-hidden`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-[#9194a1] uppercase tracking-wider">
                Paper Portfolio PnL
              </span>
              <div
                className={`w-7 h-7 rounded-[6px] ${
                  paperStats.totalPnl >= 0
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                } flex items-center justify-center`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-mono font-bold ${
                  paperStats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {paperStats.totalPnl >= 0 ? '+' : ''}
                {paperStats.totalPnl.toFixed(2)}{' '}
                <span className="text-xs font-mono text-[#9194a1]">USDT</span>
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#9194a1] flex items-center justify-between pt-0.5">
              <span>Open Trades:</span>
              <span className="text-[#ffffff] font-bold">{paperStats.openCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Section Grid: Accuracy Matrix & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accuracy Matrix Box */}
        <div className="lg:col-span-2 bg-gradient-to-b from-[#0c0d13] to-[#08080b] border border-[#1c1d26] hover:border-[#cc9166]/30 rounded-[10px] p-5 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.6)] transition-all">
          <div className="flex items-center justify-between border-b border-[#1c1d26] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[6px] bg-[#cc9166]/10 border border-[#cc9166]/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-[#cc9166]" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-bold text-[#ffffff] uppercase tracking-wider">
                  Signal Accuracy Matrix by Symbol
                </h2>
                <span className="text-[10px] text-[#9194a1] font-sans">
                  Historical win/loss accuracy breakdown per asset
                </span>
              </div>
            </div>
            {!isAnalysesLoading && (
              <span className="text-[11px] text-[#cc9166] font-mono bg-[#cc9166]/10 border border-[#cc9166]/20 px-2 py-0.5 rounded font-bold">
                {symbolBreakdown.length} Assets
              </span>
            )}
          </div>

          {isAnalysesLoading ? (
            <div className="space-y-3 pt-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#1c1d26]/40">
                  <div className="h-4 w-20 bg-[#161822] rounded" />
                  <div className="h-4 w-12 bg-[#161822] rounded" />
                  <div className="h-4 w-10 bg-[#161822] rounded" />
                  <div className="h-4 w-10 bg-[#161822] rounded" />
                  <div className="h-4 w-16 bg-[#161822] rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-[#1c1d26] bg-[#06070a] text-[#8b8e9d] font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 rounded-l">Symbol</th>
                    <th className="py-2.5 px-3">Total Calls</th>
                    <th className="py-2.5 px-3">Wins</th>
                    <th className="py-2.5 px-3">Losses</th>
                    <th className="py-2.5 px-3 text-right">Win Rate</th>
                    <th className="py-2.5 px-3 text-right rounded-r">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1d26]/60 font-mono">
                  {symbolBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#9194a1] font-sans">
                        No historical signal evaluations recorded yet. Run analyses in Live Terminal.
                      </td>
                    </tr>
                  ) : (
                    symbolBreakdown.map((row) => (
                      <tr key={row.symbol} className="hover:bg-[#12131c] transition-colors">
                        <td className="py-3 px-3 font-bold text-[#ffffff]">{row.symbol}</td>
                        <td className="py-3 px-3 text-[#9194a1]">{row.total}</td>
                        <td className="py-3 px-3 text-emerald-400 font-bold">{row.wins}</td>
                        <td className="py-3 px-3 text-rose-400 font-bold">{row.losses}</td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-[4px] font-bold text-[11px] border ${
                              row.winRate >= 60
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : row.winRate >= 40
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {row.winRate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => onNavigateToTerminal?.(row.symbol)}
                            className="text-xs text-[#cc9166] hover:text-[#e6b38c] hover:underline cursor-pointer flex items-center justify-end gap-1 ml-auto font-sans font-semibold group/btn"
                          >
                            <span>Analyze</span>
                            <ArrowUpRight className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Intelligence Side Panel Box */}
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-[#0c0d13] to-[#08080b] border border-[#1c1d26] hover:border-[#cc9166]/30 rounded-[10px] p-5 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.6)] transition-all">
            <div className="flex items-center justify-between border-b border-[#1c1d26] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[6px] bg-[#cc9166]/10 border border-[#cc9166]/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#cc9166]" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold text-[#ffffff] uppercase tracking-wider">
                    Recent AI Signals
                  </h3>
                  <span className="text-[10px] text-[#9194a1] font-sans">Live stream</span>
                </div>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-[#cc9166] animate-pulse" />
            </div>

            {isAnalysesLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3 bg-[#12131a] border border-[#1c1d26] rounded-[6px] flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="h-4 w-24 bg-[#181924] rounded" />
                      <div className="h-3 w-16 bg-[#181924] rounded" />
                    </div>
                    <div className="h-5 w-16 bg-[#181924] rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {analyses.slice(0, 5).map((rec) => {
                  const isBullish = rec.signal === 'BULLISH' || rec.signal === 'SCALP_LONG';
                  return (
                    <div
                      key={rec.id}
                      className="p-3 bg-[#0a0b0e] border border-[#1b1c24] rounded-[8px] flex items-center justify-between hover:border-[#cc9166]/40 hover:bg-[#12131b] transition-all cursor-pointer group"
                      onClick={() => onNavigateToTerminal?.(rec.symbol, rec.exchange, rec.timeframe)}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#ffffff] group-hover:text-[#cc9166] transition-colors">
                            {rec.symbol}
                          </span>
                          <span className="text-[9px] text-[#9194a1] font-mono bg-[#161822] px-1 py-0.2 rounded border border-[#222432]">
                            {rec.timeframe}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#9194a1] block mt-0.5 font-sans">
                          {new Date(rec.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded-[4px] border inline-block ${
                            isBullish
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {rec.signal}
                        </span>
                        <span className="text-[10px] text-[#9194a1] block font-mono mt-0.5">
                          {rec.confidence}% Conf.
                        </span>
                      </div>
                    </div>
                  );
                })}

                {analyses.length === 0 && (
                  <p className="text-xs text-[#9194a1] text-center py-6 font-sans">
                    No signals generated yet. Run an analysis in the Terminal!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
