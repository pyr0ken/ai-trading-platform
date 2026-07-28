'use client';

import React from 'react';
import { Scenarios } from '@/types/terminal';
import { Compass, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ScenariosCardProps {
  scenarios?: Scenarios | null;
  isLoading?: boolean;
}

export const ScenariosCard: React.FC<ScenariosCardProps> = ({ scenarios, isLoading }) => {
  if (isLoading || !scenarios) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-6 text-[#e2e3e9] animate-pulse space-y-3">
        <div className="h-5 w-40 bg-[#121317] rounded-none" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="h-32 bg-[#121317] rounded-none" />
          <div className="h-32 bg-[#121317] rounded-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-6 text-[#e2e3e9] space-y-4">
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">
            MARKET SCENARIO FORECASTS
          </span>
        </div>
        <span className="text-xs text-[#9194a1] font-mono">Probabilistic Outcomes</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
        {/* Bull Scenario - ZERO BORDER RADIUS & GREEN */}
        {scenarios.bullish && (
          <div className="bg-[#121317] border border-emerald-500/50 rounded-none p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-[#1c1d22] pb-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ArrowUpRight className="w-4 h-4" />
                <span>BULL SCENARIO</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-none bg-[#08080a] text-emerald-400 font-mono text-xs border border-emerald-500 font-bold">
                {scenarios.bullish.probability}% Prob
              </span>
            </div>
            <p className="text-xs text-[#9194a1] leading-relaxed">
              <strong className="text-[#e2e3e9]">Trigger:</strong> {scenarios.bullish.conditions}
            </p>
            <div className="flex justify-between pt-1 border-t border-[#1c1d22] text-[11px]">
              <span className="text-[#5e616e]">Target:</span>
              <span className="font-mono font-bold text-emerald-400">
                ${scenarios.bullish.target?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#5e616e]">Invalidation:</span>
              <span className="font-mono text-rose-400">
                ${scenarios.bullish.invalidation?.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Bear Scenario - ZERO BORDER RADIUS & RED */}
        {scenarios.bearish && (
          <div className="bg-[#121317] border border-rose-900/60 rounded-none p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-[#1c1d22] pb-2">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <ArrowDownRight className="w-4 h-4" />
                <span>BEAR SCENARIO</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-none bg-[#08080a] text-rose-400 font-mono text-xs border border-rose-900/50 font-bold">
                {scenarios.bearish.probability}% Prob
              </span>
            </div>
            <p className="text-xs text-[#9194a1] leading-relaxed">
              <strong className="text-[#e2e3e9]">Trigger:</strong> {scenarios.bearish.conditions}
            </p>
            <div className="flex justify-between pt-1 border-t border-[#1c1d22] text-[11px]">
              <span className="text-[#5e616e]">Target:</span>
              <span className="font-mono font-bold text-rose-400">
                ${scenarios.bearish.target?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#5e616e]">Invalidation:</span>
              <span className="font-mono text-emerald-400">
                ${scenarios.bearish.invalidation?.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

