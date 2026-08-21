'use client';

import React from 'react';
import { TimeframeHeatmapRow } from '@/types/terminal';
import { CalculatedIndicators } from '@/types/market';
import { FullMarketContextPayload } from '@/types/analysis';
import { Layers, TrendingUp, TrendingDown, Sparkles, RotateCw } from 'lucide-react';

interface MultiTimeframeMatrixProps {
  marketContext?: FullMarketContextPayload | null;
  isLoading?: boolean;
}

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

  const derivedRows: TimeframeHeatmapRow[] = marketContext?.timeframes
    ? defaultOrder
        .map((tf) => {
          const tfData = marketContext.timeframes[tf];
          if (!tfData) return null;
          return deriveRow(tf, tfData.indicators);
        })
        .filter(Boolean) as TimeframeHeatmapRow[]
    : [];

  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] flex flex-col items-center justify-center min-h-[160px] space-y-2">
        <RotateCw className="w-5 h-5 text-[#cc9166] animate-spin" />
        <span className="text-xs font-mono text-[#9194a1]">Generating Multi-Timeframe Heatmap Matrix...</span>
      </div>
    );
  }

  if (!marketContext?.timeframes) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-3">
        <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#cc9166]" />
            <span className="eyebrow-copper">MULTI-TIMEFRAME HEATMAP MATRIX</span>
          </div>
          <span className="text-xs text-[#5e616e] font-mono">Confluence Matrix</span>
        </div>
        <div className="p-3 bg-[#121317]/50 border border-[#1c1d22] rounded-[8px] flex items-center justify-between text-xs">
          <span className="text-[#9194a1]">Multi-timeframe confluence heatmap ready.</span>
          <span className="text-[11px] font-mono text-[#cc9166] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Press &quot;Run AI Quant&quot;
          </span>
        </div>
      </div>
    );
  }

  const rows = derivedRows;
  const signals = rows.map((r) => r.signal);
  const buyCount = signals.filter((s) => s === 'BUY').length;
  const sellCount = signals.filter((s) => s === 'SELL').length;
  const total = signals.length || 1;
  const confluencePct = rows.length > 0 ? Math.round(
    buyCount > sellCount ? (buyCount / total) * 100 : (sellCount / total) * 100
  ) : 0;

  const getStatusBadge = (val: string) => {
    const isGood = ['Bullish', 'Above', 'High', 'BUY'].some((k) => val.includes(k));
    const isBad = ['Bearish', 'Below', 'Low', 'SELL'].some((k) => val.includes(k));

    return (
      <span
        className={`px-2.5 py-1 rounded-[9999px] text-[10px] font-mono tracking-[0.06em] uppercase inline-flex items-center gap-1 ${
          isGood
            ? 'bg-[#121317] text-emerald-400 border border-emerald-500/40'
            : isBad
            ? 'bg-[#121317] text-rose-400 border border-rose-900/50'
            : 'bg-[#08080a] text-[#9194a1] border border-[#1c1d22]'
        }`}
      >
        {isGood && <TrendingUp className="w-3 h-3 text-emerald-400" />}
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
            <span className="text-[11px] text-[#9194a1] block">
              5m &bull; 15m &bull; 1h &bull; 4h &bull; 1D Confluence
            </span>
          </div>
        </div>

        <div className="text-right font-mono">
          <span className="text-[10px] text-[#5e616e] block uppercase">Confluence Score</span>
          <span className="text-sm font-bold text-[#cc9166]">{confluencePct}%</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead>
            <tr className="border-b border-[#1c1d22] text-[#5e616e] text-[10px] uppercase font-mono tracking-wider">
              <th className="py-2.5 px-3">Timeframe</th>
              <th className="py-2.5 px-3">Trend (EMA)</th>
              <th className="py-2.5 px-3">MACD</th>
              <th className="py-2.5 px-3">RSI (14)</th>
              <th className="py-2.5 px-3">VWAP Pos</th>
              <th className="py-2.5 px-3">Volume</th>
              <th className="py-2.5 px-3 text-right">Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c1d22]/50 font-mono">
            {rows.map((row) => (
              <tr key={row.timeframe} className="hover:bg-[#121317]/50 transition-colors">
                <td className="py-3 px-3 font-bold text-[#e2e3e9]">{row.timeframe}</td>
                <td className="py-3 px-3">{getStatusBadge(row.trend)}</td>
                <td className="py-3 px-3">{getStatusBadge(row.macd)}</td>
                <td className="py-3 px-3">{getStatusBadge(row.rsi)}</td>
                <td className="py-3 px-3">{getStatusBadge(row.vwap)}</td>
                <td className="py-3 px-3">{getStatusBadge(row.volume)}</td>
                <td className="py-3 px-3 text-right font-bold">{getStatusBadge(row.signal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
