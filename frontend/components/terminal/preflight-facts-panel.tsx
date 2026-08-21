'use client';

import React from 'react';
import { FullMarketContextPayload } from '@/types/analysis';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';

interface PreflightFactsPanelProps {
  marketContext?: FullMarketContextPayload | null;
  isLoading?: boolean;
}

export const PreflightFactsPanel: React.FC<PreflightFactsPanelProps> = ({
  marketContext,
  isLoading,
}) => {
  if (isLoading || !marketContext?.technicalFacts) {
    return null;
  }

  const facts = marketContext.technicalFacts;
  const isBullish = facts.trend === 'BULLISH';
  const warnings = marketContext.economicWarnings || [];

  return (
    <div className="bg-[#040406] border border-[#1c1d22] p-4 rounded-none space-y-3 font-mono text-xs text-[#e2e3e9]">
      {warnings.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/30 p-3 text-amber-400 space-y-1 rounded-none">
          <div className="font-bold flex items-center gap-1.5 uppercase text-[10px] text-amber-500">
            ⚠️ Macroeconomic Event Alert
          </div>
          {warnings.map((w, idx) => (
            <p key={idx} className="text-[11px] leading-snug font-sans text-amber-200/90">{w}</p>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#cc9166]" />
          <span className="eyebrow-copper">Pre-flight Market Factcheck</span>
        </div>
        <span className="text-[10px] text-[#5e616e] uppercase">Deterministic Engine</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-1">
        {/* Trend Indicator */}
        <div className="flex flex-col justify-center">
          <span className="text-[#5e616e] text-[9px] uppercase">Trend (EMA 20/50)</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isBullish ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
            <span className={isBullish ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {facts.trend}
            </span>
          </div>
        </div>

        {/* RSI state */}
        <div className="flex flex-col justify-center">
          <span className="text-[#5e616e] text-[9px] uppercase">RSI State</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`font-bold ${
                facts.rsiCondition === 'OVERSOLD'
                  ? 'text-emerald-400'
                  : facts.rsiCondition === 'OVERBOUGHT'
                  ? 'text-rose-400'
                  : 'text-[#e2e3e9]'
              }`}
            >
              {facts.rsiCondition}
            </span>
          </div>
        </div>

        {/* MACD cross */}
        <div className="flex flex-col justify-center">
          <span className="text-[#5e616e] text-[9px] uppercase">MACD Signal</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`font-bold ${
                facts.macdCrossover === 'BULLISH_CROSS'
                  ? 'text-emerald-400'
                  : facts.macdCrossover === 'BEARISH_CROSS'
                  ? 'text-rose-400'
                  : 'text-[#5e616e]'
              }`}
            >
              {facts.macdCrossover.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* ADX Trend strength */}
        <div className="flex flex-col justify-center">
          <span className="text-[#5e616e] text-[9px] uppercase">ADX (Trend Strength)</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`font-bold ${
                facts.adxTrend === 'STRONG'
                  ? 'text-emerald-400'
                  : facts.adxTrend === 'WEAK'
                  ? 'text-[#cc9166]'
                  : 'text-[#5e616e] italic'
              }`}
            >
              {facts.adxValue ? `${facts.adxValue} (${facts.adxTrend})` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Breakout state (BOS) */}
        <div className="flex flex-col justify-center">
          <span className="text-[#5e616e] text-[9px] uppercase">Breakout (BOS)</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`font-bold ${
                facts.breakoutType === 'BOS_BULLISH'
                  ? 'text-emerald-400'
                  : facts.breakoutType === 'BOS_BEARISH'
                  ? 'text-rose-400'
                  : 'text-[#5e616e] italic'
              }`}
            >
              {facts.breakoutType && facts.breakoutType !== 'NONE'
                ? `${facts.breakoutType.replace('BOS_', '')} ($${facts.breakoutLevel})`
                : 'NONE'}
            </span>
          </div>
        </div>

        {/* BTC Correlation */}
        <div className="flex flex-col justify-center">
          <span className="text-[#5e616e] text-[9px] uppercase">BTC Correlation (30d)</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`font-bold ${
                facts.btcCorrelation !== undefined && facts.btcCorrelation > 0.7
                  ? 'text-emerald-400'
                  : facts.btcCorrelation !== undefined && facts.btcCorrelation < -0.3
                  ? 'text-rose-400'
                  : 'text-[#e2e3e9]'
              }`}
            >
              {facts.btcCorrelation !== undefined ? `${facts.btcCorrelation}` : '1.0'}
            </span>
          </div>
        </div>
      </div>

      {/* Support & Resistance Levels */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1c1d22]">
        <div>
          <span className="text-[#5e616e] text-[9px] uppercase block mb-1">Key Supports</span>
          <div className="flex flex-wrap gap-1.5">
            {facts.supportLevels.length === 0 ? (
              <span className="text-[#5e616e] italic">None detected</span>
            ) : (
              facts.supportLevels.map((lvl, i) => (
                <span
                  key={i}
                  className="bg-[#121317] border border-[#1c1d22] px-2 py-0.5 font-bold text-emerald-400"
                >
                  ${lvl}
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <span className="text-[#5e616e] text-[9px] uppercase block mb-1">Key Resistances</span>
          <div className="flex flex-wrap gap-1.5">
            {facts.resistanceLevels.length === 0 ? (
              <span className="text-[#5e616e] italic">None detected</span>
            ) : (
              facts.resistanceLevels.map((lvl, i) => (
                <span
                  key={i}
                  className="bg-[#121317] border border-[#1c1d22] px-2 py-0.5 font-bold text-rose-400"
                >
                  ${lvl}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Divergences Factcheck Row */}
      {(facts.rsiDivergence !== 'NONE' || facts.macdDivergence !== 'NONE') && (
        <div className="pt-2 border-t border-[#1c1d22] flex flex-wrap gap-4 items-center">
          <span className="text-[#5e616e] text-[9px] uppercase">Active Divergences</span>
          <div className="flex flex-wrap gap-2 text-[10px]">
            {facts.rsiDivergence && facts.rsiDivergence !== 'NONE' && (
              <span className={`px-2 py-0.5 font-bold border rounded-none ${
                facts.rsiDivergence === 'BULLISH_DIV' 
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40' 
                  : 'bg-rose-950/40 text-rose-400 border-rose-500/40'
              }`}>
                RSI: {facts.rsiDivergence.replace('_DIV', ' DIV')}
              </span>
            )}
            {facts.macdDivergence && facts.macdDivergence !== 'NONE' && (
              <span className={`px-2 py-0.5 font-bold border rounded-none ${
                facts.macdDivergence === 'BULLISH_DIV' 
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40' 
                  : 'bg-rose-950/40 text-rose-400 border-rose-500/40'
              }`}>
                MACD: {facts.macdDivergence.replace('_DIV', ' DIV')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ATR Suggested Targets */}
      {(facts.atrSuggestedStopLossLong || facts.atrSuggestedTakeProfitLong) && (
        <div className="pt-2 border-t border-[#1c1d22] text-[10px] space-y-1">
          <span className="text-[#5e616e] text-[9px] uppercase block mb-1">ATR-Suggested Risk Bounds (2x ATR Limit Guide)</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#9194a1]">
            <div className="bg-[#121317] border border-[#1c1d22] p-2 rounded-none">
              <div className="text-[9px] font-bold text-emerald-400 uppercase">Long Bounds</div>
              <div className="mt-1">SL Level: ≥ <span className="text-[#ffffff] font-bold">${facts.atrSuggestedStopLossLong}</span></div>
              <div>TP Target: ~<span className="text-[#ffffff] font-bold">${facts.atrSuggestedTakeProfitLong}</span></div>
            </div>
            <div className="bg-[#121317] border border-[#1c1d22] p-2 rounded-none">
              <div className="text-[9px] font-bold text-rose-400 uppercase">Short Bounds</div>
              <div className="mt-1">SL Level: ≤ <span className="text-[#ffffff] font-bold">${facts.atrSuggestedStopLossShort}</span></div>
              <div>TP Target: ~<span className="text-[#ffffff] font-bold">${facts.atrSuggestedTakeProfitShort}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
