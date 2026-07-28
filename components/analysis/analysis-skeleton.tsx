'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { LiveStatusLogger, LogStep } from './live-status-logger';

interface AnalysisSkeletonProps {
  steps?: LogStep[];
}

export const AnalysisSkeleton: React.FC<AnalysisSkeletonProps> = ({ steps }) => {
  const defaultSteps: LogStep[] = steps || [
    {
      id: 'market-fetch',
      label: 'Fetching CCXT Candlesticks & Order Book Microstructure',
      status: 'in_progress',
      detail: 'Connecting to exchange API endpoints...',
    },
    {
      id: 'indicators',
      label: 'Computing Server-Side Technical Indicators (EMA 7/20/50, RSI, MACD, S&R)',
      status: 'pending',
    },
    {
      id: 'macro',
      label: 'Aggregating Fear & Greed Index and Crypto News',
      status: 'pending',
    },
    {
      id: 'llm',
      label: 'Connecting to Local LLM Engine (http://127.0.0.1:20128/v1)',
      status: 'pending',
    },
  ];

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-[24px] shadow-steep-artifact p-7 text-[#f5f5f4] min-h-[760px] flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[#fbe1d1] animate-spin" />
            <div>
              <h3 className="font-serif text-xl font-normal text-[#f5f5f4]">Synthesizing Executive Analysis</h3>
              <p className="text-xs text-[#a1a1aa]">Processing quantitative payload...</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#27272a] text-[#f5f5f4] text-xs font-normal">
            Processing Data
          </span>
        </div>

        {/* Live Status Pipeline Log Component */}
        <LiveStatusLogger steps={defaultSteps} />

        {/* Shimmer Placeholder */}
        <div className="space-y-3 pt-6">
          <div className="h-4 w-3/4 bg-[#27272a] rounded-full animate-pulse" />
          <div className="h-4 w-full bg-[#27272a] rounded-full animate-pulse" />
          <div className="h-4 w-5/6 bg-[#27272a] rounded-full animate-pulse" />
          <div className="h-4 w-2/3 bg-[#27272a] rounded-full animate-pulse" />
        </div>
      </div>

      <div className="pt-4 border-t border-[#27272a] text-xs text-[#a1a1aa]">
        <span>Autonomous Quantitative Pipeline • Multi-timeframe Analysis</span>
      </div>
    </div>
  );
};
