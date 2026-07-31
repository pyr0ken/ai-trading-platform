'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WhaleTransaction } from '@/lib/whale/types';
import { formatUsd } from '@/lib/whale/whale-service';
import { ExternalLink, X } from 'lucide-react';

/* ───────────────────────────────────────────────
   Whale Popup — bottom-left toast for big movements
   Only shows for high / critical severity
   ─────────────────────────────────────────────── */

interface WhalePopupItem {
  tx: WhaleTransaction;
  id: number;
}

let popupId = 0;
let popupListener: ((tx: WhaleTransaction) => void) | null = null;

/** Call from anywhere to show a whale popup */
export function showWhalePopup(tx: WhaleTransaction) {
  popupListener?.(tx);
}

export function WhalePopupContainer() {
  const [items, setItems] = useState<WhalePopupItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  // Bounded dedup set — prevents unbounded growth in long sessions
  const maxDisplayed = useRef<Set<string>>(new Set());
  const MAX_DEDUP_ENTRIES = 200;

  const markDisplayed = useCallback((txId: string) => {
    const set = maxDisplayed.current;
    if (set.size >= MAX_DEDUP_ENTRIES) {
      // Evict oldest entries (Set preserves insertion order)
      const toRemove = Array.from(set).slice(0, Math.floor(MAX_DEDUP_ENTRIES / 2));
      for (const key of toRemove) set.delete(key);
    }
    set.add(txId);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    popupListener = (tx: WhaleTransaction) => {
      // Only show high/critical in popup
      if (tx.severity !== 'high' && tx.severity !== 'critical') return;
      // Dedup by id (bounded set)
      if (maxDisplayed.current.has(tx.id)) return;
      markDisplayed(tx.id);

      const id = ++popupId;
      setItems((prev) => [{
        tx,
        id,
      }, ...prev].slice(0, 5)); // max 5 visible

      // Auto-dismiss after 8 seconds (longer for critical)
      const duration = tx.severity === 'critical' ? 12000 : 8000;
      const timer = setTimeout(() => {
        dismiss(id);
        timersRef.current.delete(id);
      }, duration);
      timersRef.current.set(id, timer);
    };

    return () => {
      popupListener = null;
      // Clear all timers — copy ref to a local var first (cleanup closure safety)
      const timers = timersRef.current;
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, [dismiss, markDisplayed]);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[99999] flex flex-col-reverse gap-2 pointer-events-none w-[380px] max-w-[calc(100vw-2rem)]">
      {items.map((item) => {
        const isCritical = item.tx.severity === 'critical';
        return (
          <div
            key={item.id}
            className={`pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300
              border-l-4 ${
                isCritical
                  ? 'border-l-red-500 bg-gradient-to-r from-red-950/90 to-[#0a0a0d]'
                  : 'border-l-rose-500 bg-gradient-to-r from-rose-950/80 to-[#0a0a0d]'
              } border border-[#1c1d22] shadow-2xl ${
              isCritical ? 'shadow-red-900/30' : 'shadow-rose-900/15'
            }`}
          >
            <div className="relative px-4 py-3.5">
              {/* Animated pulse ring for critical */}
              {isCritical && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent animate-pulse" />
                </div>
              )}

              <div className="relative flex items-start gap-3">
                {/* Icon */}
                <div className="shrink-0 mt-0.5">
                  <span
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full ${
                      isCritical
                        ? 'bg-red-500/20 border border-red-500/30'
                        : 'bg-rose-500/20 border border-rose-500/30'
                    }`}
                  >
                    <span className="text-lg leading-none">
                      {item.tx.direction === 'exchange_outflow' ? '🔴' : '🟢'}
                    </span>
                    {isCritical && (
                      <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20 opacity-75" />
                    )}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-[0.12em] ${
                        isCritical ? 'text-red-400' : 'text-rose-400'
                      }`}
                    >
                      🐋 {isCritical ? 'Critical Whale' : 'Whale Alert'}
                    </span>
                    <span className="text-[9px] font-mono text-[#5e616e]">
                      {timeSince(item.tx.timestamp)}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[18px] font-mono font-bold text-[#e2e3e9] tracking-tight">
                      {formatUsd(item.tx.valueUsd)}
                    </span>
                    <span className="text-[12px] font-mono text-[#9194a1]">
                      {item.tx.value} {item.tx.token}
                    </span>
                  </div>

                  {/* Movement type */}
                  <div className="text-[10px] font-mono text-[#777a88]">
                    {item.tx.direction === 'exchange_outflow'
                      ? `Leaving ${item.tx.fromLabel} → ${item.tx.toLabel}`
                      : item.tx.direction === 'exchange_inflow'
                        ? `${item.tx.fromLabel} → ${item.tx.toLabel}`
                        : `${item.tx.fromLabel} → ${item.tx.toLabel}`}
                  </div>

                  {/* Link */}
                  <a
                    href={`https://${item.tx.chain === 'ethereum' ? 'etherscan.io' : 'bscscan.com'}/tx/${item.tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 text-[10px] font-mono mt-0.5 ${
                      isCritical
                        ? 'text-red-400/70 hover:text-red-300'
                        : 'text-rose-400/70 hover:text-rose-300'
                    } transition-colors`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on {item.tx.chain === 'ethereum' ? 'Etherscan' : 'BscScan'}
                  </a>
                </div>

                {/* Dismiss */}
                <button
                  onClick={() => dismiss(item.id)}
                  className="shrink-0 p-1 rounded-[2px] text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#1c1d22] transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function timeSince(unixSeconds: number): string {
  const seconds = Math.floor(Date.now() / 1000) - unixSeconds;
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
