'use client';

import React from 'react';
import { RotateCw, Globe2, Clock, Sparkles, XCircle } from 'lucide-react';
import { WatchlistManager } from '@/components/market/watchlist-manager';
import { AnalysisReplayModal } from '@/components/terminal/analysis-replay-modal';
import { StoredAnalysisRecord } from '@/lib/storage/app-db';

interface CoinSelectorProps {
  selectedSymbol: string;
  selectedExchange: string;
  selectedTimeframe: string;
  analysisMode: 'scalp' | 'swing';
  onModeChange: (mode: 'scalp' | 'swing') => void;
  onSymbolChange: (symbol: string) => void;
  onExchangeChange: (exchange: string) => void;
  onTimeframeChange: (timeframe: string) => void;
  onRunAnalysis: () => void;
  onStopAnalysis?: () => void;
  isRunning: boolean;
  onReplayAnalysis?: (record: StoredAnalysisRecord) => void;
  watchlistOpen?: boolean;
  onWatchlistOpened?: () => void;
}

export const CoinSelector: React.FC<CoinSelectorProps> = ({
  selectedSymbol,
  selectedExchange,
  selectedTimeframe,
  analysisMode,
  onModeChange,
  onSymbolChange,
  onExchangeChange,
  onTimeframeChange,
  onRunAnalysis,
  onStopAnalysis = () => {},
  isRunning,
  onReplayAnalysis = () => {},
  watchlistOpen,
  onWatchlistOpened,
}) => {
  const exchanges = [
    { id: 'kucoin', name: 'KC' },
    { id: 'binance', name: 'BN' },
    { id: 'bybit', name: 'BB' },
    { id: 'okx', name: 'OK' },
  ];

  const timeframes = ['5m', '15m', '1h', '4h', '1D'];

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-3 text-[#e2e3e9]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Venue · Timeframe · Mode */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Venue — mini pill group */}
          <div className="flex items-center gap-1 bg-[#121317] border border-[#1c1d22] px-1.5 py-1 rounded-[9999px]">
            <div className="flex items-center gap-1">
              {exchanges.map((ex) => {
                const isSelected = selectedExchange === ex.id;
                return (
                  <button
                    key={ex.id}
                    onClick={() => onExchangeChange(ex.id)}
                    className={`text-[10px] px-2 py-0.5 rounded-[9999px] transition-all cursor-pointer font-mono font-medium ${
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

          {/* Separator dot */}
          <span className="text-[#2e3038] text-xs select-none">·</span>

          {/* Timeframe — mini pill group */}
          <div className="flex items-center gap-1 bg-[#121317] border border-[#1c1d22] px-1.5 py-1 rounded-[9999px]">
            {timeframes.map((tf) => {
              const isSelected = selectedTimeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange(tf)}
                  className={`text-[10px] px-2 py-0.5 rounded-[9999px] transition-all cursor-pointer font-mono font-medium ${
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

          {/* Separator dot */}
          <span className="text-[#2e3038] text-xs select-none">·</span>

          {/* Mode — mini pill group */}
          <div className="flex items-center gap-1 bg-[#121317] border border-[#1c1d22] px-1.5 py-1 rounded-[9999px]">
            <button
              onClick={() => onModeChange('scalp')}
              className={`text-[10px] px-2 py-0.5 rounded-[9999px] transition-all cursor-pointer font-mono font-medium ${
                analysisMode === 'scalp'
                  ? 'bg-[#1c1d22] text-rose-400 border border-rose-500'
                  : 'text-[#5e616e] hover:text-rose-400'
              }`}
            >
              Scalp
            </button>
            <button
              onClick={() => onModeChange('swing')}
              className={`text-[10px] px-2 py-0.5 rounded-[9999px] transition-all cursor-pointer font-mono font-medium ${
                analysisMode === 'swing'
                  ? 'bg-[#1c1d22] text-emerald-400 border border-emerald-500'
                  : 'text-[#5e616e] hover:text-emerald-400'
              }`}
            >
              Swing
            </button>
          </div>
        </div>

        {/* Right: Watchlist · Replay · Run / Stop */}
        <div className="flex flex-wrap items-center gap-1.5">
          <WatchlistManager onSelectCoin={onSymbolChange} selectedSymbol={selectedSymbol} openExternal={watchlistOpen} onOpened={onWatchlistOpened} />
          <AnalysisReplayModal onReplayAnalysis={onReplayAnalysis} />

          {/* Run Analysis Button */}
          <button
            onClick={onRunAnalysis}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9999px] bg-[#ffffff] text-[#08080a] text-xs font-semibold hover:bg-[#e2e3e9] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isRunning ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run</span>
              </>
            )}
          </button>

          {/* Stop Button */}
          {isRunning && onStopAnalysis && (
            <button
              onClick={onStopAnalysis}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9999px] bg-rose-600/90 text-white text-xs font-semibold hover:bg-rose-500 transition-colors cursor-pointer shrink-0"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
