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

  // Independent loading states for progressive/staggered loading
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
    <div className="h-full w-full bg-[#08080a] text-[#e2e3e9] overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Header Banner - Renders Immediately */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1f222e] pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#cc9166]" />
            <h1 className="text-xl font-semibold text-[#f1f3f9] tracking-tight">
              Executive Performance Dashboard
            </h1>
          </div>
          <p className="text-xs text-[#8b8e9d] mt-1 font-sans">
            Comprehensive system analytics, AI signal accuracy ratios, and market intelligence metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToTerminal?.()}
            className="flex items-center gap-2 bg-[#cc9166] text-[#08080a] hover:bg-[#cc9166]/90 px-4 py-2 text-xs font-semibold rounded-[2px] transition-all cursor-pointer shadow-sm"
          >
            <LineChart className="w-4 h-4" />
            <span>Open Live Terminal</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Progressive Skeleton & Content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Win Rate KPI */}
        {isAnalysesLoading ? (
          <div className="bg-[#0d0e12] border border-[#1f222e] p-4 rounded-[4px] space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-[#161820] rounded" />
              <div className="h-4 w-4 bg-[#161820] rounded" />
            </div>
            <div className="h-7 w-20 bg-[#161820] rounded" />
            <div className="h-2 w-full bg-[#121317] rounded" />
          </div>
        ) : (
          <div className="bg-[#0d0e12] border border-[#1f222e] p-4 rounded-[4px] space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#8b8e9d] uppercase tracking-wider">
                Signal Win Rate
              </span>
              <Award className="w-4 h-4 text-[#10b981]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-[#f1f3f9]">
                {metrics.winRate}%
              </span>
              <span className="text-xs font-mono text-[#8b8e9d]">
                ({metrics.wins}W / {metrics.losses}L)
              </span>
            </div>
            <div className="w-full bg-[#161820] h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-[#10b981] h-full transition-all duration-500"
                style={{ width: `${metrics.winRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Total Analyses KPI */}
        {isAnalysesLoading ? (
          <div className="bg-[#0d0e12] border border-[#1f222e] p-4 rounded-[4px] space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-[#161820] rounded" />
              <div className="h-4 w-4 bg-[#161820] rounded" />
            </div>
            <div className="h-7 w-16 bg-[#161820] rounded" />
            <div className="h-3 w-32 bg-[#121317] rounded" />
          </div>
        ) : (
          <div className="bg-[#0d0e12] border border-[#1f222e] p-4 rounded-[4px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#8b8e9d] uppercase tracking-wider">
                AI Analyses Evaluated
              </span>
              <Activity className="w-4 h-4 text-[#cc9166]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-[#f1f3f9]">
                {metrics.totalAnalyses}
              </span>
              <span className="text-xs text-[#8b8e9d] font-mono">Signals Run</span>
            </div>
            <p className="text-[11px] text-[#8b8e9d]">
              Bullish: <span className="text-[#10b981] font-mono">{metrics.bullishRatio}%</span> · Bearish:{' '}
              <span className="text-[#ef4444] font-mono">{metrics.bearishRatio}%</span>
            </p>
          </div>
        )}

        {/* Market Sentiment KPI */}
        {isFearGreedLoading ? (
          <div className="bg-[#0d0e12] border border-[#1f222e] p-4 rounded-[4px] space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-32 bg-[#161820] rounded" />
              <div className="h-4 w-4 bg-[#161820] rounded" />
            </div>
            <div className="h-7 w-14 bg-[#161820] rounded" />
            <div className="h-2 w-full bg-[#121317] rounded" />
          </div>
        ) : (
          <div className="bg-[#0d0e12] border border-[#1f222e] p-4 rounded-[4px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#8b8e9d] uppercase tracking-wider">
                Market Sentiment (F&G)
              </span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-amber-400">
                {fearGreed.value}
              </span>
              <span className="text-xs text-[#8b8e9d] font-mono uppercase">
                ({fearGreed.label})
              </span>
            </div>
            <div className="w-full bg-[#161820] h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 h-full transition-all duration-500"
                style={{ width: `${fearGreed.value}%` }}
              />
            </div>
          </div>
        )}

        {/* Paper Portfolio PnL KPI */}
        {isPaperLoading ? (
          <div className="bg-[#0d0e12] border border-[#1f222e] p-4 rounded-[4px] space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-[#161820] rounded" />
              <div className="h-4 w-4 bg-[#161820] rounded" />
            </div>
            <div className="h-7 w-24 bg-[#161820] rounded" />
            <div className="h-3 w-20 bg-[#121317] rounded" />
          </div>
        ) : (
          <div className="bg-[#0d0e12] border border-[#1f222e] p-4 rounded-[4px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#8b8e9d] uppercase tracking-wider">
                Paper Portfolio PnL
              </span>
              <BarChart2 className="w-4 h-4 text-[#cc9166]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-mono font-bold ${
                  paperStats.totalPnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
                }`}
              >
                {paperStats.totalPnl >= 0 ? '+' : ''}
                {paperStats.totalPnl.toFixed(2)} USDT
              </span>
            </div>
            <p className="text-[11px] text-[#8b8e9d]">
              Active Positions: <span className="font-mono text-[#f1f3f9]">{paperStats.openCount}</span>
            </p>
          </div>
        )}
      </div>

      {/* Main Section Grid: Accuracy Matrix & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accuracy Matrix Table */}
        <div className="lg:col-span-2 bg-[#0d0e12] border border-[#1f222e] rounded-[4px] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f222e] pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#cc9166]" />
              <h2 className="text-sm font-semibold text-[#f1f3f9] uppercase tracking-wider">
                Signal Accuracy Matrix by Symbol
              </h2>
            </div>
            {!isAnalysesLoading && (
              <span className="text-xs text-[#8b8e9d] font-mono">{symbolBreakdown.length} Tracked</span>
            )}
          </div>

          {isAnalysesLoading ? (
            <div className="space-y-3 pt-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#1f222e]/40">
                  <div className="h-4 w-20 bg-[#161820] rounded" />
                  <div className="h-4 w-12 bg-[#161820] rounded" />
                  <div className="h-4 w-10 bg-[#161820] rounded" />
                  <div className="h-4 w-10 bg-[#161820] rounded" />
                  <div className="h-4 w-16 bg-[#161820] rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-[#1f222e] text-[#8b8e9d] font-mono text-[11px] uppercase">
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Total Calls</th>
                    <th className="py-2.5 px-3">Wins</th>
                    <th className="py-2.5 px-3">Losses</th>
                    <th className="py-2.5 px-3 text-right">Win Rate</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f222e]/60 font-mono">
                  {symbolBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#8b8e9d] font-sans">
                        No historical signal evaluations recorded yet. Run analyses in Live Terminal.
                      </td>
                    </tr>
                  ) : (
                    symbolBreakdown.map((row) => (
                      <tr key={row.symbol} className="hover:bg-[#161820] transition-colors">
                        <td className="py-3 px-3 font-semibold text-[#f1f3f9]">{row.symbol}</td>
                        <td className="py-3 px-3 text-[#8b8e9d]">{row.total}</td>
                        <td className="py-3 px-3 text-[#10b981] font-semibold">{row.wins}</td>
                        <td className="py-3 px-3 text-[#ef4444] font-semibold">{row.losses}</td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-[2px] font-bold ${
                              row.winRate >= 60
                                ? 'bg-[#10b981]/10 text-[#10b981]'
                                : row.winRate >= 40
                                ? 'bg-amber-400/10 text-amber-400'
                                : 'bg-[#ef4444]/10 text-[#ef4444]'
                            }`}
                          >
                            {row.winRate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => onNavigateToTerminal?.(row.symbol)}
                            className="text-xs text-[#cc9166] hover:underline cursor-pointer flex items-center justify-end gap-1 ml-auto"
                          >
                            <span>Analyze</span>
                            <ArrowUpRight className="w-3 h-3" />
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

        {/* Intelligence Side Panel */}
        <div className="space-y-6">
          {/* Recent Signals List */}
          <div className="bg-[#0d0e12] border border-[#1f222e] rounded-[4px] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1f222e] pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#cc9166]" />
                <h3 className="text-sm font-semibold text-[#f1f3f9] uppercase tracking-wider">
                  Recent AI Signals
                </h3>
              </div>
            </div>

            {isAnalysesLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3 bg-[#161820] border border-[#1f222e] rounded-[2px] flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="h-4 w-24 bg-[#121317] rounded" />
                      <div className="h-3 w-16 bg-[#121317] rounded" />
                    </div>
                    <div className="h-5 w-16 bg-[#121317] rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {analyses.slice(0, 4).map((rec) => {
                  const isBullish = rec.signal === 'BULLISH' || rec.signal === 'SCALP_LONG';
                  return (
                    <div
                      key={rec.id}
                      className="p-3 bg-[#161820] border border-[#1f222e] rounded-[2px] flex items-center justify-between hover:border-[#cc9166]/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#f1f3f9]">
                            {rec.symbol}
                          </span>
                          <span className="text-[10px] text-[#8b8e9d] font-mono">
                            {rec.timeframe}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#8b8e9d] block mt-0.5">
                          {new Date(rec.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-[2px] inline-block ${
                            isBullish ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-[#ef4444]/15 text-[#ef4444]'
                          }`}
                        >
                          {rec.signal}
                        </span>
                        <span className="text-[10px] text-[#8b8e9d] block font-mono mt-0.5">
                          {rec.confidence}% Conf.
                        </span>
                      </div>
                    </div>
                  );
                })}

                {analyses.length === 0 && (
                  <p className="text-xs text-[#8b8e9d] text-center py-4 font-sans">
                    No signals generated yet.
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
