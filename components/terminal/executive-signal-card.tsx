'use client';

import React from 'react';
import { StructuredLLMOutput } from '@/types/terminal';
import {
  ShieldAlert,
  Clock,
  Zap,
  Target,
  Layers,
  PauseCircle,
  TrendingUp,
  TrendingDown,
  Eye,
} from 'lucide-react';

interface ExecutiveSignalCardProps {
  data?: StructuredLLMOutput | null;
  isLoading?: boolean;
}

export const ExecutiveSignalCard: React.FC<ExecutiveSignalCardProps> = ({ data, isLoading }) => {
  if (isLoading || !data) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-6 text-[#e2e3e9] animate-pulse space-y-4">
        <div className="h-5 w-36 bg-[#121317] rounded-none" />
        <div className="h-20 bg-[#121317] rounded-none" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 bg-[#121317] rounded-none" />
          <div className="h-14 bg-[#121317] rounded-none" />
        </div>
      </div>
    );
  }

  const isBuy     = data.signal === 'BUY';
  const isSell    = data.signal === 'SELL';
  const isNeutral = data.signal === 'HOLD' || data.signal === 'NEUTRAL';
  const isHold    = data.signal === 'HOLD';

  // ─── Position colour palette ───────────────────────────────────────────────
  // Signal badge
  const signalBadgeStyle = isBuy
    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
    : isSell
    ? 'bg-rose-950/80 text-rose-400 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
    : 'bg-amber-950/60 text-amber-300 border-amber-600/70';

  // Signal icon
  const SignalIcon = isBuy ? TrendingUp : isSell ? TrendingDown : PauseCircle;

  // Delta — shown only for directional signals
  const showDelta = !isNeutral;

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-6 text-[#e2e3e9] space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
        <span className="eyebrow-copper">AI SIGNAL BEACON</span>
        <span className="text-xs text-[#9194a1] font-sans">
          Confidence: <strong className="text-[#ffffff] font-medium">{data.confidence}%</strong>
        </span>
      </div>

      {/* Main Signal Display */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#121317] border border-[#1c1d22] p-5 rounded-none">
        {/* Signal pill */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5 w-full sm:w-auto">
          <span className="eyebrow-fog text-[10px]">SIGNAL DIRECTION</span>
          <div className="flex items-center justify-center w-full sm:w-auto">
            <span
              className={`px-8 py-2.5 rounded-none font-sans font-bold text-lg tracking-wider min-w-[160px] text-center inline-flex items-center justify-center gap-2 border ${signalBadgeStyle}`}
            >
              <SignalIcon className="w-5 h-5 shrink-0" />
              {data.signal}
            </span>
          </div>
        </div>

        {/* Expected Delta — only visible for BUY / SELL */}
        {showDelta ? (
          <div className="text-center sm:text-right shrink-0 font-sans">
            <span className="eyebrow-fog text-[10px] block mb-1">EXPECTED DELTA</span>
            <span
              className={`text-xl md:text-2xl font-bold font-mono ${
                data.expected_move_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {data.expected_move_pct >= 0 ? '+' : ''}
              {data.expected_move_pct}%
            </span>
          </div>
        ) : (
          /* HOLD / NEUTRAL replacement — observation notice */
          <div className="text-center sm:text-right shrink-0 font-sans space-y-0.5">
            <span className="eyebrow-fog text-[10px] block mb-1">STATUS</span>
            <div className="flex items-center gap-2 justify-end">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300 font-mono">
                {isHold ? 'HOLD POSITION' : 'OBSERVE MARKET'}
              </span>
            </div>
            <p className="text-[10px] text-[#5e616e] font-sans max-w-[160px] leading-snug text-right">
              No entry bias. Wait for confirmation.
            </p>
          </div>
        )}
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-[#121317] border border-[#1c1d22] rounded-none p-3.5 space-y-1">
          <span className="eyebrow-fog text-[10px] block">RISK PROFILE</span>
          <div className="flex items-center gap-1.5 font-medium text-[#e2e3e9]">
            <ShieldAlert className="w-4 h-4 text-[#cc9166] shrink-0" />
            <span className="truncate">{data.risk_level} Risk</span>
          </div>
        </div>

        <div className="bg-[#121317] border border-[#1c1d22] rounded-none p-3.5 space-y-1">
          <span className="eyebrow-fog text-[10px] block">MARKET PHASE</span>
          <div className="flex items-center gap-1.5 font-medium text-[#e2e3e9]">
            <Zap className="w-4 h-4 text-[#cc9166] shrink-0" />
            <span className="truncate">{data.market_phase}</span>
          </div>
        </div>

        <div className="bg-[#121317] border border-[#1c1d22] rounded-none p-3.5 space-y-1">
          <span className="eyebrow-fog text-[10px] block">HOLDING HORIZON</span>
          <div className="flex items-center gap-1.5 font-medium text-[#e2e3e9]">
            <Clock className="w-4 h-4 text-[#9194a1] shrink-0" />
            <span className="truncate">{data.holding_period}</span>
          </div>
        </div>

        <div className="bg-[#121317] border border-[#1c1d22] rounded-none p-3.5 space-y-1">
          <span className="eyebrow-fog text-[10px] block">BULL / BEAR RATIO</span>
          <div className="flex items-center gap-2 font-mono font-bold text-xs">
            <span className="text-emerald-400">{data.probabilities?.bullish ?? 50}%</span>
            <span className="text-[#5e616e]">/</span>
            <span className="text-rose-400">{data.probabilities?.bearish ?? 50}%</span>
          </div>
        </div>
      </div>

      {/* AI Decision Badges */}
      <div className="bg-[#121317] border border-[#1c1d22] rounded-none p-3.5 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#cc9166]">
          <Layers className="w-3.5 h-3.5 text-[#cc9166]" />
          <span>AI DECISION BADGES • 3 FACTORS CONFLUENCE</span>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-mono">
          <span
            className={`px-2.5 py-1 bg-[#08080a] rounded-none font-semibold border ${
              isNeutral
                ? 'border-amber-600/40 text-amber-400'
                : 'border-emerald-500/40 text-emerald-400'
            }`}
          >
            {isNeutral ? '⏸ Multi-TF Indecision' : `✓ Multi-Timeframe Alignment (${data.confidence}%)`}
          </span>
          <span className="px-2.5 py-1 bg-[#08080a] border border-[#1c1d22] text-[#e2e3e9] rounded-none">
            ⚡ CVD Volume Divergence
          </span>
          <span className="px-2.5 py-1 bg-[#08080a] border border-[#1c1d22] text-[#cc9166] rounded-none">
            {isNeutral ? '🔭 Structural Observation' : '🎯 Risk-Reward Optimized'}
          </span>
        </div>
      </div>

      {/* Recommendation Callout */}
      <div
        className={`rounded-none p-4 text-xs text-[#e2e3e9] space-y-1.5 border ${
          isNeutral
            ? 'bg-amber-950/10 border-amber-700/40'
            : 'bg-[#121317] border-[#cc9166]/40'
        }`}
      >
        <div className="flex items-center gap-2 font-ivy-presto text-base text-[#cc9166]">
          <Target className="w-4 h-4 text-[#cc9166] shrink-0" />
          <span>AI Action Recommendation</span>
        </div>
        <p className="text-xs text-[#9194a1] leading-relaxed font-sans">
          {data.recommendation}
        </p>
      </div>
    </div>
  );
};
