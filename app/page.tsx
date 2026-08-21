/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppSidebar, NavTab } from '@/components/layout/app-sidebar';
import { DashboardTickerTape } from '@/components/dashboard/dashboard-ticker-tape';
import { CoinSelector } from '@/components/market/coin-selector';
import { DashboardLayoutToolbar } from '@/components/dashboard/dashboard-layout-toolbar';
import { QuickSymbolSearch } from '@/components/dashboard/quick-symbol-search';
import { WidgetCard } from '@/components/dashboard/widget-card';
import { TabbedWidgetCard } from '@/components/dashboard/tabbed-widget-card';
import { SingleExecutionBox } from '@/components/terminal/single-execution-box';
import { BarChart2, Gauge, Table, Compass, GitBranch, History } from 'lucide-react';
import { TradingViewChart } from '@/components/tradingview/tradingview-chart';
import { PersianAnalysisCard as AnalysisCard } from '@/components/analysis/persian-analysis-card';
import { MarketStatsCard } from '@/components/market/market-stats-card';
import { IndicatorTable } from '@/components/market/indicator-table';
import { NewsTabPage } from '@/components/news/news-tab-page';
import { MultiTimeframeMatrix } from '@/components/terminal/multi-timeframe-matrix';
import { TechnicalScoreRadar } from '@/components/terminal/technical-score-radar';
import { BuySellMeter } from '@/components/terminal/buy-sell-meter';
import { ScenariosCard } from '@/components/terminal/scenarios-card';
import { DecisionZonesMapComponent } from '@/components/terminal/decision-zones-map';
import { ConvictionBreakdownComponent } from '@/components/terminal/conviction-breakdown';
import { HistorySignalTable } from '@/components/terminal/history-signal-table';
import { AIChatWidget } from '@/components/terminal/ai-chat-widget';
import { StandaloneWatchlistPage } from '@/components/market/standalone-watchlist-page';
import { TerminalSettingsPage } from '@/components/settings/terminal-settings-page';
import { BacktestSimulator } from '@/components/terminal/backtest-simulator';
import { PaperPortfolio } from '@/components/terminal/paper-portfolio';
import { ToastContainer, showToast } from '@/components/terminal/toast';
import { WhalePopupContainer } from '@/components/whale/whale-popup';
import { PreflightFactsPanel } from '@/components/terminal/preflight-facts-panel';

import { useMarketData } from '@/hooks/use-market-data';
import { useTickerPoll } from '@/hooks/use-ticker-poll';
import { useLLMAnalysis } from '@/hooks/use-llm-analysis';
import { useAutoResolver } from '@/hooks/use-auto-resolver';
import { StructuredLLMOutput } from '@/types/terminal';
import { enforceSignalCoherence } from '@/lib/llm/signal-coherence';
import { tryRepairJSON, extractAndParseJSON, SignalSchema } from '@/lib/llm/json-guard';
import { AppStorageEngine, StoredAnalysisRecord } from '@/lib/storage/app-db';
import { useIntelToggles } from '@/lib/storage/intel-toggles';
import { useAuth } from '@/components/providers/auth-provider';
import { TeamLoginPage } from '@/components/auth/team-login-page';
import { DashboardLayoutConfig, WidgetId } from '@/types/layout';

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  useAutoResolver();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const session = AppStorageEngine.getSession();
    return session.sidebarOpen !== undefined ? !session.sidebarOpen : false;
  });
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    const session = AppStorageEngine.getSession();
    return session.selectedSymbol || 'BTC/USDT';
  });
  const [selectedExchange, setSelectedExchange] = useState<string>(() => {
    const session = AppStorageEngine.getSession();
    return session.selectedExchange || 'kucoin';
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(() => {
    const session = AppStorageEngine.getSession();
    return session.selectedTimeframe || '1h';
  });
  const [hasRun, setHasRun] = useState<boolean>(false);
  const [analysisMode, setAnalysisMode] = useState<'scalp' | 'swing'>(() => {
    const session = AppStorageEngine.getSession();
    return session.analysisMode || 'swing';
  });
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Dashboard Layout Config State
  const [layoutConfig, setLayoutConfig] = useState<DashboardLayoutConfig>(() => {
    return AppStorageEngine.getLayoutConfig();
  });

  // Intel source toggles live in one shared hook so the header pill, the
  // settings page and this query key can never drift apart.
  const { includeNews, includeSocial } = useIntelToggles();

  useEffect(() => {
    setMounted(true);
    AppStorageEngine.initializeFromDatabase().catch((e) => {
      console.warn('Failed to initialize database storage:', e);
    });
  }, []);

  useEffect(() => {
    if (mounted) {
      AppStorageEngine.saveSession({
        selectedSymbol,
        selectedExchange,
        selectedTimeframe,
        analysisMode,
        sidebarOpen: !sidebarCollapsed,
      });
    }
  }, [selectedSymbol, selectedExchange, selectedTimeframe, analysisMode, sidebarCollapsed, mounted]);

  useEffect(() => {
    if (mounted) {
      AppStorageEngine.saveLayoutConfig(layoutConfig);
    }
  }, [layoutConfig, mounted]);

  // Global Keyboard listener for quick symbol search (e.g. '/' or 'Ctrl+K' or 'Cmd+K')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const {
    data: marketContext,
    isLoading: isMarketLoading,
    isFetching: isMarketFetching,
    error: marketError,
    refetch: refetchMarketData,
  } = useMarketData(selectedSymbol, selectedExchange, selectedTimeframe, analysisMode, includeNews, includeSocial, hasRun);

  const { data: liveTicker } = useTickerPoll(selectedSymbol, selectedExchange);

  const {
    analysisText,
    setAnalysisText,
    isStreaming,
    isLoading: isAnalysisLoading,
    error: analysisError,
    logSteps,
    runAnalysis,
    stopAnalysis,
    resetAnalysis,
  } = useLLMAnalysis();

  const handleSymbolChange = useCallback((newSymbol: string, newExchange?: string) => {
    setSelectedSymbol(newSymbol);
    if (newExchange) {
      setSelectedExchange(newExchange);
    }
    resetAnalysis();
    setHasRun(false);
  }, [resetAnalysis]);

  const handleExchangeChange = useCallback((newExchange: string) => {
    setSelectedExchange(newExchange);
    resetAnalysis();
    setHasRun(false);
  }, [resetAnalysis]);

  const handleTimeframeChange = useCallback((newTf: string) => {
    setSelectedTimeframe(newTf);
    resetAnalysis();
    setHasRun(false);
  }, [resetAnalysis]);

  const handleRunAnalysis = async () => {
    setHasRun(true);
    const result = await refetchMarketData();
    if (result.data) {
      runAnalysis({ ...result.data, mode: analysisMode });
    }
  };

  const handleReplayAnalysis = (record: StoredAnalysisRecord) => {
    setSelectedSymbol(record.symbol);
    setSelectedExchange(record.exchange);
    setSelectedTimeframe(record.timeframe);
    setHasRun(true);
    if (record.markdown_report) {
      setAnalysisText(record.markdown_report);
    }
    showToast(`⏪ Replaying ${record.symbol} · ${record.signal} @ ${record.confidence}%`);
  };

  const handleHideWidget = (id: WidgetId) => {
    setLayoutConfig((prev) => ({
      ...prev,
      visibleWidgets: {
        ...prev.visibleWidgets,
        [id]: false,
      },
    }));
  };

  const parsedJson: StructuredLLMOutput | null = useMemo(() => {
    try {
      const raw = extractAndParseJSON(analysisText);
      if (raw) {
        // Step 2: validate against schema
        const validated = SignalSchema.safeParse(raw);
        if (!validated.success) {
          console.warn('[json-guard] Model output failed schema validation:', validated.error.flatten());
        }

        // Step 3: reconcile signal ↔ trade_setup.position
        const { output, corrected, reason, original } = enforceSignalCoherence(raw as unknown as StructuredLLMOutput, analysisText);
        if (corrected) {
          console.warn(
            `[signal-coherence] ${reason}`,
            { original, resolved: { signal: output.signal, position: output.trade_setup?.position } }
          );
        }
        return output;
      }
    } catch {
      // Ignore JSON parse errors
    }
    return null;
  }, [analysisText]);

  const currentTfData = marketContext?.timeframes[selectedTimeframe] || marketContext?.timeframes['1h'];

  if (!mounted || isAuthLoading) {
    return (
      <div className="min-h-screen w-full bg-[#040406] text-[#cc9166] flex flex-col items-center justify-center space-y-3 font-mono">
        <div className="w-8 h-8 border-2 border-[#cc9166] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">Verifying System Authentication...</span>
      </div>
    );
  }

  if (!user) {
    return <TeamLoginPage />;
  }

  const isVisible = (wId: WidgetId) => layoutConfig.visibleWidgets[wId] !== false;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#08080a] text-[#e2e3e9] select-none" suppressHydrationWarning>
      <DashboardTickerTape
        symbol={selectedSymbol}
        price={liveTicker?.price ?? marketContext?.ticker?.price}
        change24h={liveTicker?.change24h ?? marketContext?.ticker?.change24h}
        change24hPercentage={liveTicker?.change24hPercentage ?? marketContext?.ticker?.change24hPercentage}
        onSymbolClick={() => setIsSearchOpen(true)}
      />

      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-[#08080a] custom-scrollbar">
          <WhalePopupContainer />
          <QuickSymbolSearch
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectSymbol={handleSymbolChange}
            currentSymbol={selectedSymbol}
          />

          <main id="workstation-controls" className="flex-1 w-full px-2 md:px-4 py-3 space-y-4" suppressHydrationWarning>
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
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
                  <div className="bg-rose-950/40 border border-rose-500/50 p-3 rounded-[10px] text-rose-400 font-sans text-xs flex flex-col gap-1 shadow-lg">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px]">
                      <span className="text-base">⚠️</span> Data Engine Failure
                    </div>
                    <div className="leading-relaxed">
                      {marketError instanceof Error ? marketError.message : String(marketError)}
                    </div>
                  </div>
                )}

                {analysisError && (
                  <div className="bg-rose-950/40 border border-rose-500/50 p-3 rounded-[10px] text-rose-400 font-sans text-xs flex flex-col gap-1 shadow-lg">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px]">
                      <span className="text-base">⚠️</span> Analysis System Failure
                    </div>
                    <div className="leading-relaxed">{analysisError}</div>
                  </div>
                )}

                {/* MINIMAL & REFINED DASHBOARD LAYOUT SYSTEM */}
                {/* 1. STANDARD & PRO TRADER LAYOUTS (Main Workstation + Sticky AI Right Panel) */}
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

                    {/* Middle Row: Chart & AI Report Side-by-Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <div className="lg:col-span-7">
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
                      </div>
                      <div className="lg:col-span-5">
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

                    {/* Lower Grid: Matrix, Radar, Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {isVisible('matrix') && (
                        <MultiTimeframeMatrix marketContext={marketContext} isLoading={isMarketLoading} />
                      )}
                      {isVisible('radar') && (
                        <TechnicalScoreRadar scores={parsedJson?.scores} isLoading={isStreaming} />
                      )}
                      {isVisible('stats') && (
                        <MarketStatsCard
                          ticker={marketContext?.ticker}
                          derivatives={marketContext?.derivatives}
                          microstructure={marketContext?.microstructure}
                          macroSentiment={marketContext?.macroSentiment}
                          isLoading={isMarketLoading}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Other Workspace Tabs */}
            {activeTab === 'ai_assistant' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
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
                <div className="lg:col-span-5">
                  <AIChatWidget symbol={selectedSymbol} analysisSummary={parsedJson} />
                </div>
              </div>
            )}

            {activeTab === 'watchlist' && (
              <StandaloneWatchlistPage
                onSelectCoin={(sym) => {
                  handleSymbolChange(sym);
                  setActiveTab('dashboard');
                }}
                selectedSymbol={selectedSymbol}
              />
            )}

            {activeTab === 'history' && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-8 text-center space-y-3">
                  <span className="text-[13px] font-sans font-semibold text-[#cc9166] uppercase tracking-wider block">
                    Analysis History
                  </span>
                  <h2 className="font-ivy-presto text-[32px] font-normal text-[#ffffff]">
                    Historical Signal Audit Log
                  </h2>
                  <p className="text-[14px] text-[#9194a1] max-w-2xl mx-auto leading-relaxed">
                    All historical signal predictions and snapshot evaluations are stored locally in browser IndexedDB.
                  </p>
                </div>
                <HistorySignalTable onSelectRecord={handleReplayAnalysis} />
              </div>
            )}

            {activeTab === 'backtest' && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-8 text-center space-y-3">
                  <span className="text-[13px] font-sans font-semibold text-[#cc9166] uppercase tracking-wider block">
                    Strategy Backtester
                  </span>
                  <h2 className="font-ivy-presto text-[32px] font-normal text-[#ffffff]">
                    Historical Candle Simulation
                  </h2>
                  <p className="text-[14px] text-[#9194a1] max-w-2xl mx-auto leading-relaxed font-sans">
                    Simulate trade entries, stop losses, and take profit targets against historical candle series to calculate win rate, drawdowns, and net profit.
                  </p>
                </div>
                <BacktestSimulator marketContext={marketContext} latestTradeSetup={parsedJson?.trade_setup} />
              </div>
            )}

            {activeTab === 'paper_portfolio' && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-8 text-center space-y-3">
                  <span className="text-[13px] font-sans font-semibold text-[#cc9166] uppercase tracking-wider block">
                    Paper Portfolio
                  </span>
                  <h2 className="font-ivy-presto text-[32px] font-normal text-[#ffffff]">
                    AI & Manual Paper Trading Account
                  </h2>
                  <p className="text-[14px] text-[#9194a1] max-w-2xl mx-auto leading-relaxed font-sans">
                    Monitor live active paper positions, execute copy trade suggestions from AI, manage leverage/margins, and track mock account growth.
                  </p>
                </div>
                <PaperPortfolio currentPrice={liveTicker?.price ?? marketContext?.ticker?.price} symbol={selectedSymbol} />
              </div>
            )}

            {activeTab === 'news' && (
              <NewsTabPage
                symbol={selectedSymbol}
                exchange={selectedExchange}
              />
            )}

            {activeTab === 'settings' && <TerminalSettingsPage />}
          </main>

          <footer className="border-t border-[#1c1d22] bg-[#040406] py-12 px-8 text-[12px] text-[#5e616e] select-none">
            <div className="max-w-[1216px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <span className="font-ivy-presto text-[15px] text-[#e2e3e9] tracking-[0.01em]">
                  market<span className="text-[#cc9166]">.ai</span>
                </span>
                <span className="text-[#2e3038]">|</span>
                <span className="text-[#5e616e]">Intelligence Terminal</span>
              </div>

              <div className="flex items-center gap-3 text-[#5e616e]">
                <span>Real-time market intelligence and analysis</span>
              </div>

              <div className="flex items-center gap-2 text-[#5e616e]">
                <span>&copy; {new Date().getFullYear()} Market AI Analyzer</span>
              </div>
            </div>
          </footer>
          <ToastContainer />
        </div>
      </div>
    </div>
  );
}
