'use client';

import React from 'react';
import { CoinSelector } from '@/components/market/coin-selector';
import { WidgetCard } from '@/components/dashboard/widget-card';
import { TabbedWidgetCard } from '@/components/dashboard/tabbed-widget-card';
import { PreflightFactsPanel } from '@/components/terminal/preflight-facts-panel';
import { TradingViewChart } from '@/components/tradingview/tradingview-chart';
import { SingleExecutionBox } from '@/components/terminal/single-execution-box';
import { MultiTimeframeMatrix } from '@/components/terminal/multi-timeframe-matrix';
import { TechnicalScoreRadar } from '@/components/terminal/technical-score-radar';
import { IndicatorTable } from '@/components/market/indicator-table';
import { DecisionZonesMapComponent } from '@/components/terminal/decision-zones-map';
import { ConvictionBreakdownComponent } from '@/components/terminal/conviction-breakdown';
import { BuySellMeter } from '@/components/terminal/buy-sell-meter';
import { ScenariosCard } from '@/components/terminal/scenarios-card';
import { HistorySignalTable } from '@/components/terminal/history-signal-table';
import { MarketStatsCard } from '@/components/market/market-stats-card';
import { PersianAnalysisCard as AnalysisCard } from '@/components/analysis/persian-analysis-card';
import { DashboardLayoutConfig, WidgetId } from '@/types/layout';
import { StoredAnalysisRecord } from '@/lib/storage/app-db';
import { StructuredLLMOutput } from '@/types/terminal';
import { BarChart2, Gauge, Table, Compass, GitBranch, History } from 'lucide-react';

interface TradingIntelligenceTerminalProps {
  selectedSymbol: string;
  selectedExchange: string;
  selectedTimeframe: string;
  analysisMode: 'scalp' | 'swing';
  setAnalysisMode: (mode: 'scalp' | 'swing') => void;
  handleSymbolChange: (newSymbol: string, newExchange?: string) => void;
  handleExchangeChange: (newExchange: string) => void;
  handleTimeframeChange: (newTf: string) => void;
  handleRunAnalysis: () => void;
  stopAnalysis: () => void;
  isMarketLoading: boolean;
  isMarketFetching: boolean;
  isStreaming: boolean;
  handleReplayAnalysis: (record: StoredAnalysisRecord) => void;
  watchlistOpen: boolean;
  setWatchlistOpen: (open: boolean) => void;
  layoutConfig: DashboardLayoutConfig;
  setLayoutConfig: React.Dispatch<React.SetStateAction<DashboardLayoutConfig>>;
  setIsSearchOpen: (open: boolean) => void;
  marketError: any;
  analysisError: any;
  marketContext: any;
  liveTicker: any;
  parsedJson: StructuredLLMOutput | null;
  analysisText: string;
  isAnalysisLoading: boolean;
  logSteps: any[];
  currentTfData: any;
  hasRun: boolean;
}

export const TradingIntelligenceTerminal: React.FC<TradingIntelligenceTerminalProps> = ({
  selectedSymbol,
  selectedExchange,
  selectedTimeframe,
  analysisMode,
  setAnalysisMode,
  handleSymbolChange,
  handleExchangeChange,
  handleTimeframeChange,
  handleRunAnalysis,
  stopAnalysis,
  isMarketLoading,
  isMarketFetching,
  isStreaming,
  handleReplayAnalysis,
  watchlistOpen,
  setWatchlistOpen,
  layoutConfig,
  setLayoutConfig,
  setIsSearchOpen,
  marketError,
  analysisError,
  marketContext,
  liveTicker,
  parsedJson,
  analysisText,
  isAnalysisLoading,
  logSteps,
  currentTfData,
  hasRun,
}) => {
  const handleHideWidget = (id: WidgetId) => {
    setLayoutConfig((prev) => ({
      ...prev,
      visibleWidgets: {
        ...prev.visibleWidgets,
        [id]: false,
      },
    }));
  };

  const isVisible = (wId: WidgetId) => layoutConfig.visibleWidgets[wId] !== false;

  return (
    <div className="space-y-4" suppressHydrationWarning>
      {/* Workstation Header Bar */}
      <div className="space-y-3">
        <CoinSelector
          selectedSymbol={selectedSymbol}
          selectedExchange={selectedExchange}
          selectedTimeframe={selectedTimeframe}
          analysisMode={analysisMode}
          onModeChange={setAnalysisMode}
          onSymbolChange={handleSymbolChange}
          onExchangeChange={handleExchangeChange}
          onTimeframeChange={handleTimeframeChange}
          onRunAnalysis={handleRunAnalysis}
          onStopAnalysis={stopAnalysis}
          isRunning={isMarketLoading || isMarketFetching || isStreaming}
          onReplayAnalysis={handleReplayAnalysis}
          watchlistOpen={watchlistOpen}
          onWatchlistOpened={() => setWatchlistOpen(false)}
          layoutConfig={layoutConfig}
          onChangeLayoutConfig={setLayoutConfig}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      </div>

      {/* Error Banners */}
      {marketError && (
        <div className="bg-rose-955 border border-rose-500/50 p-3 rounded-[2px] text-rose-400 font-sans text-xs flex flex-col gap-1 shadow-lg">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px]">
            <span>⚠️</span> Data Engine Failure
          </div>
          <div className="leading-relaxed">
            {marketError instanceof Error ? marketError.message : String(marketError)}
          </div>
        </div>
      )}

      {analysisError && (
        <div className="bg-rose-955 border border-rose-500/50 p-3 rounded-[2px] text-rose-400 font-sans text-xs flex flex-col gap-1 shadow-lg">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px]">
            <span>⚠️</span> Analysis System Failure
          </div>
          <div className="leading-relaxed">{analysisError}</div>
        </div>
      )}

      {/* MINIMAL & REFINED DASHBOARD LAYOUT SYSTEM */}
      {/* 1. STANDARD & PRO TRADER LAYOUTS (Main Workstation + AI Right Panel) */}
      {(layoutConfig.preset === 'standard' || layoutConfig.preset === 'pro_trader') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start" suppressHydrationWarning>
          {/* Main Technical Panels Column */}
          <div className="lg:col-span-8 space-y-4">
            {isVisible('preflight') && (
              <WidgetCard id="preflight" onHideWidget={handleHideWidget} noPadding>
                <PreflightFactsPanel
                  marketContext={marketContext}
                  isLoading={isMarketLoading || isMarketFetching}
                />
              </WidgetCard>
            )}

            {isVisible('chart') && (
              <div className="space-y-4">
                <WidgetCard id="chart" onHideWidget={handleHideWidget} noPadding>
                  <TradingViewChart
                    symbol={selectedSymbol}
                    exchange={selectedExchange}
                    timeframe={selectedTimeframe}
                    currentPrice={liveTicker?.price ?? marketContext?.ticker?.price}
                    onTimeframeChange={handleTimeframeChange}
                    setup={
                      parsedJson?.trade_setup ||
                      (marketContext?.ticker?.price
                        ? {
                            position: 'NEUTRAL',
                            entry_range: [marketContext.ticker.price, marketContext.ticker.price],
                            stop_loss: marketContext.ticker.price,
                            take_profit_1: marketContext.ticker.price,
                            take_profit_2: marketContext.ticker.price,
                            take_profit_3: marketContext.ticker.price,
                            risk_reward_ratio: 0,
                            recommended_leverage: '1x',
                            invalidation_point: 0,
                            strategy_name: 'Analyzing...',
                          }
                        : null)
                    }
                  />
                </WidgetCard>

                <SingleExecutionBox
                  setup={parsedJson?.trade_setup}
                  signal={parsedJson?.signal}
                  confidence={parsedJson?.confidence}
                  marketContext={marketContext}
                  isLoading={isStreaming}
                />
              </div>
            )}

            {isVisible('matrix') && (
              <TabbedWidgetCard
                tabs={[
                  {
                    id: 'matrix',
                    label: 'Timeframe Matrix',
                    icon: BarChart2,
                    content: <MultiTimeframeMatrix marketContext={marketContext} isLoading={isMarketLoading} />,
                  },
                  {
                    id: 'radar',
                    label: 'Technical Radar',
                    icon: Gauge,
                    content: <TechnicalScoreRadar scores={parsedJson?.scores} isLoading={isStreaming} />,
                  },
                  {
                    id: 'indicators',
                    label: 'Indicator Table',
                    icon: Table,
                    content: <IndicatorTable timeframeData={currentTfData} isLoading={isMarketLoading} />,
                  },
                ]}
              />
            )}

            {isVisible('meter_scenarios') && (
              <TabbedWidgetCard
                tabs={[
                  {
                    id: 'meter_zones',
                    label: 'Buy/Sell Meter & Decision Zones',
                    icon: Compass,
                    content: (
                      <div className="p-3 space-y-4">
                        <DecisionZonesMapComponent map={marketContext?.decisionZones} />
                        <ConvictionBreakdownComponent score={parsedJson?.conviction} />
                        <BuySellMeter
                          buyPct={parsedJson?.probabilities?.bullish}
                          sellPct={parsedJson?.probabilities?.bearish}
                          microstructure={marketContext?.microstructure}
                          isLoading={isStreaming}
                        />
                      </div>
                    ),
                  },
                  {
                    id: 'scenarios',
                    label: 'Price Scenarios',
                    icon: GitBranch,
                    content: (
                      <div className="p-3">
                        <ScenariosCard scenarios={parsedJson?.scenarios} isLoading={isStreaming} />
                      </div>
                    ),
                  },
                  {
                    id: 'history_stats',
                    label: 'Signal History & Market Stats',
                    icon: History,
                    content: (
                      <div className="space-y-4">
                        <HistorySignalTable onSelectRecord={handleReplayAnalysis} />
                        <MarketStatsCard
                          ticker={marketContext?.ticker}
                          derivatives={marketContext?.derivatives}
                          microstructure={marketContext?.microstructure}
                          macroSentiment={marketContext?.macroSentiment}
                          isLoading={isMarketLoading}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </div>

          {/* AI Intelligence Side Panel */}
          {isVisible('ai_card') && (
            <div className="lg:col-span-4 sticky top-0 space-y-4">
              <AnalysisCard
                content={analysisText}
                isStreaming={isStreaming}
                isLoading={isMarketLoading || isAnalysisLoading}
                symbol={selectedSymbol}
                exchange={selectedExchange}
                timeframe={selectedTimeframe}
                analysisMode={analysisMode}
                error={analysisError}
                logSteps={logSteps}
                hasRun={hasRun}
                onRunAnalysis={handleRunAnalysis}
              />
            </div>
          )}
        </div>
      )}

      {/* 2. AI QUANT FOCUS LAYOUT (50/50 Balanced Split View) */}
      {layoutConfig.preset === 'ai_quant' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 6 Columns: Deep AI Quant Report Card */}
          {isVisible('ai_card') && (
            <div className="lg:col-span-6 space-y-6">
              <AnalysisCard
                content={analysisText}
                isStreaming={isStreaming}
                isLoading={isMarketLoading || isAnalysisLoading}
                symbol={selectedSymbol}
                exchange={selectedExchange}
                timeframe={selectedTimeframe}
                analysisMode={analysisMode}
                error={analysisError}
                logSteps={logSteps}
                hasRun={hasRun}
                onRunAnalysis={handleRunAnalysis}
              />
            </div>
          )}

          {/* Right 6 Columns: Radar + Scenarios + Preflight + Chart */}
          <div className="lg:col-span-6 space-y-4">
            {isVisible('radar') && (
              <TechnicalScoreRadar scores={parsedJson?.scores} isLoading={isStreaming} />
            )}

            {isVisible('preflight') && (
              <PreflightFactsPanel
                marketContext={marketContext}
                isLoading={isMarketLoading || isMarketFetching}
              />
            )}

            {isVisible('chart') && (
              <TradingViewChart
                symbol={selectedSymbol}
                exchange={selectedExchange}
                timeframe={selectedTimeframe}
                currentPrice={liveTicker?.price ?? marketContext?.ticker?.price}
                onTimeframeChange={handleTimeframeChange}
                setup={parsedJson?.trade_setup}
              />
            )}

            {isVisible('meter_scenarios') && (
              <ScenariosCard scenarios={parsedJson?.scenarios} isLoading={isStreaming} />
            )}

            {isVisible('matrix') && (
              <MultiTimeframeMatrix marketContext={marketContext} isLoading={isMarketLoading} />
            )}
          </div>
        </div>
      )}

      {/* 3. COMPACT DASHBOARD LAYOUT (High-Density Multi-Card View) */}
      {layoutConfig.preset === 'compact' && (
        <div className="space-y-4">
          {/* Top Row: Preflight + Buy/Sell Meter */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7">
              {isVisible('preflight') && (
                <PreflightFactsPanel
                  marketContext={marketContext}
                  isLoading={isMarketLoading || isMarketFetching}
                />
              )}
            </div>
            <div className="lg:col-span-5">
              {isVisible('meter_scenarios') && (
                <BuySellMeter
                  buyPct={parsedJson?.probabilities?.bullish}
                  sellPct={parsedJson?.probabilities?.bearish}
                  microstructure={marketContext?.microstructure}
                  isLoading={isStreaming}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Center Row: Chart & Exec Box */}
            <div className="lg:col-span-8 space-y-4">
              {isVisible('chart') && (
                <>
                  <TradingViewChart
                    symbol={selectedSymbol}
                    exchange={selectedExchange}
                    timeframe={selectedTimeframe}
                    currentPrice={liveTicker?.price ?? marketContext?.ticker?.price}
                    onTimeframeChange={handleTimeframeChange}
                    setup={parsedJson?.trade_setup}
                  />
                  <SingleExecutionBox
                    setup={parsedJson?.trade_setup}
                    signal={parsedJson?.signal}
                    confidence={parsedJson?.confidence}
                    marketContext={marketContext}
                    isLoading={isStreaming}
                  />
                </>
              )}
            </div>

            {/* AI report on right */}
            <div className="lg:col-span-4">
              {isVisible('ai_card') && (
                <AnalysisCard
                  content={analysisText}
                  isStreaming={isStreaming}
                  isLoading={isMarketLoading || isAnalysisLoading}
                  symbol={selectedSymbol}
                  exchange={selectedExchange}
                  timeframe={selectedTimeframe}
                  analysisMode={analysisMode}
                  error={analysisError}
                  logSteps={logSteps}
                  hasRun={hasRun}
                  onRunAnalysis={handleRunAnalysis}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
