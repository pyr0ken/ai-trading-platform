'use client';

import React from 'react';
import { ProcessedTimeframeData } from '@/types/market';
import { Sliders, Sparkles, RotateCw } from 'lucide-react';

interface IndicatorTableProps {
  timeframeData?: ProcessedTimeframeData;
  isLoading?: boolean;
}

export const IndicatorTable: React.FC<IndicatorTableProps> = ({ timeframeData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] flex flex-col items-center justify-center min-h-[160px] space-y-2">
        <RotateCw className="w-5 h-5 text-[#cc9166] animate-spin" />
        <span className="text-xs font-mono text-[#9194a1]">Calculating Technical Indicators (EMA, RSI, MACD, ATR, ADX)...</span>
      </div>
    );
  }

  if (!timeframeData) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-3">
        <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#cc9166]" />
            <span className="eyebrow-copper">QUANTITATIVE INDICATORS</span>
          </div>
          <span className="text-xs text-[#5e616e] font-mono">Technical Matrix</span>
        </div>
        <div className="p-3 bg-[#121317]/50 border border-[#1c1d22] rounded-[8px] flex items-center justify-between text-xs">
          <span className="text-[#9194a1]">Technical indicator matrix (EMA, RSI, MACD, Key Levels) ready.</span>
          <span className="text-[11px] font-mono text-[#cc9166] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Press &quot;Run AI Quant&quot;
          </span>
        </div>
      </div>
    );
  }

  const ind = timeframeData.indicators;
  const keyLevels = timeframeData.keyLevels;
  const res1 = keyLevels?.resistanceLevels?.[0] ?? 0;
  const res2 = keyLevels?.resistanceLevels?.[1] ?? keyLevels?.resistanceLevels?.[0] ?? 0;
  const sup1 = keyLevels?.supportLevels?.[0] ?? 0;
  const sup2 = keyLevels?.supportLevels?.[1] ?? keyLevels?.supportLevels?.[0] ?? 0;

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9]">
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-4 mb-5">
        <div>
          <span className="eyebrow-copper block mb-1">QUANTITATIVE INDICATORS</span>
          <h3 className="text-xl font-ivy-presto text-[#ffffff]">Technical Indicators ({timeframeData.timeframe})</h3>
        </div>
        <span className="font-mono text-[11px] bg-[#121317] text-[#e2e3e9] border border-[#1c1d22] px-3 py-1 rounded-[6px]">
          CLOSE: ${timeframeData.latestClose?.toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
        {/* Moving Averages */}
        <div className="bg-[#121317] border border-[#1c1d22] rounded-[8px] p-4 space-y-2.5">
          <h4 className="eyebrow-fog text-[10px] border-b border-[#1c1d22] pb-2 uppercase">
            EXPONENTIAL MOVING AVERAGES
          </h4>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">EMA 7 (SCALP):</span>
            <span className="font-mono text-emerald-400 font-bold">${ind.ema_7}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">EMA 20 (SHORT):</span>
            <span className="font-mono text-rose-400 font-bold">${ind.ema_20}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">EMA 50 (MID):</span>
            <span className="font-mono text-[#e2e3e9]">${ind.ema_50}</span>
          </div>
        </div>

        {/* RSI & MACD */}
        <div className="bg-[#121317] border border-[#1c1d22] rounded-[8px] p-4 space-y-2.5">
          <h4 className="eyebrow-fog text-[10px] border-b border-[#1c1d22] pb-2 uppercase">
            OSCILLATORS & MOMENTUM
          </h4>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">RSI (14):</span>
            <span className="font-mono text-[#cc9166] font-bold">{ind.rsi_14}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">MACD LINE:</span>
            <span className="font-mono text-[#e2e3e9]">{ind.macd_line}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">SIGNAL LINE:</span>
            <span className="font-mono text-[#9194a1]">{ind.macd_signal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">CONDITION:</span>
            <span className="font-mono text-emerald-400 font-bold text-[10px]">{ind.macd_condition}</span>
          </div>
        </div>

        {/* Volatility & Trend */}
        <div className="bg-[#121317] border border-[#1c1d22] rounded-[8px] p-4 space-y-2.5">
          <h4 className="eyebrow-fog text-[10px] border-b border-[#1c1d22] pb-2 uppercase">
            VOLATILITY & STRENGTH
          </h4>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">ATR (14):</span>
            <span className="font-mono text-[#e2e3e9]">${ind.atr_14}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">ADX (TREND):</span>
            <span className="font-mono text-[#cc9166] font-bold">{ind.adx_14 ?? 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">BOLLINGER HIGH:</span>
            <span className="font-mono text-emerald-400">${ind.bb_upper}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">BOLLINGER LOW:</span>
            <span className="font-mono text-rose-400">${ind.bb_lower}</span>
          </div>
        </div>

        {/* Key Pivot Support & Resistance */}
        <div className="bg-[#121317] border border-[#1c1d22] rounded-[8px] p-4 space-y-2.5">
          <h4 className="eyebrow-fog text-[10px] border-b border-[#1c1d22] pb-2 uppercase">
            PIVOT LEVELS & ZONES
          </h4>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">RESISTANCE 2:</span>
            <span className="font-mono text-rose-400 font-bold">${res2}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">RESISTANCE 1:</span>
            <span className="font-mono text-rose-300 font-bold">${res1}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">SUPPORT 1:</span>
            <span className="font-mono text-emerald-300 font-bold">${sup1}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">SUPPORT 2:</span>
            <span className="font-mono text-emerald-400 font-bold">${sup2}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
