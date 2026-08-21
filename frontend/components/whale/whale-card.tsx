'use client';

import React from 'react';
import { WhaleTransaction } from '@/lib/whale/types';
import { formatUsd } from '@/lib/whale/whale-service';
import { ArrowDownRight, ArrowUpRight, ExternalLink, ArrowLeftRight } from 'lucide-react';

/* ───────────────────────────────────────────────
   Severity colours
   ─────────────────────────────────────────────── */

const SEVERITY_CLASS: Record<string, string> = {
  low: 'border-l-amber-500/40 bg-amber-950/10',
  medium: 'border-l-amber-500/70 bg-amber-950/20',
  high: 'border-l-rose-500/70 bg-rose-950/20',
  critical: 'border-l-red-500 bg-red-950/30',
};

const SEVERITY_GLOW: Record<string, string> = {
  low: 'shadow-amber-900/5',
  medium: 'shadow-amber-900/10',
  high: 'shadow-rose-900/15',
  critical: 'shadow-red-900/25',
};

const DIRECTION_ICON: Record<string, React.ReactNode> = {
  exchange_outflow: <ArrowUpRight className="w-3 h-3 text-rose-400" />,
  exchange_inflow: <ArrowDownRight className="w-3 h-3 text-emerald-400" />,
  unknown: <ArrowLeftRight className="w-3 h-3 text-[#5e616e]" />,
};

const DIRECTION_LABEL: Record<string, string> = {
  exchange_outflow: 'Exchange → Wallet',
  exchange_inflow: 'Wallet → Exchange',
  unknown: 'Wallet → Wallet',
};

/* ───────────────────────────────────────────────
   Component
   ─────────────────────────────────────────────── */

interface WhaleCardProps {
  tx: WhaleTransaction;
  compact?: boolean;
}

export function WhaleCard({ tx, compact = false }: WhaleCardProps) {
  const explorerUrl =
    tx.chain === 'ethereum'
      ? `https://etherscan.io/tx/${tx.hash}`
      : `https://bscscan.com/tx/${tx.hash}`;

  const severityClass = SEVERITY_CLASS[tx.severity] || SEVERITY_CLASS.low;
  const glowClass = SEVERITY_GLOW[tx.severity] || SEVERITY_GLOW.low;

  if (compact) {
    return (
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex items-center gap-3 px-3 py-2.5 border-l-2 ${severityClass} border border-[#1c1d22] border-l-[#cc9166]/30 bg-[#040406] hover:bg-[#0c0c10] transition-all duration-200 cursor-pointer ${glowClass}`}
      >
        <span className="shrink-0 text-lg leading-none">
          {tx.direction === 'exchange_outflow' ? '🔴' : tx.direction === 'exchange_inflow' ? '🟢' : '🐋'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-[#e2e3e9]">
              {formatUsd(tx.valueUsd)}
            </span>
            <span className="text-[10px] font-mono text-[#777a88]">
              {tx.value} {tx.token}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono text-[#5e616e] truncate">
              {tx.fromLabel} → {tx.toLabel}
            </span>
          </div>
        </div>
      </a>
    );
  }

  return (
    <div
      className={`border-l-2 ${severityClass} border border-[#1c1d22] bg-[#040406] hover:bg-[#0c0c10] transition-all duration-200 ${glowClass}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c1d22]/50">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">
            {tx.direction === 'exchange_outflow' ? '🔴' : tx.direction === 'exchange_inflow' ? '🟢' : '🐋'}
          </span>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#cc9166]">
            {tx.chain === 'ethereum' ? 'ETH' : 'BNB'}
          </span>
          <span className="text-[9px] font-mono text-[#5e616e] uppercase px-1.5 py-0.5 border border-[#1c1d22] bg-[#08080a]">
            {tx.severity}
          </span>
        </div>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5e616e] hover:text-[#cc9166] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Amount */}
      <div className="px-4 py-3 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-mono font-bold text-[#e2e3e9] tracking-tight">
            {formatUsd(tx.valueUsd)}
          </span>
          <span className="text-[13px] font-mono text-[#9194a1]">
            {tx.value} {tx.token}
          </span>
        </div>

        {/* Direction */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          {DIRECTION_ICON[tx.direction]}
          <span className="text-[#777a88]">{DIRECTION_LABEL[tx.direction]}</span>
        </div>

        {/* From → To */}
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] font-mono pt-1">
          <span className="text-[#5e616e]">From</span>
          <span className="text-[#9194a1] truncate" title={tx.from}>{tx.fromLabel}</span>
          <span className="text-[#5e616e]">To</span>
          <span className="text-[#9194a1] truncate" title={tx.to}>{tx.toLabel}</span>
        </div>

        {/* Time */}
        <div className="text-[10px] font-mono text-[#5e616e] pt-0.5">
          {timeAgo(tx.timestamp)}
        </div>
      </div>
    </div>
  );
}

function timeAgo(unixSeconds: number): string {
  const seconds = Math.floor(Date.now() / 1000) - unixSeconds;
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
