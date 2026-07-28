'use client';

import React from 'react';
import { MarketTicker, DerivativesMetrics, MicrostructureMetrics, MacroSentiment } from '@/types/market';
import { TrendingUp, TrendingDown } from 'lucide-react';

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
  if (isLoading || !ticker) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] animate-pulse min-h-[140px]">
        <div className="h-5 w-48 bg-[#121317] rounded-full mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="h-16 bg-[#121317] rounded-[10px]" />
          <div className="h-16 bg-[#121317] rounded-[10px]" />
          <div className="h-16 bg-[#121317] rounded-[10px]" />
          <div className="h-16 bg-[#121317] rounded-[10px]" />
          <div className="h-16 bg-[#121317] rounded-[10px]" />
          <div className="h-16 bg-[#121317] rounded-[10px]" />
        </div>
      </div>
    );
  }

  const isPositive = ticker.change24hPercentage >= 0;
  const obPressure = microstructure?.orderBookDepth?.orderBookPressure || 'NEUTRAL';
  const cvdSignal = microstructure?.volumeDeltaCvd?.cvdSignal || 'BALANCED';

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
          <div className="font-ivy-presto text-[20px] text-[#ffffff]">
            ${ticker.price.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[10px] p-4">
          <span className="text-[11px] text-[#5e616e] block mb-1 uppercase tracking-wider">24h Change</span>
          <div
            className={`font-sans text-[16px] font-medium flex items-center gap-1 ${
              isPositive ? 'text-[#cc9166]' : 'text-red-400'
            }`}
          >
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isPositive ? '+' : ''}{ticker.change24hPercentage}%</span>
          </div>
        </div>

        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[10px] p-4">
          <span className="text-[11px] text-[#5e616e] block mb-1 uppercase tracking-wider">Funding Rate</span>
          <div className="font-sans text-[16px] text-[#e2e3e9]">
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
                  ? 'bg-[#121317] text-[#cc9166] border border-[#cc9166]'
                  : obPressure === 'SELL_PRESSURE'
                  ? 'bg-[#121317] text-red-400 border border-red-900/50'
                  : 'bg-[#08080a] text-[#5e616e] border border-[#1c1d22]'
              }`}
            >
              {obPressure}
            </span>
          </div>
        </div>

        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[10px] p-4">
          <span className="text-[11px] text-[#5e616e] block mb-1 uppercase tracking-wider">CVD Signal</span>
          <div className="text-[12px]">
            <span
              className={`px-2.5 py-1 rounded-[9999px] inline-block text-[11px] font-sans font-medium ${
                cvdSignal === 'NET_BUYING_CVD'
                  ? 'bg-[#121317] text-[#cc9166] border border-[#cc9166]'
                  : cvdSignal === 'NET_SELLING_CVD'
                  ? 'bg-[#121317] text-red-400 border border-red-900/50'
                  : 'bg-[#08080a] text-[#5e616e] border border-[#1c1d22]'
              }`}
            >
              {cvdSignal}
            </span>
          </div>
        </div>

        <div className="bg-[#08080a] border border-[#1c1d22] rounded-[10px] p-4">
          <span className="text-[11px] text-[#5e616e] block mb-1 uppercase tracking-wider">Fear & Greed</span>
          <div className="font-ivy-presto text-[20px] text-[#ffffff] flex items-center justify-between">
            <span>{macroSentiment?.fearAndGreed?.value ?? 50}</span>
            <span className="text-[10px] text-[#5e616e] font-sans uppercase">
              {macroSentiment?.fearAndGreed?.classification || 'Neutral'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
