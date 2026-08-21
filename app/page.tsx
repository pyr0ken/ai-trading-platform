/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppSidebar, NavTab } from '@/components/layout/app-sidebar';
import { DashboardTickerTape } from '@/components/dashboard/dashboard-ticker-tape';
import { QuickSymbolSearch } from '@/components/dashboard/quick-symbol-search';
import { PersianAnalysisCard as AnalysisCard } from '@/components/analysis/persian-analysis-card';
import { NewsTabPage } from '@/components/news/news-tab-page';
import { HistorySignalTable } from '@/components/terminal/history-signal-table';
import { AIChatWidget } from '@/components/terminal/ai-chat-widget';
import { StandaloneWatchlistPage } from '@/components/market/standalone-watchlist-page';
import { TerminalSettingsPage } from '@/components/settings/terminal-settings-page';
import { BacktestSimulator } from '@/components/terminal/backtest-simulator';
import { PaperPortfolio } from '@/components/terminal/paper-portfolio';
import { ToastContainer, showToast } from '@/components/terminal/toast';
import { WhalePopupContainer } from '@/components/whale/whale-popup';
import { ExecutiveReportingDashboard } from '@/components/dashboard/executive-reporting-dashboard';
import { TradingIntelligenceTerminal } from '@/components/terminal/trading-intelligence-terminal';

import { useMarketData } from '@/hooks/use-market-data';
import { useTickerPoll } from '@/hooks/use-ticker-poll';
import { useLLMAnalysis } from '@/hooks/use-llm-analysis';
import { useAutoResolver } from '@/hooks/use-auto-resolver';
import { StructuredLLMOutput } from '@/types/terminal';
import { enforceSignalCoherence } from '@/lib/llm/signal-coherence';
import { extractAndParseJSON, SignalSchema } from '@/lib/llm/json-guard';
import { AppStorageEngine, StoredAnalysisRecord } from '@/lib/storage/app-db';
import { useIntelToggles } from '@/lib/storage/intel-toggles';
import { useAuth } from '@/components/providers/auth-provider';
import { TeamLoginPage } from '@/components/auth/team-login-page';
import { DashboardLayoutConfig } from '@/types/layout';

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

  // Global Keyboard listener for quick symbol search ('/' or 'Ctrl+K')
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

  const handleSymbolChange = useCallback(
    (newSymbol: string, newExchange?: string) => {
      setSelectedSymbol(newSymbol);
      if (newExchange) {
        setSelectedExchange(newExchange);
      }
      resetAnalysis();
      setHasRun(false);
    },
    [resetAnalysis]
  );

  const handleExchangeChange = useCallback(
    (newExchange: string) => {
      setSelectedExchange(newExchange);
      resetAnalysis();
      setHasRun(false);
    },
    [resetAnalysis]
  );

  const handleTimeframeChange = useCallback(
    (newTf: string) => {
      setSelectedTimeframe(newTf);
      resetAnalysis();
      setHasRun(false);
    },
    [resetAnalysis]
  );

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
    setActiveTab('terminal');
    showToast(`⏪ Replaying ${record.symbol} · ${record.signal} @ ${record.confidence}%`);
  };

  const parsedJson: StructuredLLMOutput | null = useMemo(() => {
    try {
      const raw = extractAndParseJSON(analysisText);
      if (raw) {
        const validated = SignalSchema.safeParse(raw);
        if (!validated.success) {
          console.warn('[json-guard] Model output failed schema validation:', validated.error.flatten());
        }

        const { output, corrected, reason, original } = enforceSignalCoherence(
          raw as unknown as StructuredLLMOutput,
          analysisText
        );
        if (corrected) {
          console.warn(`[signal-coherence] ${reason}`, {
            original,
            resolved: { signal: output.signal, position: output.trade_setup?.position },
          });
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
              <ExecutiveReportingDashboard
                onNavigateToTerminal={(sym, exch, tf) => {
                  if (sym) handleSymbolChange(sym, exch);
                  if (tf) handleTimeframeChange(tf);
                  setActiveTab('terminal');
                }}
              />
            )}

            {activeTab === 'terminal' && (
              <TradingIntelligenceTerminal
                selectedSymbol={selectedSymbol}
                selectedExchange={selectedExchange}
                selectedTimeframe={selectedTimeframe}
                analysisMode={analysisMode}
                setAnalysisMode={setAnalysisMode}
                handleSymbolChange={handleSymbolChange}
                handleExchangeChange={handleExchangeChange}
                handleTimeframeChange={handleTimeframeChange}
                handleRunAnalysis={handleRunAnalysis}
                stopAnalysis={stopAnalysis}
                isMarketLoading={isMarketLoading}
                isMarketFetching={isMarketFetching}
                isStreaming={isStreaming}
                handleReplayAnalysis={handleReplayAnalysis}
                watchlistOpen={watchlistOpen}
                setWatchlistOpen={setWatchlistOpen}
                layoutConfig={layoutConfig}
                setLayoutConfig={setLayoutConfig}
                setIsSearchOpen={setIsSearchOpen}
                marketError={marketError}
                analysisError={analysisError}
                marketContext={marketContext}
                liveTicker={liveTicker}
                parsedJson={parsedJson}
                analysisText={analysisText}
                isAnalysisLoading={isAnalysisLoading}
                logSteps={logSteps}
                currentTfData={currentTfData}
                hasRun={hasRun}
              />
            )}

            {/* Other Workspace Tabs */}
            {activeTab === 'watchlist' && (
              <StandaloneWatchlistPage
                onSelectCoin={(sym) => {
                  handleSymbolChange(sym);
                  setActiveTab('terminal');
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

          <ToastContainer />
        </div>
      </div>
    </div>
  );
}
