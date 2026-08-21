'use client';

import React from 'react';
import { ReasoningBadge } from '@/types/terminal';
import { CheckCircle2, XCircle, AlertCircle, Cpu, RotateCw, Sparkles } from 'lucide-react';

interface AIReasoningBadgesProps {
  badges?: ReasoningBadge[];
  isLoading?: boolean;
}

export const AIReasoningBadges: React.FC<AIReasoningBadgesProps> = ({ badges, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] flex flex-col items-center justify-center min-h-[120px] space-y-2">
        <RotateCw className="w-5 h-5 text-[#cc9166] animate-spin" />
        <span className="text-xs font-mono text-[#9194a1]">Extracting Decision Factors...</span>
      </div>
    );
  }

  if (!badges || badges.length === 0) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-3">
        <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#cc9166]" />
            <span className="eyebrow-copper">AI DECISION BADGES</span>
          </div>
          <span className="text-xs text-[#5e616e] font-mono">Factor Analysis</span>
        </div>
        <div className="p-3 bg-[#121317]/50 border border-[#1c1d22] rounded-[8px] flex items-center justify-between text-xs">
          <span className="text-[#9194a1]">AI decision reasoning badges ready.</span>
          <span className="text-[11px] font-mono text-[#cc9166] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Press &quot;Run AI Quant&quot;
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-4">
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">AI DECISION FACTORS</span>
        </div>
        <span className="text-xs text-[#9194a1] font-mono">{badges.length} Evaluated Factors</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {badges.map((b, idx) => {
          const isBull = b.type === 'bullish';
          const isBear = b.type === 'bearish';

          return (
            <div
              key={idx}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9999px] text-xs font-medium font-sans transition-all ${
                isBull
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                  : isBear
                  ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                  : 'bg-[#121317] border border-[#1c1d22] text-[#e2e3e9]'
              }`}
            >
              {isBull && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              {isBear && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
              {!isBull && !isBear && <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              <span>{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
