'use client';

import React from 'react';
import { StructuredLLMOutput } from '@/types/terminal';
import {
  TrendingUp,
  TrendingDown,
  PauseCircle,
  Eye,
  Sparkles,
  ShieldCheck,
  Target,
  RotateCw,
  Award,
} from 'lucide-react';

interface ExecutiveSignalCardProps {
  data?: StructuredLLMOutput | null;
  isLoading?: boolean;
}

export const ExecutiveSignalCard: React.FC<ExecutiveSignalCardProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[12px] p-6 text-[#e2e3e9] flex flex-col items-center justify-center min-h-[160px] space-y-2">
        <RotateCw className="w-5 h-5 text-[#cc9166] animate-spin" />
        <span className="text-xs font-mono text-[#9194a1]">Synthesizing Executive Signal Beacon...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[12px] p-6 text-[#e2e3e9] space-y-3">
        <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#cc9166]" />
            <span className="eyebrow-copper">EXECUTIVE SIGNAL BEACON</span>
          </div>
          <span className="text-xs text-[#5e616e] font-mono">AI Model Signal</span>
        </div>
        <div className="p-4 bg-[#121317]/50 border border-[#1c1d22] rounded-[8px] flex items-center justify-between text-xs">
          <span className="text-[#9194a1]">Executive AI signal beacon ready for execution.</span>
          <span className="text-[11px] font-mono text-[#cc9166] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Press &quot;Run AI Quant&quot;
          </span>
        </div>
      </div>
    );
  }

  const isBuy = data.signal === 'BUY';
  const isSell = data.signal === 'SELL';
  const isNeutral = data.signal === 'HOLD' || data.signal === 'NEUTRAL';
  const isHold = data.signal === 'HOLD';

  // Badge Styling
  const signalBadgeStyle = isBuy
    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
    : isSell
    ? 'bg-red-950/90 text-red-400 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]'
    : 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]';

  const SignalIcon = isBuy ? TrendingUp : isSell ? TrendingDown : PauseCircle;
  const showDelta = !isNeutral;

  return (
    <div className="bg-[#040406] border border-[#1c1d22] hover:border-[#cc9166]/40 rounded-[12px] p-6 text-[#e2e3e9] space-y-5 shadow-2xl transition-all duration-300 relative overflow-hidden">
      {/* Glow highlight */}
      <div
        className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-10 ${
          isBuy ? 'bg-emerald-500' : isSell ? 'bg-red-500' : 'bg-amber-500'
        }`}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">EXECUTIVE SIGNAL BEACON</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#5e616e]">AI Confidence:</span>
          <span className="font-bold text-[#ffffff] bg-[#121317] border border-[#1c1d22] px-2.5 py-0.5 rounded-[6px]">
            {data.confidence}%
          </span>
        </div>
      </div>

      {/* Main Signal Display */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#121317] border border-[#1c1d22] p-5 rounded-[10px] relative z-10">
        {/* Signal Direction Badge */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5 w-full sm:w-auto">
          <span className="eyebrow-fog text-[10px] uppercase font-mono">SIGNAL DIRECTION</span>
          <div className="flex items-center justify-center w-full sm:w-auto">
            <span
              className={`px-8 py-3 rounded-[8px] font-sans font-bold text-xl tracking-wider min-w-[180px] text-center inline-flex items-center justify-center gap-2.5 border transition-all ${signalBadgeStyle}`}
            >
              <SignalIcon className="w-6 h-6 shrink-0" />
              {data.signal}
            </span>
          </div>
        </div>

        {/* Expected Move / Delta */}
        {showDelta ? (
          <div className="text-center sm:text-right shrink-0 font-sans">
            <span className="eyebrow-fog text-[10px] uppercase font-mono block mb-1">EXPECTED TARGET DELTA</span>
            <span
              className={`text-2xl md:text-3xl font-bold font-mono ${
                data.expected_move_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {data.expected_move_pct >= 0 ? '+' : ''}
              {data.expected_move_pct}%
            </span>
          </div>
        ) : (
          <div className="text-center sm:text-right shrink-0 font-sans space-y-1">
            <span className="eyebrow-fog text-[10px] uppercase font-mono block">RECOMMENDATION</span>
            <div className="flex items-center gap-2 justify-end">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300 font-mono">
                {isHold ? 'HOLD POSITION' : 'OBSERVE MARKET'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Core Recommendation Thesis */}
      {data.recommendation && (
        <div className="bg-[#08080a] border border-[#1c1d22] p-4 rounded-[8px] space-y-1.5 relative z-10 text-xs font-sans">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#cc9166] uppercase font-semibold">
            <Target className="w-3.5 h-3.5" />
            <span>Executive Recommendation</span>
          </div>
          <p className="text-[#e2e3e9] leading-relaxed font-sans">{data.recommendation}</p>
        </div>
      )}
    </div>
  );
};
