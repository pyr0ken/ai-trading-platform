'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  SlidersHorizontal,
  Eye,
  EyeOff,
  BrainCircuit,
  CandlestickChart,
  Grid,
  Check,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import {
  DashboardLayoutConfig,
  LayoutPreset,
  LAYOUT_PRESETS,
  WidgetId,
} from '@/types/layout';

interface DashboardLayoutToolbarProps {
  config: DashboardLayoutConfig;
  onChangeConfig: (newConfig: DashboardLayoutConfig) => void;
  onOpenSearch?: () => void;
  isStreaming?: boolean;
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

export const DashboardLayoutToolbar: React.FC<DashboardLayoutToolbarProps> = ({
  config,
  onChangeConfig,
}) => {
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowWidgetMenu(false);
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPreset = (presetKey: LayoutPreset) => {
    const presetInfo = LAYOUT_PRESETS[presetKey];
    onChangeConfig({
      ...config,
      ...presetInfo.config,
      preset: presetKey,
    });
  };

  const handleToggleWidget = (widgetId: WidgetId) => {
    onChangeConfig({
      ...config,
      visibleWidgets: {
        ...config.visibleWidgets,
        [widgetId]: !config.visibleWidgets[widgetId],
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
      ref={toolbarRef}
      className="bg-[#040406]/95 backdrop-blur-md border border-[#1c1d22] rounded-[10px] p-2 text-[#e2e3e9] flex flex-wrap items-center justify-between gap-3 shadow-lg select-none relative z-30"
    >
      {/* Left: View Presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#5e616e] hidden sm:inline-block px-1">
          Preset:
        </span>
        <div className="flex items-center gap-1 bg-[#121317] border border-[#1c1d22] p-1 rounded-[8px]">
          {(Object.keys(LAYOUT_PRESETS) as LayoutPreset[]).map((key) => {
            const preset = LAYOUT_PRESETS[key];
            const isSelected = config.preset === key;
            const Icon = getPresetIcon(key);

            return (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-[6px] transition-all cursor-pointer font-sans font-medium ${
                  isSelected
                    ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/50 shadow-sm font-semibold'
                    : 'text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#1c1d22]/50'
                }`}
                title={preset.description}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#cc9166]' : 'text-[#5e616e]'}`} />
                <span>{preset.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Controls: Widgets Dropdown, Settings */}
      <div className="flex items-center gap-2">
        {/* Customize Widgets Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowWidgetMenu(!showWidgetMenu);
              setShowSettingsMenu(false);
            }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[8px] border transition-all cursor-pointer font-sans ${
              showWidgetMenu
                ? 'bg-[#1c1d22] border-[#cc9166] text-[#cc9166]'
                : 'bg-[#121317] border-[#1c1d22] text-[#9194a1] hover:text-[#e2e3e9] hover:border-[#777a88]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Widgets</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {showWidgetMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-[#040406] border border-[#1c1d22] rounded-[10px] shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#1c1d22] text-[10px] font-mono uppercase tracking-wider text-[#5e616e]">
                <span>Visible Panels</span>
                <button
                  onClick={handleResetLayout}
                  className="text-[#cc9166] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Reset
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto custom-scrollbar p-1 space-y-1">
                {(Object.keys(WIDGET_LABELS) as WidgetId[]).map((wId) => {
                  const isVisible = config.visibleWidgets[wId] !== false;
                  const item = WIDGET_LABELS[wId];

                  return (
                    <button
                      key={wId}
                      onClick={() => handleToggleWidget(wId)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs transition-colors cursor-pointer text-left ${
                        isVisible
                          ? 'bg-[#121317] text-[#e2e3e9]'
                          : 'text-[#5e616e] hover:bg-[#121317]/50'
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

        {/* Layout Settings Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowSettingsMenu(!showSettingsMenu);
              setShowWidgetMenu(false);
            }}
            className={`p-1.5 rounded-[8px] border transition-all cursor-pointer ${
              showSettingsMenu
                ? 'bg-[#1c1d22] border-[#cc9166] text-[#cc9166]'
                : 'bg-[#121317] border-[#1c1d22] text-[#9194a1] hover:text-[#e2e3e9] hover:border-[#777a88]'
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

              {/* AI Card Position */}
              <div className="space-y-1">
                <span className="text-[#9194a1] text-[11px]">AI Report Column</span>
                <div className="grid grid-cols-2 gap-1 bg-[#121317] p-1 rounded-[6px]">
                  <button
                    onClick={() =>
                      onChangeConfig({ ...config, aiCardPosition: 'right' })
                    }
                    className={`py-1 text-[10px] rounded font-medium transition-all ${
                      config.aiCardPosition === 'right'
                        ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/40'
                        : 'text-[#5e616e] hover:text-[#e2e3e9]'
                    }`}
                  >
                    Side Column
                  </button>
                  <button
                    onClick={() =>
                      onChangeConfig({ ...config, aiCardPosition: 'bottom' })
                    }
                    className={`py-1 text-[10px] rounded font-medium transition-all ${
                      config.aiCardPosition === 'bottom'
                        ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/40'
                        : 'text-[#5e616e] hover:text-[#e2e3e9]'
                    }`}
                  >
                    Full Width
                  </button>
                </div>
              </div>

              {/* Density */}
              <div className="space-y-1">
                <span className="text-[#9194a1] text-[11px]">Grid Density</span>
                <div className="grid grid-cols-2 gap-1 bg-[#121317] p-1 rounded-[6px]">
                  <button
                    onClick={() =>
                      onChangeConfig({ ...config, density: 'comfortable' })
                    }
                    className={`py-1 text-[10px] rounded font-medium transition-all ${
                      config.density === 'comfortable'
                        ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/40'
                        : 'text-[#5e616e] hover:text-[#e2e3e9]'
                    }`}
                  >
                    Comfortable
                  </button>
                  <button
                    onClick={() =>
                      onChangeConfig({ ...config, density: 'compact' })
                    }
                    className={`py-1 text-[10px] rounded font-medium transition-all ${
                      config.density === 'compact'
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
      </div>
    </div>
  );
};
