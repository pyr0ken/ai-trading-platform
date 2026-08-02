'use client';

import React, { useState } from 'react';
import { TradeSetup } from '@/types/terminal';
import {
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Gauge,
  Check,
  PauseCircle,
  Eye,
  AlertTriangle,
  BarChart2,
  Sparkles,
  RotateCw,
} from 'lucide-react';
import { AppStorageEngine } from '@/lib/storage/app-db';

interface TradeSetupCardProps {
  setup?: TradeSetup | null;
  isLoading?: boolean;
  symbol?: string;
}

const NeutralWatchPanel: React.FC<{ setup: TradeSetup }> = ({ setup }) => (
  <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-5">
    <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-amber-400" />
        <span className="eyebrow-copper">MARKET WATCH — NO ACTIVE TRADE</span>
      </div>
      <span className="text-xs text-amber-400 font-mono bg-amber-950/40 border border-amber-700/50 px-3 py-1 rounded-[6px]">
        HOLD / NEUTRAL
      </span>
    </div>

    <div className="flex items-start gap-3 bg-amber-950/20 border border-amber-700/40 p-4 rounded-[8px]">
      <PauseCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-xs font-sans font-semibold text-amber-300">
          No Entry Signal — Observation Mode Active
        </p>
        <p className="text-[11px] text-[#9194a1] leading-relaxed font-sans">
          Current market structure does not present a high-probability trade entry. Monitor key levels and wait for confirmed structural triggers before opening positions.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
      {setup.invalidation_point > 0 && (
        <div className="bg-[#121317] border border-[#1c1d22] p-3.5 rounded-[8px] space-y-1">
          <span className="eyebrow-fog text-[10px] block uppercase text-rose-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> WATCH INVALIDATION LEVEL
          </span>
          <span className="text-rose-400 font-bold text-sm block">
            ${setup.invalidation_point.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#5e616e] block">
            Close beyond this price invalidates thesis
          </span>
        </div>
      )}

      {setup.strategy_name && (
        <div className="bg-[#121317] border border-[#1c1d22] p-3.5 rounded-[8px] space-y-1">
          <span className="eyebrow-fog text-[10px] block uppercase text-[#cc9166] flex items-center gap-1">
            <BarChart2 className="w-3 h-3" /> SCENARIO CONTEXT
          </span>
          <span className="text-[#e2e3e9] font-medium text-[12px] block">
            {setup.strategy_name}
          </span>
          <span className="text-[10px] text-[#5e616e] block">
            Awaiting confirmation signal
          </span>
        </div>
      )}
    </div>
  </div>
);

export const TradeSetupCard: React.FC<TradeSetupCardProps> = ({ setup, isLoading, symbol }) => {
  const [balance, setBalance] = useState(1000);
  const [riskPct, setRiskPct] = useState(1);
  const [executed, setExecuted] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] flex flex-col items-center justify-center min-h-[160px] space-y-2">
        <RotateCw className="w-5 h-5 text-[#cc9166] animate-spin" />
        <span className="text-xs font-mono text-[#9194a1]">Calculating Risk/Reward & Trade Setup...</span>
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-3">
        <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#cc9166]" />
            <span className="eyebrow-copper">QUANTITATIVE TRADE SETUP</span>
          </div>
          <span className="text-xs text-[#5e616e] font-mono">Execution Parameters</span>
        </div>
        <div className="p-3 bg-[#121317]/50 border border-[#1c1d22] rounded-[8px] flex items-center justify-between text-xs">
          <span className="text-[#9194a1]">Trade entry range, Stop Loss, and Take Profit targets ready.</span>
          <span className="text-[11px] font-mono text-[#cc9166] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Press &quot;Run AI Quant&quot;
          </span>
        </div>
      </div>
    );
  }

  if (setup.position === 'NEUTRAL') {
    return <NeutralWatchPanel setup={setup} />;
  }

  const isLong = setup.position === 'LONG';

  const handleExecutePaper = () => {
    if (!setup) return;
    const entryVal = ((setup.entry_range?.[0] ?? 0) + (setup.entry_range?.[1] ?? 0)) / 2;
    const slVal = setup.stop_loss;
    const tpVal = setup.take_profit_1;
    const levVal = parseInt(setup.recommended_leverage) || 10;

    const riskAmount = balance * (riskPct / 100);
    const priceDiff = Math.abs(entryVal - slVal);
    const positionSize = priceDiff > 0 ? riskAmount / priceDiff : 0;
    const notionalValue = positionSize * entryVal;
    const marginRequired = notionalValue / levVal;
    const quantity = notionalValue / entryVal;

    AppStorageEngine.openPaperPosition({
      symbol: symbol || 'BTC/USDT',
      exchange: 'kucoin',
      side: isLong ? 'LONG' : 'SHORT',
      entryPrice: entryVal,
      quantity,
      leverage: levVal,
      stopLoss: slVal,
      takeProfit: tpVal,
      margin: marginRequired,
    });

    setExecuted(true);
    setTimeout(() => setExecuted(false), 3000);
  };

  return (
    <div className="bg-[#040406] border border-[#1c1d22] hover:border-[#cc9166]/40 rounded-[10px] p-6 text-[#e2e3e9] space-y-5 transition-all duration-300 shadow-xl">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">QUANTITATIVE TRADE SETUP</span>
        </div>
        <span className="text-xs text-[#9194a1] font-sans bg-[#121317] border border-[#1c1d22] px-3 py-1 rounded-[6px]">
          {setup.strategy_name || 'Multi-Factor Strategy'}
        </span>
      </div>

      {/* Position & Entry Range Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#121317] border border-[#1c1d22] p-4 rounded-[8px]">
        <div className="md:col-span-5 flex flex-col justify-center border-b md:border-b-0 md:border-r border-[#1c1d22] pb-3 md:pb-0 md:pr-4">
          <span className="eyebrow-fog text-[10px] block mb-1">POSITION DIRECTION</span>
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 text-base font-bold px-4 py-1.5 rounded-[6px] font-sans ${
                isLong
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500'
                  : 'bg-rose-950/80 text-rose-400 border border-rose-500'
              }`}
            >
              {isLong ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
              )}
              {setup.position}
            </span>
            <span className="text-xs text-[#9194a1] font-sans">
              Lev: <strong className="text-[#e2e3e9]">{setup.recommended_leverage}</strong>
            </span>
          </div>
        </div>

        <div className="md:col-span-7 flex flex-col justify-center">
          <span className="eyebrow-fog text-[10px] block mb-1">OPTIMAL ENTRY RANGE</span>
          <div className="text-lg md:text-xl font-bold font-mono text-[#ffffff]">
            ${setup.entry_range?.[0]?.toLocaleString() ?? 0}{' '}
            <span className="text-[#5e616e]">-</span> ${setup.entry_range?.[1]?.toLocaleString() ?? 0}
          </div>
        </div>
      </div>

      {/* Position Sizing Calculator */}
      <div className="bg-[#121317] border border-[#1c1d22] p-4 rounded-[8px] space-y-3 font-sans text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="font-bold text-[#cc9166] uppercase tracking-wide">Risk &amp; Position Calculator</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[#5e616e]">Balance ($):</span>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value))}
                className="w-16 bg-[#040406] border border-[#1c1d22] text-[#e2e3e9] px-1.5 py-0.5 font-mono text-[11px] text-center rounded-[4px]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#5e616e]">Risk (%):</span>
              <input
                type="number"
                value={riskPct}
                onChange={(e) => setRiskPct(Number(e.target.value))}
                className="w-12 bg-[#040406] border border-[#1c1d22] text-[#e2e3e9] px-1.5 py-0.5 font-mono text-[11px] text-center rounded-[4px]"
              />
            </div>
          </div>
        </div>

        {(() => {
          const entryPriceVal = ((setup.entry_range?.[0] ?? 0) + (setup.entry_range?.[1] ?? 0)) / 2;
          const stopLossVal = setup.stop_loss;
          const riskAmount = balance * (riskPct / 100);
          const priceDiff = Math.abs(entryPriceVal - stopLossVal);
          const positionSize = priceDiff > 0 ? riskAmount / priceDiff : 0;
          const leverageVal = parseInt(setup.recommended_leverage) || 10;
          const notionalValue = positionSize * entryPriceVal;
          const marginRequired = notionalValue / leverageVal;

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-[#1c1d22] font-mono text-[11px]">
              <div>
                <span className="text-[#5e616e] block uppercase text-[9px]">Max Risk</span>
                <span className="text-rose-400 font-bold">${riskAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#5e616e] block uppercase text-[9px]">Position Size</span>
                <span className="text-[#ffffff] font-bold">{positionSize.toFixed(4)} Units</span>
              </div>
              <div>
                <span className="text-[#5e616e] block uppercase text-[9px]">Notional Val</span>
                <span className="text-[#ffffff] font-bold">${notionalValue.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#5e616e] block uppercase text-[9px]">Req Margin ({leverageVal}x)</span>
                <span className="text-[#cc9166] font-bold">${marginRequired.toFixed(2)}</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Take Profit & Stop Loss Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-[#121317] border border-rose-900/50 rounded-[8px] p-3 space-y-1">
          <span className="eyebrow-fog text-[10px] block uppercase text-rose-400">STOP LOSS (SL)</span>
          <span className="text-rose-400 font-bold text-sm block">
            ${setup.stop_loss?.toLocaleString()}
          </span>
        </div>

        <div className="bg-[#121317] border border-emerald-900/50 rounded-[8px] p-3 space-y-1">
          <span className="eyebrow-fog text-[10px] block uppercase text-emerald-400">TAKE PROFIT 1</span>
          <span className="text-emerald-400 font-bold text-sm block">
            ${setup.take_profit_1?.toLocaleString()}
          </span>
        </div>

        <div className="bg-[#121317] border border-emerald-900/50 rounded-[8px] p-3 space-y-1">
          <span className="eyebrow-fog text-[10px] block uppercase text-emerald-400">TAKE PROFIT 2</span>
          <span className="text-emerald-400 font-bold text-sm block">
            ${setup.take_profit_2?.toLocaleString()}
          </span>
        </div>

        <div className="bg-[#121317] border border-emerald-900/50 rounded-[8px] p-3 space-y-1">
          <span className="eyebrow-fog text-[10px] block uppercase text-emerald-400">TAKE PROFIT 3</span>
          <span className="text-emerald-400 font-bold text-sm block">
            ${setup.take_profit_3?.toLocaleString()}
          </span>
        </div>
      </div>

      {/* R:R Ratio & Invalidation Point Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-[#121317] border border-[#1c1d22] px-4 py-2.5 rounded-[8px]">
        <div className="flex items-center gap-1.5 text-[#9194a1]">
          <Gauge className="w-4 h-4 text-[#cc9166]" />
          <span>
            Risk-to-Reward: <strong className="text-emerald-400 font-bold">{setup.risk_reward_ratio} R</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#9194a1]">
          <ShieldCheck className="w-4 h-4 text-rose-400" />
          <span>
            Invalidation: <strong className="text-rose-400 font-bold">${setup.invalidation_point?.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Execute Paper Trade Action */}
      <div className="pt-1 flex justify-end">
        <button
          onClick={handleExecutePaper}
          disabled={executed}
          className={`px-4 py-2 border font-sans font-bold text-[11px] tracking-wider uppercase rounded-[6px] transition-all cursor-pointer inline-flex items-center gap-1.5 ${
            executed
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
              : 'bg-[#cc9166] text-[#08080a] border-[#cc9166] hover:bg-[#d6a27e] shadow-md'
          }`}
        >
          {executed ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Order Placed in Portfolio
            </>
          ) : (
            'Copy to Paper Portfolio'
          )}
        </button>
      </div>
    </div>
  );
};
