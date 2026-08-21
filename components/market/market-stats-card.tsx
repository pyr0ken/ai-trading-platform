'use client';

import React from 'react';
import { MarketTicker, DerivativesMetrics, MicrostructureMetrics, MacroSentiment } from '@/types/market';
import { TrendingUp, TrendingDown, Activity, Sparkles, RotateCw } from 'lucide-react';

interface MarketStatsCardProps {
  ticker?: MarketTicker;
  derivatives?: DerivativesMetrics;
  microstructure?: MicrostructureMetrics;
  macroSentiment?: MacroSentiment;
  isLoading?: boolean;
}

export const MarketStatsCard: React.FC<MarketStatsCardProps> = ({
  ticker,
  derivatives,
  microstructure,
  macroSentiment,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] flex flex-col items-center justify-center min-h-[140px] space-y-2">
        <RotateCw className="w-5 h-5 text-[#cc9166] animate-spin" />
        <span className="text-xs font-mono text-[#9194a1]">Fetching Real-Time Market Microstructure & Funding Rates...</span>
      </div>
    );
  }

  if (!ticker) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-3">
        <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#cc9166]" />
            <span className="eyebrow-copper">MARKET MICROSTRUCTURE</span>
          </div>
          <span className="text-xs text-[#5e616e] font-mono">Derivatives & Orderbook</span>
        </div>
        <div className="p-3 bg-[#121317]/50 border border-[#1c1d22] rounded-[8px] flex items-center justify-between text-xs">
          <span className="text-[#9194a1]">Real-time market metrics & funding rates ready.</span>
          <span className="text-[11px] font-mono text-[#cc9166] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Press &quot;Run AI Quant&quot;
          </span>
        </div>
      </div>
    );
  }

  const isPositive = ticker.change24hPercentage >= 0;
  const obPressure = microstructure?.orderBookDepth?.orderBookPressure || 'NEUTRAL';

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9]">
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-4 mb-5">
        <div>
          <span className="text-[13px] font-sans font-semibold text-[#cc9166] uppercase tracking-wider block mb-1">
            Market Microstructure
          </span>
          <h3 className="font-ivy-presto text-[24px] text-[#ffffff]">Real-Time Metrics</h3>
        </div>
        <span className="text-[13px] text-[#5e616e]">
          {ticker.symbol} &bull; {ticker.exchange.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[10px] p-4">
          <span className="text-[11px] text-[#5e616e] block mb-1 uppercase tracking-wider">Price</span>
          <div className="font-mono font-semibold text-[20px] text-[#ffffff] tabular-nums">
            ${ticker.price.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[10px] p-4">
          <span className="text-[11px] text-[#5e616e] block mb-1 uppercase tracking-wider">24h Change</span>
          <div
            className={`font-mono text-[16px] font-medium tabular-nums flex items-center gap-1 ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isPositive ? '+' : ''}{ticker.change24hPercentage}%</span>
          </div>
        </div>

        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[10px] p-4">
          <span className="text-[11px] text-[#5e616e] block mb-1 uppercase tracking-wider">Funding Rate</span>
          <div className="font-mono text-[16px] text-[#e2e3e9] tabular-nums">
            {derivatives?.fundingRate !== null && derivatives?.fundingRate !== undefined
              ? `${(derivatives.fundingRate * 100).toFixed(4)}%`
              : 'N/A'}
          </div>
        </div>

        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[10px] p-4">
          <span className="text-[11px] text-[#5e616e] block mb-1 uppercase tracking-wider">Orderbook</span>
          <div className="text-[12px]">
            <span
              className={`px-2.5 py-1 rounded-[9999px] inline-block text-[11px] font-sans font-medium ${
                obPressure === 'BUY_PRESSURE'
                  ? 'bg-[#121317] text-emerald-400 border border-emerald-500/40'
                  : obPressure === 'SELL_PRESSURE'
                  ? 'bg-[#121317] text-rose-400 border border-rose-900/50'
                  : 'bg-[#08080a] text-[#5e616e] border border-[#1c1d22]'
              }`}
            >
              {obPressure}
            </span>
          </div>
        </div>

        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[10px] p-4">
          <span className="text-[11px] text-[#5e616e] block mb-1 uppercase tracking-wider">Macro Sentiment</span>
          <div className="font-sans text-[16px] text-[#cc9166] capitalize">
            {macroSentiment?.fearAndGreed?.classification || 'Neutral'}
          </div>
        </div>

        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[10px] p-4">
          <span className="text-[11px] text-[#5e616e] block mb-1 uppercase tracking-wider">CVD Signal</span>
          <div className="font-sans text-[16px] text-[#e2e3e9]">
            {microstructure?.volumeDeltaCvd?.cvdSignal || 'Balanced'}
          </div>
        </div>
      </div>
    </div>
  );
};
