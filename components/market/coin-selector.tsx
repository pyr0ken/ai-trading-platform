'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  Sparkles,
  XCircle,
  Flame,
  Zap,
  LayoutDashboard,
  CandlestickChart,
  BrainCircuit,
  Grid,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Check,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { WatchlistManager } from '@/components/market/watchlist-manager';
import { CoinIcon } from '@/components/common/coin-icon';
import { AnalysisReplayModal } from '@/components/terminal/analysis-replay-modal';
import { StoredAnalysisRecord } from '@/lib/storage/app-db';
import {
  DashboardLayoutConfig,
  LayoutPreset,
  LAYOUT_PRESETS,
  WidgetId,
} from '@/types/layout';

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
  layoutConfig?: DashboardLayoutConfig;
  onChangeLayoutConfig?: (config: DashboardLayoutConfig) => void;
  onOpenSearch?: () => void;
}

const WIDGET_LABELS: Record<WidgetId, { label: string; group: string }> = {
  preflight: { label: 'Preflight Market Facts', group: 'Overview' },
  chart: { label: 'TradingView Chart Engine', group: 'Charts' },
  matrix: { label: 'Multi-Timeframe Matrix', group: 'Technical' },
  radar: { label: 'Technical Score Radar', group: 'Technical' },
  meter_scenarios: { label: 'Buy/Sell Meter & Scenarios', group: 'Signals' },
  stats: { label: 'Market Stats & Derivatives', group: 'Overview' },
  indicators_news: { label: 'Technical Indicator Table', group: 'Technical' },
  history: { label: 'Historical Audit Signal Table', group: 'Signals' },
  ai_card: { label: 'AI Quant Intelligence Card', group: 'AI' },
};

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
  layoutConfig,
  onChangeLayoutConfig,
  onOpenSearch,
}) => {
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const topBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (topBarRef.current && !topBarRef.current.contains(e.target as Node)) {
        setShowWidgetMenu(false);
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exchanges = [
    { id: 'kucoin', name: 'KuCoin' },
    { id: 'binance', name: 'Binance' },
    { id: 'bybit', name: 'Bybit' },
    { id: 'okx', name: 'OKX' },
  ];

  const timeframes = ['5m', '15m', '1h', '4h', '1D'];

  const handleSelectPreset = (presetKey: LayoutPreset) => {
    if (!layoutConfig || !onChangeLayoutConfig) return;
    const presetInfo = LAYOUT_PRESETS[presetKey];
    onChangeLayoutConfig({
      ...layoutConfig,
      ...presetInfo.config,
      preset: presetKey,
    });
  };

  const handleToggleWidget = (widgetId: WidgetId) => {
    if (!layoutConfig || !onChangeLayoutConfig) return;
    onChangeLayoutConfig({
      ...layoutConfig,
      visibleWidgets: {
        ...layoutConfig.visibleWidgets,
        [widgetId]: !layoutConfig.visibleWidgets[widgetId],
      },
    });
  };

  const handleResetLayout = () => {
    handleSelectPreset('standard');
    setShowSettingsMenu(false);
    setShowWidgetMenu(false);
  };

  const getPresetIcon = (preset: LayoutPreset) => {
    switch (preset) {
      case 'standard':
        return LayoutDashboard;
      case 'pro_trader':
        return CandlestickChart;
      case 'ai_quant':
        return BrainCircuit;
      case 'compact':
        return Grid;
      default:
        return LayoutDashboard;
    }
  };

  return (
    <div
      ref={topBarRef}
      className="bg-[#040406]/95 backdrop-blur-md border border-[#1c1d22] rounded-[10px] p-2 text-[#e2e3e9] shadow-xl flex flex-wrap items-center justify-between gap-2.5 select-none relative z-30"
    >
      {/* Left: Search Symbol · Venue · Timeframe · Horizon Mode */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Symbol Quick Search Trigger */}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] hover:border-[#cc9166]/50 px-2.5 py-1 rounded-[6px] text-xs transition-all cursor-pointer group"
            title="Search 1,000+ Crypto & Forex pairs (Press / or Ctrl+K)"
          >
            <CoinIcon symbol={selectedSymbol} size={18} className="group-hover:scale-110 transition-transform" />
            <span className="font-mono font-bold text-xs text-[#ffffff]">{selectedSymbol}</span>
            <kbd className="text-[9px] font-mono text-[#5e616e] bg-[#08080a] border border-[#1c1d22] px-1 py-0.2 rounded font-normal ml-0.5">
              /
            </kbd>
          </button>
        )}

        {/* Exchange Selector */}
        <div className="flex items-center gap-0.5 bg-[#121317] border border-[#1c1d22] p-0.5 rounded-[6px]">
          {exchanges.map((ex) => {
            const isSelected = selectedExchange === ex.id;
            return (
              <button
                key={ex.id}
                onClick={() => onExchangeChange(ex.id)}
                className={`text-[11px] px-2 py-0.5 rounded-[4px] transition-all cursor-pointer font-mono ${
                  isSelected
                    ? 'bg-[#1c1d22] text-[#e2e3e9] border border-[#777a88]/60 font-bold'
                    : 'text-[#5e616e] hover:text-[#e2e3e9]'
                }`}
              >
                {ex.name}
              </button>
            );
          })}
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-0.5 bg-[#121317] border border-[#1c1d22] p-0.5 rounded-[6px]">
          {timeframes.map((tf) => {
            const isSelected = selectedTimeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`text-[11px] px-1.5 py-0.5 rounded-[4px] transition-all cursor-pointer font-mono ${
                  isSelected
                    ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/60 font-bold'
                    : 'text-[#5e616e] hover:text-[#e2e3e9]'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>

        {/* Strategy Horizon Mode */}
        <div className="flex items-center gap-0.5 bg-[#121317] border border-[#1c1d22] p-0.5 rounded-[6px]">
          <button
            onClick={() => onModeChange('scalp')}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[4px] transition-all cursor-pointer font-mono ${
              analysisMode === 'scalp'
                ? 'bg-rose-950/70 text-rose-300 border border-rose-500/50 font-bold'
                : 'text-[#5e616e] hover:text-rose-400'
            }`}
          >
            <Zap className="w-3 h-3 text-rose-400" />
            <span>Scalp</span>
          </button>
          <button
            onClick={() => onModeChange('swing')}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[4px] transition-all cursor-pointer font-mono ${
              analysisMode === 'swing'
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/50 font-bold'
                : 'text-[#5e616e] hover:text-emerald-400'
            }`}
          >
            <Flame className="w-3 h-3 text-emerald-400" />
            <span>Swing</span>
          </button>
        </div>
      </div>

      {/* Center: Minimal Layout Preset Switcher */}
      {layoutConfig && onChangeLayoutConfig && (
        <div className="hidden lg:flex items-center gap-0.5 bg-[#121317] border border-[#1c1d22] p-0.5 rounded-[6px]">
          {(Object.keys(LAYOUT_PRESETS) as LayoutPreset[]).map((key) => {
            const preset = LAYOUT_PRESETS[key];
            const isSelected = layoutConfig.preset === key;
            const Icon = getPresetIcon(key);

            return (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[4px] transition-all cursor-pointer font-sans font-medium ${
                  isSelected
                    ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/50 font-semibold'
                    : 'text-[#5e616e] hover:text-[#e2e3e9]'
                }`}
                title={preset.description}
              >
                <Icon className={`w-3 h-3 ${isSelected ? 'text-[#cc9166]' : 'text-[#5e616e]'}`} />
                <span>{preset.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Right: Widgets Dropdown · Settings · Watchlist · Replay · Run CTA */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Widgets Dropdown */}
        {layoutConfig && onChangeLayoutConfig && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowWidgetMenu(!showWidgetMenu);
                setShowSettingsMenu(false);
              }}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-[6px] border transition-all cursor-pointer font-sans ${
                showWidgetMenu
                  ? 'bg-[#1c1d22] border-[#cc9166] text-[#cc9166]'
                  : 'bg-[#121317] border-[#1c1d22] text-[#9194a1] hover:text-[#e2e3e9]'
              }`}
              title="Toggle Visible Panels"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Panels</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showWidgetMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-[#040406] border border-[#1c1d22] rounded-[10px] shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#1c1d22] text-[10px] font-mono uppercase tracking-wider text-[#5e616e]">
                  <span>Visible Workstation Panels</span>
                  <button
                    onClick={handleResetLayout}
                    className="text-[#cc9166] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Reset
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto custom-scrollbar p-1 space-y-1">
                  {(Object.keys(WIDGET_LABELS) as WidgetId[]).map((wId) => {
                    const isVisible = layoutConfig.visibleWidgets[wId] !== false;
                    const item = WIDGET_LABELS[wId];

                    return (
                      <button
                        key={wId}
                        onClick={() => handleToggleWidget(wId)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs transition-colors cursor-pointer text-left ${
                          isVisible ? 'bg-[#121317] text-[#e2e3e9]' : 'text-[#5e616e] hover:bg-[#121317]/50'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {isVisible ? (
                          <Check className="w-3.5 h-3.5 text-[#cc9166] shrink-0 ml-2" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-[#5e616e] shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Layout Settings Icon */}
        {layoutConfig && onChangeLayoutConfig && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowSettingsMenu(!showSettingsMenu);
                setShowWidgetMenu(false);
              }}
              className={`p-1.5 rounded-[6px] border transition-all cursor-pointer ${
                showSettingsMenu
                  ? 'bg-[#1c1d22] border-[#cc9166] text-[#cc9166]'
                  : 'bg-[#121317] border-[#1c1d22] text-[#9194a1] hover:text-[#e2e3e9]'
              }`}
              title="Dashboard Options & Density"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#040406] border border-[#1c1d22] rounded-[10px] shadow-2xl p-3 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#5e616e] pb-1 border-b border-[#1c1d22]">
                  Layout Preferences
                </div>

                <div className="space-y-1">
                  <span className="text-[#9194a1] text-[11px]">AI Report Column</span>
                  <div className="grid grid-cols-2 gap-1 bg-[#121317] p-1 rounded-[6px]">
                    <button
                      onClick={() => onChangeLayoutConfig({ ...layoutConfig, aiCardPosition: 'right' })}
                      className={`py-1 text-[10px] rounded font-medium transition-all ${
                        layoutConfig.aiCardPosition === 'right'
                          ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/40'
                          : 'text-[#5e616e] hover:text-[#e2e3e9]'
                      }`}
                    >
                      Side Column
                    </button>
                    <button
                      onClick={() => onChangeLayoutConfig({ ...layoutConfig, aiCardPosition: 'bottom' })}
                      className={`py-1 text-[10px] rounded font-medium transition-all ${
                        layoutConfig.aiCardPosition === 'bottom'
                          ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/40'
                          : 'text-[#5e616e] hover:text-[#e2e3e9]'
                      }`}
                    >
                      Full Width
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[#9194a1] text-[11px]">Grid Density</span>
                  <div className="grid grid-cols-2 gap-1 bg-[#121317] p-1 rounded-[6px]">
                    <button
                      onClick={() => onChangeLayoutConfig({ ...layoutConfig, density: 'comfortable' })}
                      className={`py-1 text-[10px] rounded font-medium transition-all ${
                        layoutConfig.density === 'comfortable'
                          ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/40'
                          : 'text-[#5e616e] hover:text-[#e2e3e9]'
                      }`}
                    >
                      Comfortable
                    </button>
                    <button
                      onClick={() => onChangeLayoutConfig({ ...layoutConfig, density: 'compact' })}
                      className={`py-1 text-[10px] rounded font-medium transition-all ${
                        layoutConfig.density === 'compact'
                          ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/40'
                          : 'text-[#5e616e] hover:text-[#e2e3e9]'
                      }`}
                    >
                      Compact
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1c1d22] flex justify-between">
                  <button
                    onClick={handleResetLayout}
                    className="text-[10px] text-[#cc9166] hover:underline flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Reset Defaults
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <AnalysisReplayModal onReplayAnalysis={onReplayAnalysis} />

        {/* Run AI Quant CTA */}
        <button
          onClick={onRunAnalysis}
          disabled={isRunning}
          className={`flex items-center gap-1.5 px-3.5 py-1 rounded-[9999px] text-xs font-semibold transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0 ${
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-[9999px] bg-red-950/80 text-red-300 border border-red-500/40 text-xs font-semibold hover:bg-red-900 transition-colors cursor-pointer shrink-0"
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
