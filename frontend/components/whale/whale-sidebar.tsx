'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WhaleTransaction } from '@/lib/whale/types';
import { getWhaleHistory, addWhaleHistory } from '@/lib/whale/whale-history-store';
import { POLL_INTERVAL } from '@/lib/whale/config';
import { formatUsd } from '@/lib/whale/whale-service';
import { WhaleCard } from './whale-card';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  X,
} from 'lucide-react';

/* ───────────────────────────────────────────────
   Whale Sidebar — right pane for history & live feed
   ─────────────────────────────────────────────── */

interface WhaleSidebarProps {
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
  mode?: 'sidebar' | 'inline';
}

export function WhaleSidebar({ open, onClose, onCountChange, mode = 'sidebar' }: WhaleSidebarProps) {
  const [transactions, setTransactions] = useState<WhaleTransaction[]>([]);
  const [liveFeed, setLiveFeed] = useState<WhaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTodayUsd, setTotalTodayUsd] = useState(0);
  const [countToday, setCountToday] = useState(0);
  const [maximized, setMaximized] = useState(false);
  // Refs for values used inside the poll closure — avoids stale closures & re-created callbacks
  const liveFeedRef = useRef<WhaleTransaction[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  // Keep latest onCountChange in a ref so poll stays stable while still calling the freshest callback
  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  /* ── Load history from storage ── */
  const loadHistory = useCallback(() => {
    try {
      const history = getWhaleHistory();
      setTransactions(history);
    } catch {
      // ignore
    }
  }, []);

  /* ── Save a new tx to history ── */
  const saveToHistory = useCallback((tx: WhaleTransaction) => {
    setTransactions((prev) => {
      if (prev.some((h) => h.id === tx.id)) return prev;
      const updated = [tx, ...prev].slice(0, 200);
      addWhaleHistory(tx);
      return updated;
    });
  }, []);

  /* ── Play a short alert beep (reuses a single AudioContext) ── */
  const playAlertSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // silent — AudioContext may be blocked by the browser
    }
  }, []);

  /* ── Poll whale alerts ── */
  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/whale');
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (!Array.isArray(data.transactions)) return;

      const fresh = data.transactions as WhaleTransaction[];

      // Check for new critical/high transactions (using ref to avoid stale closure)
      for (const tx of fresh) {
        if ((tx.severity === 'high' || tx.severity === 'critical') && !liveFeedRef.current.some((l) => l.id === tx.id)) {
          playAlertSound();
        }
      }

      setLiveFeed((prev) => {
        const merged = [...fresh];
        for (const p of prev) {
          if (!merged.some((m) => m.id === p.id)) merged.push(p);
        }
        const sorted = merged.sort((a, b) => b.valueUsd - a.valueUsd).slice(0, 50);
        liveFeedRef.current = sorted; // keep ref in sync for the poll closure
        return sorted;
      });

      setTotalTodayUsd(data.totalUsd || 0);
      setCountToday(data.count || 0);
      onCountChangeRef.current?.(data.count || 0);
      setError(null);

      // Also update history with any new ones
      for (const tx of fresh) {
        saveToHistory(tx);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection error');
    } finally {
      setIsLoading(false);
    }
  }, [saveToHistory, playAlertSound]);

  /* ── Start polling ── */
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;

    const startPoll = () => {
      poll().finally(() => {
        if (mounted) timer = setTimeout(startPoll, POLL_INTERVAL);
      });
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startPoll();

    return () => {
      mounted = false;
      clearTimeout(timer);
      // Close the shared AudioContext to free browser audio resources
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Manual refresh ── */
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    poll();
  }, [poll]);

  /* ── Today's count per severity (memoized — only recomputed when liveFeed changes) ── */
  const severityCounts = useMemo(() => ({
    low: liveFeed.filter((t) => t.severity === 'low').length,
    medium: liveFeed.filter((t) => t.severity === 'medium').length,
    high: liveFeed.filter((t) => t.severity === 'high').length,
    critical: liveFeed.filter((t) => t.severity === 'critical').length,
  }), [liveFeed]);

  if (!open) return null;

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        onClick={onClose}
      />

      <aside
        className={`${mode === 'inline'
          ? 'relative w-[360px] shrink-0 border-l border-[#1c1d22] bg-[#08080a] flex flex-col self-stretch'
          : `fixed md:sticky top-0 right-0 h-full z-50 md:z-auto bg-[#08080a] border-l border-[#1c1d22] transition-all duration-300 flex flex-col ${
              maximized ? 'w-[480px]' : 'w-[380px]'
            }`
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c1d22]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#cc9166]/10 border border-[#cc9166]/20">
              <Activity className="w-3.5 h-3.5 text-[#cc9166]" />
              <span className="absolute inset-0 rounded-full animate-ping bg-[#cc9166]/10 opacity-75" />
            </span>
            <div>
              <h3 className="text-[12px] font-mono font-bold uppercase tracking-[0.1em] text-[#e2e3e9]">
                Whale Alert
              </h3>
              <p className="text-[9px] font-mono text-[#5e616e]">
                {countToday > 0
                  ? `${countToday} moves · ${formatUsd(totalTodayUsd)} today`
                  : 'Monitoring blockchain'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMaximized(!maximized)}
              className="p-1.5 rounded-[2px] text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#1c1d22] transition-all cursor-pointer"
              title={maximized ? 'Minimize' : 'Maximize'}
            >
              {maximized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-[2px] text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#1c1d22] transition-all disabled:opacity-30 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[2px] text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#1c1d22] transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Severity stats row ── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1c1d22]/50 bg-[#040406]">
          <StatBadge label="Critical" count={severityCounts.critical} color="text-red-400" />
          <StatBadge label="High" count={severityCounts.high} color="text-rose-400" />
          <StatBadge label="Medium" count={severityCounts.medium} color="text-amber-400" />
          <StatBadge label="Low" count={severityCounts.low} color="text-[#777a88]" />
        </div>

        {/* ── Loading ── */}
        {isLoading && transactions.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="animate-spin w-6 h-6 border-2 border-[#cc9166] border-t-transparent rounded-full mx-auto" />
              <p className="text-[11px] font-mono text-[#5e616e]">Scanning blockchain...</p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && transactions.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-2">
              <span className="text-3xl block">🐋</span>
              <p className="text-[11px] font-mono text-[#777a88]">
                Waiting for first transaction...
              </p>
              <p className="text-[10px] font-mono text-[#5e616e]">
                Using public RPC fallback
              </p>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && !error && transactions.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-2">
              <span className="text-3xl block">🐋</span>
              <p className="text-[11px] font-mono text-[#777a88]">
                No large transactions detected
              </p>
              <p className="text-[10px] font-mono text-[#5e616e]">
                Polling every 30s...
              </p>
            </div>
          </div>
        )}

        {/* ── Transaction list ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#1c1d22]/50">
          {/* Live feed section header */}
          {liveFeed.length > 0 && (
            <div className="px-4 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-[#5e616e] bg-[#040406] sticky top-0 z-10">
              Live Feed · {liveFeed.length} transactions
            </div>
          )}

          {liveFeed.length === 0 && transactions.length > 0 && (
            <div className="px-4 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-[#5e616e] bg-[#040406] sticky top-0 z-10">
              History · {transactions.length} saved
            </div>
          )}

          {/* Combined feed: show live + history without duplicates */}
          {renderTransactions(getCombinedFeed(liveFeed, transactions))}

          {/* Bottom padding */}
          <div className="h-4" />
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-2.5 border-t border-[#1c1d22] bg-[#040406]">
          <a
            href="https://etherscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-[#5e616e] hover:text-[#cc9166] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View on Etherscan
          </a>
        </div>
      </aside>
    </>
  );
}

/* ───────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────── */

function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-mono uppercase tracking-wider text-[#5e616e]">{label}</span>
      <span className={`text-[11px] font-mono font-bold ${color}`}>{count}</span>
    </div>
  );
}

function getCombinedFeed(
  live: WhaleTransaction[],
  history: WhaleTransaction[],
): WhaleTransaction[] {
  const seen = new Set<string>();
  const combined: WhaleTransaction[] = [];
  for (const tx of [...live, ...history]) {
    if (!seen.has(tx.id)) {
      seen.add(tx.id);
      combined.push(tx);
    }
  }
  return combined.slice(0, 200);
}

function renderTransactions(txs: WhaleTransaction[]) {
  return txs.map((tx) => (
    <WhaleCard key={tx.id} tx={tx} />
  ));
}
