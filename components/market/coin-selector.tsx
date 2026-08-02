'use client';

import React from 'react';
import { RotateCw, Sparkles, XCircle, Flame, Zap } from 'lucide-react';
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
    { id: 'kucoin', name: 'KuCoin' },
    { id: 'binance', name: 'Binance' },
    { id: 'bybit', name: 'Bybit' },
    { id: 'okx', name: 'OKX' },
  ];

  const timeframes = ['5m', '15m', '1h', '4h', '1D'];

  return (
    <div className="bg-[#040406]/90 backdrop-blur-md border border-[#1c1d22] rounded-[10px] p-2.5 text-[#e2e3e9] shadow-xl flex flex-wrap items-center justify-between gap-3 select-none">
      {/* Left: Exchange · Timeframe · Horizon Mode */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Exchange Selector */}
        <div className="flex items-center gap-1 bg-[#121317] border border-[#1c1d22] p-1 rounded-[8px]">
          <span className="text-[10px] font-mono uppercase text-[#5e616e] px-1.5 hidden sm:inline">
            Venue:
          </span>
          {exchanges.map((ex) => {
            const isSelected = selectedExchange === ex.id;
            return (
              <button
                key={ex.id}
                onClick={() => onExchangeChange(ex.id)}
                className={`text-[11px] px-2.5 py-0.5 rounded-[6px] transition-all cursor-pointer font-mono font-medium ${
                  isSelected
                    ? 'bg-[#1c1d22] text-[#e2e3e9] border border-[#777a88] font-bold'
                    : 'text-[#5e616e] hover:text-[#e2e3e9]'
                }`}
              >
                {ex.name}
              </button>
            );
          })}
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-[#121317] border border-[#1c1d22] p-1 rounded-[8px]">
          <span className="text-[10px] font-mono uppercase text-[#5e616e] px-1.5 hidden sm:inline">
            TF:
          </span>
          {timeframes.map((tf) => {
            const isSelected = selectedTimeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`text-[11px] px-2 py-0.5 rounded-[6px] transition-all cursor-pointer font-mono font-medium ${
                  isSelected
                    ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166] font-bold'
                    : 'text-[#5e616e] hover:text-[#e2e3e9]'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>

        {/* Strategy Horizon Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#121317] border border-[#1c1d22] p-1 rounded-[8px]">
          <button
            onClick={() => onModeChange('scalp')}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[6px] transition-all cursor-pointer font-mono font-medium ${
              analysisMode === 'scalp'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-500/50 font-bold'
                : 'text-[#5e616e] hover:text-rose-400'
            }`}
          >
            <Zap className="w-3 h-3 text-rose-400" />
            <span>Scalp</span>
          </button>
          <button
            onClick={() => onModeChange('swing')}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[6px] transition-all cursor-pointer font-mono font-medium ${
              analysisMode === 'swing'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/50 font-bold'
                : 'text-[#5e616e] hover:text-emerald-400'
            }`}
          >
            <Flame className="w-3 h-3 text-emerald-400" />
            <span>Swing</span>
          </button>
        </div>
      </div>

      {/* Right: Watchlist Manager · Analysis Replay · Run CTA */}
      <div className="flex items-center gap-2 shrink-0">
        <WatchlistManager
          onSelectCoin={onSymbolChange}
          selectedSymbol={selectedSymbol}
          openExternal={watchlistOpen}
          onOpened={onWatchlistOpened}
        />
        <AnalysisReplayModal onReplayAnalysis={onReplayAnalysis} />

        {/* Run AI Quant CTA */}
        <button
          onClick={onRunAnalysis}
          disabled={isRunning}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-[9999px] text-xs font-semibold transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0 ${
            isRunning
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
              : 'bg-gradient-to-r from-[#cc9166] via-[#ae9357] to-[#cc9166] text-[#08080a] hover:brightness-110 active:scale-95 hover:shadow-[0_0_15px_rgba(204,145,102,0.4)]'
          }`}
        >
          {isRunning ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span className="font-mono">Processing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 fill-[#08080a]" />
              <span className="tracking-wide">Run AI Quant</span>
            </>
          )}
        </button>

        {/* Stop Button */}
        {isRunning && onStopAnalysis && (
          <button
            onClick={onStopAnalysis}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[9999px] bg-rose-950/80 text-rose-300 border border-rose-500/40 text-xs font-semibold hover:bg-rose-900 transition-colors cursor-pointer shrink-0"
            title="Cancel execution"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Stop</span>
          </button>
        )}
      </div>
    </div>
  );
};
