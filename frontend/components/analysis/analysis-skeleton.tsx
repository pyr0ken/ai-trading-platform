'use client';

import React, { useState, useEffect } from 'react';
import { RotateCw, Sparkles, Cpu, Clock, Zap } from 'lucide-react';
import { LiveStatusLogger, LogStep } from './live-status-logger';

interface AnalysisSkeletonProps {
  steps?: LogStep[];
}

export const AnalysisSkeleton: React.FC<AnalysisSkeletonProps> = ({ steps }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const defaultSteps: LogStep[] = steps || [
    {
      id: 'market-fetch',
      label: 'Fetching CCXT Candlesticks & Order Book Microstructure',
      status: 'in_progress',
      detail: 'Retrieving OHLCV candles, CVD volume delta & level 2 liquidity...',
    },
    {
      id: 'indicators',
      label: 'Computing Server-Side Technical Indicators (EMA 7/20/50, RSI, MACD, S&R)',
      status: 'pending',
      detail: 'Running trend confluence and support/resistance mapping...',
    },
    {
      id: 'macro',
      label: 'Aggregating Fear & Greed Index and Crypto News',
      status: 'pending',
      detail: 'Scraping real-time sentiment and market narrative feeds...',
    },
    {
      id: 'llm',
      label: 'Streaming AI Quant Signal & Trade Setup Payload',
      status: 'pending',
      detail: 'Synthesizing executive recommendation and Pine Script export...',
    },
  ];

  const totalSteps = defaultSteps.length;
  const completedSteps = defaultSteps.filter((s) => s.status === 'completed').length;
  const inProgressSteps = defaultSteps.filter((s) => s.status === 'in_progress').length;
  
  // Calculate progress percentage: completed steps count + partial credit for in-progress step
  const rawProgress = ((completedSteps + (inProgressSteps > 0 ? 0.5 : 0)) / totalSteps) * 100;
  const progressPct = Math.min(Math.max(Math.round(rawProgress), 15), 95);

  const activeStep = defaultSteps.find((s) => s.status === 'in_progress') || defaultSteps[completedSteps] || defaultSteps[0];

  return (
    <div className="bg-[#040406] border border-[#1c1d22] hover:border-[#cc9166]/40 rounded-[12px] p-6 md:p-8 text-[#e2e3e9] min-h-[640px] flex flex-col justify-between relative overflow-hidden shadow-2xl transition-all duration-300">
      {/* Background glow animation */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#cc9166]/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1c1d22] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#121317] border border-[#cc9166]/40 flex items-center justify-center text-[#cc9166] shadow-[0_0_15px_rgba(204,145,102,0.2)]">
              <RotateCw className="w-5 h-5 animate-spin text-[#cc9166]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-ivy-presto text-2xl font-normal text-[#ffffff]">
                  Synthesizing Executive Analysis
                </h3>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </div>
              <p className="text-xs text-[#9194a1] font-sans">
                Processing quantitative payload &amp; multi-factor data streams...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 bg-[#121317] border border-[#1c1d22] px-3 py-1 rounded-[6px] text-[#cc9166]">
              <Clock className="w-3.5 h-3.5" />
              <span>Elapsed: {elapsed}s</span>
            </div>
          </div>
        </div>

        {/* Live Progress Bar Block */}
        <div className="bg-[#08080a] border border-[#1c1d22] p-4 rounded-[10px] space-y-2.5 font-mono shadow-md">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#cc9166]" />
              <span className="text-[#e2e3e9] font-bold">Pipeline Progress</span>
            </div>
            <span className="text-[#cc9166] font-bold text-sm">
              {progressPct}%
            </span>
          </div>

          {/* Animated Progress Bar Container */}
          <div className="w-full h-2.5 bg-[#121317] border border-[#1c1d22] rounded-[9999px] overflow-hidden p-0.5 relative">
            <div
              className="h-full rounded-[9999px] bg-gradient-to-r from-[#cc9166] via-[#ae9357] to-[#cc9166] transition-all duration-500 ease-out shadow-[0_0_12px_rgba(204,145,102,0.5)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#9194a1] font-sans pt-1">
            <span className="truncate max-w-[280px] sm:max-w-md">
              Current Stage: <strong className="text-[#e2e3e9] font-mono">{activeStep.label}</strong>
            </span>
            <span className="font-mono text-[10px] text-[#cc9166]">
              Step {completedSteps + (inProgressSteps > 0 ? 1 : 0)} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Live Status Pipeline Logger */}
        <LiveStatusLogger steps={defaultSteps} />
      </div>

      {/* Footer info */}
      <div className="pt-4 border-t border-[#1c1d22] flex items-center justify-between text-xs font-mono text-[#5e616e] relative z-10">
        <span className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-[#cc9166]" />
          <span>Autonomous AI Engine Active</span>
        </span>
        <span>Est. Time: ~3-5 seconds</span>
      </div>
    </div>
  );
};
