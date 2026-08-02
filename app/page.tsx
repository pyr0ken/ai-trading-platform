'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppSidebar, NavTab } from '@/components/layout/app-sidebar';
import { DashboardTickerTape } from '@/components/dashboard/dashboard-ticker-tape';
import { CoinSelector } from '@/components/market/coin-selector';
import { DashboardLayoutToolbar } from '@/components/dashboard/dashboard-layout-toolbar';
import { QuickSymbolSearch } from '@/components/dashboard/quick-symbol-search';
import { WidgetCard } from '@/components/dashboard/widget-card';
import { TradingViewChart } from '@/components/tradingview/tradingview-chart';
import { PersianAnalysisCard as AnalysisCard } from '@/components/analysis/persian-analysis-card';
import { MarketStatsCard } from '@/components/market/market-stats-card';
import { IndicatorTable } from '@/components/market/indicator-table';
import { NewsTabPage } from '@/components/news/news-tab-page';
import { BreakingNewsBanner } from '@/components/news/breaking-news-banner';
import { MultiTimeframeMatrix } from '@/components/terminal/multi-timeframe-matrix';
import { TechnicalScoreRadar } from '@/components/terminal/technical-score-radar';
import { BuySellMeter } from '@/components/terminal/buy-sell-meter';
import { ScenariosCard } from '@/components/terminal/scenarios-card';
import { HistorySignalTable } from '@/components/terminal/history-signal-table';
import { PineScriptEditor } from '@/components/terminal/pine-script-editor';
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
import { AppStorageEngine, StoredAnalysisRecord } from '@/lib/storage/app-db';
import { DashboardLayoutConfig, WidgetId } from '@/types/layout';

export default function DashboardPage() {
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

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
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
  } = useMarketData(selectedSymbol, selectedExchange, selectedTimeframe, hasRun);

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

  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSelectedSymbol(newSymbol);
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
      const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
    } catch {
      // Ignore JSON parse errors
    }
    return null;
  }, [analysisText]);

  const currentTfData = marketContext?.timeframes[selectedTimeframe] || marketContext?.timeframes['1h'];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#08080a] text-[#e2e3e9] flex items-center justify-center text-[13px] tracking-wide uppercase font-mono">
        Initializing Workstation...
      </div>
    );
  }

  const isVisible = (wId: WidgetId) => layoutConfig.visibleWidgets[wId] !== false;

  return (
    <div className="min-h-screen flex flex-col bg-[#08080a] text-[#e2e3e9]" suppressHydrationWarning>
      <DashboardTickerTape
        symbol={selectedSymbol}
        price={liveTicker?.price ?? marketContext?.ticker?.price}
        change24h={liveTicker?.change24h ?? marketContext?.ticker?.change24h}
        change24hPercentage={liveTicker?.change24hPercentage ?? marketContext?.ticker?.change24hPercentage}
        onSymbolClick={() => setIsSearchOpen(true)}
      />

      <div className="flex-1 flex w-full">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-[#08080a]">
          <BreakingNewsBanner />
          <WhalePopupContainer />
          <QuickSymbolSearch
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectSymbol={handleSymbolChange}
            currentSymbol={selectedSymbol}
          />

          <main id="workstation-controls" className="flex-1 w-full px-2 md:px-4 py-2 space-y-4" suppressHydrationWarning>
            {activeTab === 'dashboard' && (
              <>
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
                  />
                </div>

                {/* Error Banners */}
                {marketError && (
                  <div className="bg-rose-950/40 border border-rose-500/50 p-4 rounded-[10px] text-rose-400 font-sans text-sm flex flex-col gap-2 shadow-lg">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                      <span className="text-xl">⚠️</span> Data Engine Failure
                    </div>
                    <div className="leading-relaxed">
                      {marketError instanceof Error ? marketError.message : String(marketError)}
                    </div>
                  </div>
                )}

                {analysisError && (
                  <div className="bg-rose-950/40 border border-rose-500/50 p-4 rounded-[10px] text-rose-400 font-sans text-sm flex flex-col gap-2 shadow-lg">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                      <span className="text-xl">⚠️</span> Analysis System Failure
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
                      )}

                      {isVisible('matrix') && (
                        <WidgetCard id="matrix" onHideWidget={handleHideWidget} noPadding>
                          <MultiTimeframeMatrix marketContext={marketContext} isLoading={isMarketLoading} />
                        </WidgetCard>
                      )}

                      {isVisible('radar') && (
                        <WidgetCard id="radar" onHideWidget={handleHideWidget} noPadding>
                          <TechnicalScoreRadar scores={parsedJson?.scores} isLoading={isStreaming} />
                        </WidgetCard>
                      )}

                      {isVisible('meter_scenarios') && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-5">
                            <BuySellMeter
                              buyPct={parsedJson?.probabilities?.bullish}
                              sellPct={parsedJson?.probabilities?.bearish}
                              microstructure={marketContext?.microstructure}
                              isLoading={isStreaming}
                            />
                          </div>
                          <div className="md:col-span-7">
                            <ScenariosCard scenarios={parsedJson?.scenarios} isLoading={isStreaming} />
                          </div>
                        </div>
                      )}

                      {isVisible('stats') && (
                        <WidgetCard id="stats" onHideWidget={handleHideWidget} noPadding>
                          <MarketStatsCard
                            ticker={marketContext?.ticker}
                            derivatives={marketContext?.derivatives}
                            microstructure={marketContext?.microstructure}
                            macroSentiment={marketContext?.macroSentiment}
                            isLoading={isMarketLoading}
                          />
                        </WidgetCard>
                      )}

                      {isVisible('indicators_news') && (
                        <WidgetCard id="indicators_news" onHideWidget={handleHideWidget} noPadding>
                          <IndicatorTable timeframeData={currentTfData} isLoading={isMarketLoading} />
                        </WidgetCard>
                      )}

                      {isVisible('history') && (
                        <WidgetCard id="history" onHideWidget={handleHideWidget} noPadding>
                          <HistorySignalTable onSelectRecord={handleReplayAnalysis} />
                        </WidgetCard>
                      )}
                    </div>

                    {/* AI Intelligence Side Panel */}
                    {isVisible('ai_card') && (
                      <div className="lg:col-span-4 sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto pr-1 space-y-6">
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
              </>
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

            {activeTab === 'pine_studio' && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-8 text-center space-y-3">
                  <span className="text-[13px] font-sans font-semibold text-[#cc9166] uppercase tracking-wider block">
                    Pine Script Studio
                  </span>
                  <h2 className="font-ivy-presto text-[32px] font-normal text-[#ffffff]">
                    TradingView Pine Script v5 Generator
                  </h2>
                  <p className="text-[14px] text-[#9194a1] max-w-2xl mx-auto leading-relaxed">
                    Generate, edit, copy, and download custom indicator and strategy code tailored to your AI quant signals.
                  </p>
                </div>
                <PineScriptEditor data={parsedJson} symbol={selectedSymbol} isLoading={isMarketLoading} />
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
