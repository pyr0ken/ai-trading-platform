'use client';

import React from 'react';
import { TimeframeHeatmapRow } from '@/types/terminal';
import { CalculatedIndicators } from '@/types/market';
import { FullMarketContextPayload } from '@/types/analysis';
import { Layers, Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface MultiTimeframeMatrixProps {
  marketContext?: FullMarketContextPayload | null;
  isLoading?: boolean;
}

/**
 * Derive a TimeframeHeatmapRow from a timeframe's calculated indicators.
 */
function deriveRow(tf: string, indicators: CalculatedIndicators): TimeframeHeatmapRow {
  if (!indicators) {
    return { timeframe: tf, trend: 'Neutral', ema: 'Neutral', macd: 'Neutral', rsi: 'Neutral', vwap: 'Above', volume: 'Normal', signal: 'HOLD' };
  }

  const ema20 = indicators.ema_20 || 0;
  const ema50 = indicators.ema_50 || 0;
  const trend = ema20 > ema50 ? 'Bullish' as const : 'Bearish' as const;

  const ema7 = indicators.ema_7 || 0;
  const emaAlignment = ema7 > ema20 ? 'Bullish' as const : 'Bearish' as const;

  const macdCond = indicators.macd_condition || 'NEUTRAL';
  const macd: 'Bullish' | 'Bearish' | 'Neutral' = macdCond === 'BULLISH_CROSSOVER' ? 'Bullish' : macdCond === 'BEARISH_CROSSOVER' ? 'Bearish' : 'Neutral';

  const rsi = indicators.rsi_14 ?? 50;
  const rsiStr: 'Overbought' | 'Oversold' | 'Neutral' = rsi >= 70 ? 'Overbought' : rsi <= 30 ? 'Oversold' : 'Neutral';

  const vwap = indicators.vwap ?? 0;
  const close = indicators.ema_7 || 0;
  const vwapStr: 'Above' | 'Below' = close >= vwap ? 'Above' : 'Below';

  const adx = indicators.adx_14 ?? 20;
  const volumeStr: 'High' | 'Normal' | 'Low' = adx >= 25 ? 'High' : adx >= 20 ? 'Normal' : 'Low';

  let signal: TimeframeHeatmapRow['signal'] = 'HOLD';
  if (trend === 'Bullish' && macd === 'Bullish' && rsiStr !== 'Overbought') signal = 'BUY';
  else if (trend === 'Bearish' && macd === 'Bearish' && rsiStr !== 'Oversold') signal = 'SELL';

  return { timeframe: tf, trend, ema: emaAlignment, macd, rsi: rsiStr, vwap: vwapStr, volume: volumeStr, signal };
}

export const MultiTimeframeMatrix: React.FC<MultiTimeframeMatrixProps> = ({ marketContext, isLoading }) => {
  const defaultOrder = ['5m', '15m', '1h', '4h', '1D'];

  // Build rows from real market context data when available
  const derivedRows: TimeframeHeatmapRow[] = marketContext?.timeframes
    ? defaultOrder
        .map((tf) => {
          const tfData = marketContext.timeframes[tf];
          if (!tfData) return null;
          return deriveRow(tf, tfData.indicators);
        })
        .filter(Boolean) as TimeframeHeatmapRow[]
    : [];

  // Compute confluence from derived rows
  const signals = derivedRows.map((r) => r.signal);
  const buyCount = signals.filter((s) => s === 'BUY').length;
  const sellCount = signals.filter((s) => s === 'SELL').length;
  const total = signals.length || 1;
  const confluencePct = Math.round(
    buyCount > sellCount ? (buyCount / total) * 100 : (sellCount / total) * 100
  );

  const defaultRows: TimeframeHeatmapRow[] = derivedRows.length > 0 ? derivedRows : [
    { timeframe: '5m', trend: 'Bullish', ema: 'Bullish', macd: 'Bullish', rsi: 'Neutral', vwap: 'Above', volume: 'High', signal: 'BUY' },
    { timeframe: '15m', trend: 'Bullish', ema: 'Bullish', macd: 'Bullish', rsi: 'Neutral', vwap: 'Above', volume: 'High', signal: 'BUY' },
    { timeframe: '1h', trend: 'Bullish', ema: 'Bullish', macd: 'Bullish', rsi: 'Neutral', vwap: 'Above', volume: 'Normal', signal: 'BUY' },
    { timeframe: '4h', trend: 'Neutral', ema: 'Bullish', macd: 'Neutral', rsi: 'Neutral', vwap: 'Above', volume: 'Normal', signal: 'HOLD' },
    { timeframe: '1D', trend: 'Bullish', ema: 'Bullish', macd: 'Bullish', rsi: 'Neutral', vwap: 'Above', volume: 'High', signal: 'BUY' },
  ];

  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] animate-pulse space-y-4">
        <div className="h-6 w-48 bg-[#121317] rounded-[9999px] mb-4" />
        <div className="h-36 bg-[#121317] rounded-[10px]" />
      </div>
    );
  }

  const getStatusBadge = (val: string) => {
    const isGood = ['Bullish', 'Above', 'High', 'BUY'].some((k) => val.includes(k));
    const isBad = ['Bearish', 'Below', 'Low', 'SELL'].some((k) => val.includes(k));

    return (
      <span
        className={`px-2.5 py-1 rounded-[9999px] text-[10px] font-mono tracking-[0.06em] uppercase inline-flex items-center gap-1 ${
          isGood
            ? 'bg-[#121317] text-[#cc9166] border border-[#cc9166]'
            : isBad
            ? 'bg-[#121317] text-rose-400 border border-rose-900/50'
            : 'bg-[#08080a] text-[#9194a1] border border-[#1c1d22]'
        }`}
      >
        {isGood && <TrendingUp className="w-3 h-3 text-[#cc9166]" />}
        {isBad && <TrendingDown className="w-3 h-3 text-rose-400" />}
        <span>{val}</span>
      </span>
    );
  };

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[9999px] bg-[#121317] border border-[#cc9166] flex items-center justify-center text-[#cc9166]">
            <Layers className="w-4 h-4 text-[#cc9166]" />
          </div>
          <div>
            <h3 className="eyebrow-copper">
              MULTI-TIMEFRAME HEATMAP MATRIX
            </h3>
            <span className="font-mono text-[10px] text-[#9194a1] tracking-[0.16em] uppercase block mt-0.5">
              Cross-Timeframe Trend & Confluence Grid
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-[#cc9166] bg-[#121317] border border-[#cc9166]/40 px-3 py-1 rounded-[9999px] uppercase tracking-[0.06em]">
          <Activity className="w-3.5 h-3.5" />
          <span>{confluencePct}% CONFLUENCE</span>
        </div>
      </div>

      {/* Heatmap Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-[#1c1d22] text-[#9194a1] text-[10px] tracking-[0.16em] uppercase">
              <th className="py-3 px-3">TIMEFRAME</th>
              <th className="py-3 px-3">TREND</th>
              <th className="py-3 px-3">EMA ALIGNMENT</th>
              <th className="py-3 px-3">MACD</th>
              <th className="py-3 px-3">RSI</th>
              <th className="py-3 px-3">VWAP</th>
              <th className="py-3 px-3">VOLUME</th>
              <th className="py-3 px-3 text-right">SIGNAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c1d22]">
            {defaultRows.map((r) => (
              <tr key={r.timeframe} className="hover:bg-[#121317] transition-all">
                <td className="py-3.5 px-3 font-sans text-sm text-[#e2e3e9]">{r.timeframe}</td>
                <td className="py-3.5 px-3">{getStatusBadge(r.trend)}</td>
                <td className="py-3.5 px-3">{getStatusBadge(r.ema)}</td>
                <td className="py-3.5 px-3">{getStatusBadge(r.macd)}</td>
                <td className="py-3.5 px-3">{getStatusBadge(r.rsi)}</td>
                <td className="py-3.5 px-3">{getStatusBadge(r.vwap)}</td>
                <td className="py-3.5 px-3">{getStatusBadge(r.volume)}</td>
                <td className="py-3.5 px-3 text-right">{getStatusBadge(r.signal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

