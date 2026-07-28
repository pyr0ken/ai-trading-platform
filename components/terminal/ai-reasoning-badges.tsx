'use client';

import React from 'react';
import { ReasoningBadge } from '@/types/terminal';
import { CheckCircle2, XCircle, AlertCircle, Cpu } from 'lucide-react';

interface AIReasoningBadgesProps {
  badges?: ReasoningBadge[];
  isLoading?: boolean;
}

export const AIReasoningBadges: React.FC<AIReasoningBadgesProps> = ({ badges, isLoading }) => {
  if (isLoading || !badges) {
    return (
      <div className="bg-[#18181b] border border-[#27272a] rounded-[24px] p-6 text-[#f5f5f4] animate-pulse space-y-3">
        <div className="h-4 w-32 bg-[#27272a] rounded-full" />
        <div className="flex flex-wrap gap-2">
          <div className="h-8 w-28 bg-[#121214] rounded-full" />
          <div className="h-8 w-36 bg-[#121214] rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-[24px] p-6 text-[#f5f5f4] shadow-steep-artifact space-y-4">
      <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#fbe1d1]" />
          <span className="text-xs text-[#71717a] font-normal tracking-wide uppercase">
            AI DECISION BADGES
          </span>
        </div>
        <span className="text-xs text-[#a1a1aa] font-mono">{badges.length} Factors</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {badges.map((b, idx) => {
          const isBull = b.type === 'bullish';
          const isBear = b.type === 'bearish';

          return (
            <div
              key={idx}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-normal transition-all ${
                isBull
                  ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                  : isBear
                  ? 'bg-rose-950/70 border border-rose-800 text-rose-300'
                  : 'bg-[#27272a] border border-[#3f3f46] text-[#f5f5f4]'
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
