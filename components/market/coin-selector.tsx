'use client';

import React, { useState, useEffect } from 'react';
import { RotateCw, Clock, Globe2, Sparkles, RefreshCw, Pin } from 'lucide-react';
import { WatchlistManager } from '@/components/market/watchlist-manager';
import { AnalysisReplayModal } from '@/components/terminal/analysis-replay-modal';
import { AppStorageEngine, WatchlistItem } from '@/lib/storage/app-db';
import { CoinIcon } from '@/components/common/coin-icon';

interface CoinSelectorProps {
  selectedSymbol: string;
  selectedExchange: string;
  selectedTimeframe: string;
  onSymbolChange: (symbol: string) => void;
  onExchangeChange: (exchange: string) => void;
  onTimeframeChange: (timeframe: string) => void;
  onRunAnalysis: () => void;
  isRunning: boolean;
  onReplayAnalysis?: (record: any) => void;
}

export const CoinSelector: React.FC<CoinSelectorProps> = ({
  selectedSymbol,
  selectedExchange,
  selectedTimeframe,
  onSymbolChange,
  onExchangeChange,
  onTimeframeChange,
  onRunAnalysis,
  isRunning,
  onReplayAnalysis = () => {},
}) => {
  const [pinnedCoins, setPinnedCoins] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    const list = AppStorageEngine.getWatchlist();
    const pinned = list.filter((item) => item.pinned);
    setPinnedCoins(pinned.length > 0 ? pinned : list.slice(0, 4));
  }, [selectedSymbol]);

  const exchanges = [
    { id: 'kucoin', name: 'KuCoin' },
    { id: 'binance', name: 'Binance' },
    { id: 'bybit', name: 'Bybit' },
    { id: 'okx', name: 'OKX' },
  ];

  const timeframes = ['5m', '15m', '1h', '4h', '1D'];

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-4 text-[#e2e3e9] space-y-4">
      {/* Top Row: Venue | Timeframe | Watchlist | Replay | Sync */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-[13px] border-b border-[#1c1d22] pb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Venue Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[#9194a1]">
              <Globe2 className="w-3.5 h-3.5" />
              <span>Venue:</span>
            </div>
            <div className="flex items-center gap-1 bg-[#121317] border border-[#1c1d22] p-1 rounded-[9999px]">
              {exchanges.map((ex) => {
                const isSelected = selectedExchange === ex.id;
                return (
                  <button
                    key={ex.id}
                    onClick={() => onExchangeChange(ex.id)}
                    className={`px-3 py-1 rounded-[9999px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1c1d22] text-[#e2e3e9] border border-[#777a88]'
                        : 'text-[#5e616e] hover:text-[#e2e3e9]'
                    }`}
                  >
                    {ex.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeframe Selector (Placed BETWEEN Venue and Watchlist!) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[#9194a1]">
              <Clock className="w-3.5 h-3.5" />
              <span>Timeframe:</span>
            </div>
            <div className="flex items-center gap-1 bg-[#121317] border border-[#1c1d22] p-1 rounded-[9999px]">
              {timeframes.map((tf) => {
                const isSelected = selectedTimeframe === tf;
                return (
                  <button
                    key={tf}
                    onClick={() => onTimeframeChange(tf)}
                    className={`px-3 py-1 rounded-[9999px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]'
                        : 'text-[#5e616e] hover:text-[#e2e3e9]'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Watchlist, Replay & Sync Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <WatchlistManager onSelectCoin={onSymbolChange} selectedSymbol={selectedSymbol} />
          <AnalysisReplayModal onReplayAnalysis={onReplayAnalysis} />

          <div className="hidden sm:flex items-center gap-2 bg-[#121317] border border-[#1c1d22] px-3 py-1.5 rounded-[9999px] text-[#5e616e]">
            <span>Feed: <strong className="text-[#e2e3e9]">{selectedExchange.toUpperCase()}</strong></span>
          </div>

          <button
            onClick={onRunAnalysis}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-[#e2e3e9] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Pinned Coins & Run Analysis Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1.5 text-[13px] text-[#9194a1] mr-1 hidden sm:flex shrink-0">
            <Pin className="w-3.5 h-3.5 text-[#cc9166]" />
            <span>Pinned:</span>
          </div>

          {pinnedCoins.length === 0 ? (
            <span className="text-[13px] text-[#5e616e] italic">
              No pinned coins. Pin coins in Watchlist to show here.
            </span>
          ) : (
            pinnedCoins.map((coin) => {
              const isSelected = selectedSymbol === coin.symbol;
              return (
                <button
                  key={coin.symbol}
                  onClick={() => onSymbolChange(coin.symbol)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[9999px] text-[13px] transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#121317] text-[#cc9166] border border-[#cc9166] font-medium'
                      : 'bg-[#08080a] text-[#e2e3e9] border border-[#1c1d22] hover:border-[#777a88]'
                  }`}
                >
                  <CoinIcon symbol={coin.symbol} size={18} />
                  <span>{coin.symbol}</span>
                </button>
              );
            })
          )}
        </div>

        <button
          onClick={onRunAnalysis}
          disabled={isRunning}
          className="bg-[#ffffff] text-[#08080a] text-[13px] font-sans font-medium py-2.5 px-6 rounded-[9999px] shrink-0 hover:bg-[#e2e3e9] transition-colors cursor-pointer disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin mr-2 inline" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2 inline" />
              <span>Run Analysis ({selectedSymbol})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
