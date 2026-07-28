'use client';

import React from 'react';
import { TradeSetup } from '@/types/terminal';
import { Target, ArrowUpRight, ArrowDownRight, ShieldCheck, Gauge } from 'lucide-react';

interface TradeSetupCardProps {
  setup?: TradeSetup | null;
  isLoading?: boolean;
}

export const TradeSetupCard: React.FC<TradeSetupCardProps> = ({ setup, isLoading }) => {
  if (isLoading || !setup) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-6 text-[#e2e3e9] animate-pulse space-y-4">
        <div className="h-5 w-44 bg-[#121317] rounded-none" />
        <div className="h-28 bg-[#121317] rounded-none" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-16 bg-[#121317] rounded-none" />
          <div className="h-16 bg-[#121317] rounded-none" />
          <div className="h-16 bg-[#121317] rounded-none" />
        </div>
      </div>
    );
  }

  const isLong = setup.position === 'LONG';

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-6 text-[#e2e3e9] space-y-5">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">
            QUANTITATIVE TRADE SETUP
          </span>
        </div>
        <span className="text-xs text-[#9194a1] font-sans bg-[#121317] border border-[#1c1d22] px-3 py-1 rounded-none">
          {setup.strategy_name || 'Multi-Factor Strategy'}
        </span>
      </div>

      {/* Position & Entry Range Box - ZERO BORDER RADIUS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#121317] border border-[#1c1d22] p-4 rounded-none">
        {/* Position Direction Pill */}
        <div className="md:col-span-5 flex flex-col justify-center border-b md:border-b-0 md:border-r border-[#1c1d22] pb-3 md:pb-0 md:pr-4">
          <span className="eyebrow-fog text-[10px] block mb-1">
            POSITION DIRECTION
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 text-base font-bold px-4 py-1 rounded-none font-sans ${
                isLong
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500'
                  : 'bg-rose-950/80 text-rose-400 border border-rose-500'
              }`}
            >
              {isLong ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
              {setup.position}
            </span>
            <span className="text-xs text-[#9194a1] font-sans">
              Lev: <strong className="text-[#e2e3e9]">{setup.recommended_leverage}</strong>
            </span>
          </div>
        </div>

        {/* Entry Range */}
        <div className="md:col-span-7 flex flex-col justify-center">
          <span className="eyebrow-fog text-[10px] block mb-1">
            OPTIMAL ENTRY RANGE
          </span>
          <div className="text-lg md:text-xl font-bold font-mono text-[#ffffff]">
            ${setup.entry_range?.[0] ?? 0} <span className="text-[#5e616e]">-</span> ${setup.entry_range?.[1] ?? 0}
          </div>
        </div>
      </div>

      {/* Take Profit & Stop Loss Grid - ZERO BORDER RADIUS & GREEN/RED COLORS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-[#121317] border border-rose-900/50 rounded-none p-3 space-y-1">
          <span className="eyebrow-fog text-[10px] block uppercase text-rose-400">STOP LOSS (SL)</span>
          <span className="text-rose-400 font-bold text-sm block">
            ${setup.stop_loss}
          </span>
        </div>

        <div className="bg-[#121317] border border-emerald-900/50 rounded-none p-3 space-y-1">
          <span className="eyebrow-fog text-[10px] block uppercase text-emerald-400">TAKE PROFIT 1</span>
          <span className="text-emerald-400 font-bold text-sm block">
            ${setup.take_profit_1}
          </span>
        </div>

        <div className="bg-[#121317] border border-emerald-900/50 rounded-none p-3 space-y-1">
          <span className="eyebrow-fog text-[10px] block uppercase text-emerald-400">TAKE PROFIT 2</span>
          <span className="text-emerald-400 font-bold text-sm block">
            ${setup.take_profit_2}
          </span>
        </div>

        <div className="bg-[#121317] border border-emerald-900/50 rounded-none p-3 space-y-1">
          <span className="eyebrow-fog text-[10px] block uppercase text-emerald-400">TAKE PROFIT 3</span>
          <span className="text-emerald-400 font-bold text-sm block">
            ${setup.take_profit_3}
          </span>
        </div>
      </div>

      {/* R:R Ratio & Invalidation Point Footer - ZERO BORDER RADIUS */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-[#121317] border border-[#1c1d22] px-4 py-2.5 rounded-none">
        <div className="flex items-center gap-1.5 text-[#9194a1]">
          <Gauge className="w-4 h-4 text-[#cc9166]" />
          <span>Risk-to-Reward: <strong className="text-emerald-400 font-bold">{setup.risk_reward_ratio} R</strong></span>
        </div>

        <div className="flex items-center gap-1.5 text-[#9194a1]">
          <ShieldCheck className="w-4 h-4 text-rose-400" />
          <span>Invalidation: <strong className="text-rose-400 font-bold">${setup.invalidation_point}</strong></span>
        </div>
      </div>
    </div>
  );
};



