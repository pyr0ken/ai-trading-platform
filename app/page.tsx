'use client';

import React, { useState, useEffect } from 'react';
import { AtlanticTopNav } from '@/components/layout/atlantic-top-nav';
import { AppSidebar, NavTab } from '@/components/layout/app-sidebar';
import { DashboardTickerTape } from '@/components/dashboard/dashboard-ticker-tape';
import { CoinSelector } from '@/components/market/coin-selector';
import { TradingViewChart } from '@/components/tradingview/tradingview-chart';
import { PersianAnalysisCard as AnalysisCard } from '@/components/analysis/persian-analysis-card';
import { MarketStatsCard } from '@/components/market/market-stats-card';
import { IndicatorTable } from '@/components/market/indicator-table';
import { NewsFeed } from '@/components/news/news-feed';
import { MultiTimeframeMatrix } from '@/components/terminal/multi-timeframe-matrix';
import { TechnicalScoreRadar } from '@/components/terminal/technical-score-radar';
import { BuySellMeter } from '@/components/terminal/buy-sell-meter';
import { ScenariosCard } from '@/components/terminal/scenarios-card';
import { HistorySignalTable } from '@/components/terminal/history-signal-table';
import { PineScriptEditor } from '@/components/terminal/pine-script-editor';
import { AIChatWidget } from '@/components/terminal/ai-chat-widget';
import { StandaloneWatchlistPage } from '@/components/market/standalone-watchlist-page';
import { TerminalSettingsPage } from '@/components/settings/terminal-settings-page';

import { useMarketData } from '@/hooks/use-market-data';
import { useLLMAnalysis } from '@/hooks/use-llm-analysis';
import { StructuredLLMOutput } from '@/types/terminal';
import { AppStorageEngine, StoredAnalysisRecord } from '@/lib/storage/app-db';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USDT');
  const [selectedExchange, setSelectedExchange] = useState<string>('kucoin');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');
  const [hasRun, setHasRun] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const session = AppStorageEngine.getSession();
    if (session.selectedSymbol) setSelectedSymbol(session.selectedSymbol);
    if (session.selectedExchange) setSelectedExchange(session.selectedExchange);
    if (session.selectedTimeframe) setSelectedTimeframe(session.selectedTimeframe);
    if (session.sidebarOpen !== undefined) setSidebarCollapsed(!session.sidebarOpen);
  }, []);

  useEffect(() => {
    if (mounted) {
      AppStorageEngine.saveSession({
        selectedSymbol,
        selectedExchange,
        selectedTimeframe,
        sidebarOpen: !sidebarCollapsed,
      });
    }
  }, [selectedSymbol, selectedExchange, selectedTimeframe, sidebarCollapsed, mounted]);

  const {
    data: marketContext,
    isLoading: isMarketLoading,
    isFetching: isMarketFetching,
    refetch: refetchMarketData,
  } = useMarketData(selectedSymbol, selectedExchange, selectedTimeframe, hasRun);

  const {
    analysisText,
    isStreaming,
    isLoading: isAnalysisLoading,
    error: analysisError,
    logSteps,
    runAnalysis,
  } = useLLMAnalysis();

  const handleRunAnalysis = async () => {
    setHasRun(true);
    const result = await refetchMarketData();
    if (result.data) {
      runAnalysis(result.data);
    }
  };

  const handleReplayAnalysis = (record: StoredAnalysisRecord) => {
    setSelectedSymbol(record.symbol);
    setSelectedExchange(record.exchange);
    setSelectedTimeframe(record.timeframe);
    setHasRun(true);
  };

  let parsedJson: StructuredLLMOutput | null = null;
  try {
    const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      parsedJson = JSON.parse(jsonMatch[1]);
    }
  } catch (e) {}

  const currentTfData = marketContext?.timeframes[selectedTimeframe] || marketContext?.timeframes['1h'];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#08080a] text-[#e2e3e9] flex items-center justify-center text-[13px] tracking-wide uppercase">
        Initializing...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#08080a] text-[#e2e3e9]" suppressHydrationWarning>
      <DashboardTickerTape />

      <div className="flex-1 flex w-full">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-[#08080a]">
          <main id="workstation-controls" className="flex-1 w-full px-2 md:px-4 py-2 space-y-4" suppressHydrationWarning>
            {activeTab === 'dashboard' && (
              <>
                <CoinSelector
                  selectedSymbol={selectedSymbol}
                  selectedExchange={selectedExchange}
                  selectedTimeframe={selectedTimeframe}
                  onSymbolChange={setSelectedSymbol}
                  onExchangeChange={setSelectedExchange}
                  onTimeframeChange={setSelectedTimeframe}
                  onRunAnalysis={handleRunAnalysis}
                  isRunning={isMarketLoading || isMarketFetching || isStreaming}
                  onReplayAnalysis={handleReplayAnalysis}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start" suppressHydrationWarning>
                <div className="lg:col-span-8 space-y-4">
                  <TradingViewChart
                    symbol={selectedSymbol}
                    exchange={selectedExchange}
                    timeframe={selectedTimeframe}
                    setup={parsedJson?.trade_setup}
                  />

                  <MultiTimeframeMatrix isLoading={isMarketLoading} />

                  <TechnicalScoreRadar scores={parsedJson?.scores} isLoading={isMarketLoading} />

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5">
                      <BuySellMeter
                        buyPct={parsedJson?.probabilities?.bullish ?? 74}
                        sellPct={parsedJson?.probabilities?.bearish ?? 26}
                        isLoading={isMarketLoading}
                      />
                    </div>
                    <div className="md:col-span-7">
                      <ScenariosCard scenarios={parsedJson?.scenarios} isLoading={isMarketLoading} />
                    </div>
                  </div>

                  <MarketStatsCard
                    ticker={marketContext?.ticker}
                    derivatives={marketContext?.derivatives}
                    microstructure={marketContext?.microstructure}
                    macroSentiment={marketContext?.macroSentiment}
                    isLoading={isMarketLoading}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-7">
                      <IndicatorTable timeframeData={currentTfData} isLoading={isMarketLoading} />
                    </div>
                    <div className="md:col-span-5">
                      <NewsFeed articles={marketContext?.news?.articles} isLoading={isMarketLoading} />
                    </div>
                  </div>

                  <HistorySignalTable />
                </div>

                <div className="lg:col-span-4 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-1 space-y-6">
                  <AnalysisCard
                    content={analysisText}
                    isStreaming={isStreaming}
                    isLoading={isMarketLoading || isAnalysisLoading}
                    symbol={selectedSymbol}
                    exchange={selectedExchange}
                    timeframe={selectedTimeframe}
                    error={analysisError}
                    logSteps={logSteps}
                    hasRun={hasRun}
                    onRunAnalysis={handleRunAnalysis}
                  />
                </div>
              </div>
            </>
          )}

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
                  setSelectedSymbol(sym);
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
                <HistorySignalTable />
              </div>
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
        </div>
      </div>
    </div>
  );
}
