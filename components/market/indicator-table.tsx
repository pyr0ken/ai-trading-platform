'use client';

import React from 'react';
import { ProcessedTimeframeData } from '@/types/market';

interface IndicatorTableProps {
  timeframeData?: ProcessedTimeframeData;
  isLoading?: boolean;
}

export const IndicatorTable: React.FC<IndicatorTableProps> = ({ timeframeData, isLoading }) => {
  if (isLoading || !timeframeData) {
    return (
      <div className="bg-[#040406] border border-[#e2e3e9]/20 rounded-[10px] p-6 text-[#e2e3e9] animate-pulse min-h-[220px]">
        <div className="h-5 w-48 bg-white/5 rounded-full mb-4" />
        <div className="h-32 bg-white/5 rounded-[9999px]" />
      </div>
    );
  }

  const ind = timeframeData.indicators;
  const keyLevels = timeframeData.keyLevels;

  return (
    <div className="bg-[#040406] border border-[#e2e3e9]/20 rounded-[10px] p-6 text-[#e2e3e9]">
      <div className="flex items-center justify-between border-b border-[#e2e3e9]/20 pb-4 mb-5">
        <div>
          <span className="font-mono text-[10px] text-[#9194a1] tracking-[0.16em] uppercase block mb-1">QUANTITATIVE INDICATORS</span>
          <h3 className="text-xl font-sans text-[#e2e3e9]">Technical Indicators ({timeframeData.timeframe})</h3>
        </div>
        <span className="font-mono text-[11px] bg-[#08080a] text-[#e2e3e9] border border-[#e2e3e9]/20 px-3 py-1 rounded-[9999px] tracking-[0.06em]">
          CLOSE: ${timeframeData.latestClose}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
        {/* Moving Averages */}
        <div className="bg-[#08080a] border border-[#e2e3e9]/20 rounded-[9999px] p-4 space-y-2.5">
          <h4 className="font-mono text-[10px] text-[#9194a1] tracking-[0.16em] border-b border-[#e2e3e9]/20 pb-2 uppercase">
            EXPONENTIAL MOVING AVERAGES
          </h4>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">EMA 7 (SCALP):</span>
            <span className="font-sans text-[#e2e3e9]">${ind.ema_7}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">EMA 20 (SHORT):</span>
            <span className="font-sans text-[#e2e3e9]">${ind.ema_20}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">EMA 50 (MID):</span>
            <span className="font-sans text-[#e2e3e9]">${ind.ema_50}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">EMA 200 (LONG):</span>
            <span className="font-sans text-[#e2e3e9]">${ind.ema_200}</span>
          </div>
        </div>

        {/* RSI & MACD */}
        <div className="bg-[#08080a] border border-[#e2e3e9]/20 rounded-[9999px] p-4 space-y-2.5">
          <h4 className="font-mono text-[10px] text-[#9194a1] tracking-[0.16em] border-b border-[#e2e3e9]/20 pb-2 uppercase">
            MOMENTUM (RSI & MACD)
          </h4>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">RSI (14):</span>
            <span className="font-sans text-[#e2e3e9]">{ind.rsi_14} ({ind.rsi_condition})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">MACD LINE:</span>
            <span className="font-sans text-[#e2e3e9]">{ind.macd_line}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">MACD HIST:</span>
            <span className="font-sans text-[#e2e3e9]">{ind.macd_hist}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">MACD SIGNAL:</span>
            <span className="font-sans text-[#cc9166]">{ind.macd_condition}</span>
          </div>
        </div>

        {/* Volatility & VWAP */}
        <div className="bg-[#08080a] border border-[#e2e3e9]/20 rounded-[9999px] p-4 space-y-2.5">
          <h4 className="font-mono text-[10px] text-[#9194a1] tracking-[0.16em] border-b border-[#e2e3e9]/20 pb-2 uppercase">
            VOLATILITY & VWAP
          </h4>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">BB UPPER:</span>
            <span className="font-sans text-[#e2e3e9]">${ind.bb_upper}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">BB LOWER:</span>
            <span className="font-sans text-[#e2e3e9]">${ind.bb_lower}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">ATR (14):</span>
            <span className="font-sans text-[#e2e3e9]">${ind.atr_14}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9194a1]">VWAP:</span>
            <span className="font-sans text-[#e2e3e9]">${ind.vwap ?? 'N/A'}</span>
          </div>
        </div>

        {/* Support & Resistance Levels */}
        <div className="bg-[#08080a] border border-[#e2e3e9]/20 rounded-[9999px] p-4 space-y-2.5">
          <h4 className="font-mono text-[10px] text-[#9194a1] tracking-[0.16em] border-b border-[#e2e3e9]/20 pb-2 uppercase">
            KEY S&R LEVELS
          </h4>
          <div>
            <span className="text-[#9194a1] block mb-1">RESISTANCES:</span>
            <div className="flex flex-wrap gap-1">
              {keyLevels.resistanceLevels.length > 0
                ? keyLevels.resistanceLevels.map((r, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-[6px] bg-[#2e3038] text-rose-300 border border-rose-900/50 text-[10px]">
                      ${r}
                    </span>
                  ))
                : 'None'}
            </div>
          </div>
          <div className="pt-1">
            <span className="text-[#9194a1] block mb-1">SUPPORTS:</span>
            <div className="flex flex-wrap gap-1">
              {keyLevels.supportLevels.length > 0
                ? keyLevels.supportLevels.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-[6px] bg-[#2e3038] text-[#e2e3e9] border border-[#e2e3e9]/20 text-[10px]">
                      ${s}
                    </span>
                  ))
                : 'None'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
