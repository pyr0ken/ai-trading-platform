'use client';

import React from 'react';
import { StructuredLLMOutput } from '@/types/terminal';
import { ShieldAlert, Clock, Zap, Target } from 'lucide-react';

interface ExecutiveSignalCardProps {
  data?: StructuredLLMOutput | null;
  isLoading?: boolean;
}

export const ExecutiveSignalCard: React.FC<ExecutiveSignalCardProps> = ({ data, isLoading }) => {
  if (isLoading || !data) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] animate-pulse space-y-4">
        <div className="h-5 w-36 bg-[#121317] rounded-[9999px]" />
        <div className="h-20 bg-[#121317] rounded-[9999px]" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 bg-[#121317] rounded-[9999px]" />
          <div className="h-14 bg-[#121317] rounded-[9999px]" />
        </div>
      </div>
    );
  }

  const isBuy = data.signal === 'BUY';
  const isSell = data.signal === 'SELL';

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-5">
      {/* Category Eyebrow */}
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
        <span className="eyebrow-copper">
          AI SIGNAL BEACON
        </span>
        <span className="text-xs text-[#9194a1] font-sans">
          Confidence: <strong className="text-[#ffffff] font-medium">{data.confidence}%</strong>
        </span>
      </div>

      {/* Main Signal Display */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#121317] border border-[#1c1d22] p-5 rounded-[9999px]">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5 w-full sm:w-auto">
          <span className="eyebrow-fog text-[10px]">
            SIGNAL DIRECTION
          </span>
          <div className="flex items-center justify-center w-full sm:w-auto">
            <span
              className={`px-8 py-2.5 rounded-[9999px] font-sans font-medium text-lg tracking-wider min-w-[140px] text-center inline-flex items-center justify-center border ${
                isBuy
                  ? 'bg-[#ffffff] text-[#08080a] border-[#ffffff] font-semibold'
                  : isSell
                  ? 'bg-[#1c1d22] text-rose-400 border-rose-900/50 font-semibold'
                  : 'bg-[#08080a] text-[#e2e3e9] border-[#1c1d22] font-semibold'
              }`}
            >
              {data.signal}
            </span>
          </div>
        </div>

        <div className="text-center sm:text-right shrink-0 font-sans">
          <span className="eyebrow-fog text-[10px] block mb-1">Expected Delta</span>
          <span
            className={`text-xl md:text-2xl font-semibold ${
              data.expected_move_pct >= 0 ? 'text-[#cc9166]' : 'text-rose-400'
            }`}
          >
            {data.expected_move_pct >= 0 ? '+' : ''}
            {data.expected_move_pct}%
          </span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-[#121317] border border-[#1c1d22] rounded-[9999px] p-3.5 space-y-1">
          <span className="eyebrow-fog text-[10px] block">RISK PROFILE</span>
          <div className="flex items-center gap-1.5 font-medium text-[#e2e3e9]">
            <ShieldAlert className="w-4 h-4 text-[#cc9166] shrink-0" />
            <span className="truncate">{data.risk_level} Risk</span>
          </div>
        </div>

        <div className="bg-[#121317] border border-[#1c1d22] rounded-[9999px] p-3.5 space-y-1">
          <span className="eyebrow-fog text-[10px] block">MARKET PHASE</span>
          <div className="flex items-center gap-1.5 font-medium text-[#e2e3e9]">
            <Zap className="w-4 h-4 text-[#cc9166] shrink-0" />
            <span className="truncate">{data.market_phase}</span>
          </div>
        </div>

        <div className="bg-[#121317] border border-[#1c1d22] rounded-[9999px] p-3.5 space-y-1">
          <span className="eyebrow-fog text-[10px] block">HOLDING HORIZON</span>
          <div className="flex items-center gap-1.5 font-medium text-[#e2e3e9]">
            <Clock className="w-4 h-4 text-[#9194a1] shrink-0" />
            <span className="truncate">{data.holding_period}</span>
          </div>
        </div>

        <div className="bg-[#121317] border border-[#1c1d22] rounded-[9999px] p-3.5 space-y-1">
          <span className="eyebrow-fog text-[10px] block">BULL / BEAR RATIO</span>
          <div className="flex items-center gap-2 font-mono font-medium text-xs">
            <span className="text-[#cc9166]">{data.probabilities?.bullish ?? 50}%</span>
            <span className="text-[#5e616e]">/</span>
            <span className="text-rose-400">{data.probabilities?.bearish ?? 50}%</span>
          </div>
        </div>
      </div>

      {/* Recommendation Callout */}
      <div className="bg-[#121317] border border-[#cc9166]/40 rounded-[10px] p-4 text-xs text-[#e2e3e9] space-y-1.5">
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



