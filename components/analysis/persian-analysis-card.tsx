'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowRight, ChevronDown, ChevronUp, FileText, Compass } from 'lucide-react';
import { AnalysisSkeleton } from './analysis-skeleton';
import { LogStep } from './live-status-logger';
import { StructuredLLMOutput } from '@/types/terminal';
import { ExecutiveSignalCard } from '@/components/terminal/executive-signal-card';
import { TradeSetupCard } from '@/components/terminal/trade-setup-card';
import { SignalVisualizerChart } from '@/components/terminal/signal-visualizer-chart';
import { AIReasoningBadges } from '@/components/terminal/ai-reasoning-badges';
import { AIChatWidget } from '@/components/terminal/ai-chat-widget';
import { PineScriptEditor } from '@/components/terminal/pine-script-editor';
import { SmartSuggestions } from '@/components/terminal/smart-suggestions';

interface AnalysisCardProps {
  content: string;
  isStreaming: boolean;
  isLoading: boolean;
  symbol: string;
  exchange: string;
  timeframe: string;
  error?: string | null;
  logSteps?: LogStep[];
  hasRun: boolean;
  onRunAnalysis: () => void;
  onSelectAction?: (actionText: string) => void;
}

export const PersianAnalysisCard: React.FC<AnalysisCardProps> = ({
  content,
  isStreaming,
  isLoading,
  symbol,
  exchange,
  timeframe,
  error,
  logSteps,
  hasRun,
  onRunAnalysis,
  onSelectAction = () => {},
}) => {
  const [showMarkdown, setShowMarkdown] = useState(false);

  let parsedJson: StructuredLLMOutput | null = null;
  let markdownText = content;

  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      parsedJson = JSON.parse(jsonMatch[1]);
      markdownText = content.replace(/```json[\s\S]*?```/, '').trim();
    }
  } catch (e) {}

  if (!hasRun && !content) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] text-[#e2e3e9] rounded-[10px] p-8 min-h-[760px] flex flex-col items-start justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#cc9166]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-2 text-[13px] text-[#9194a1]">
            <Compass className="w-3.5 h-3.5 text-[#cc9166]" />
            <span>AI Signal Intelligence</span>
          </div>

          <div className="space-y-2">
            <h3 className="font-ivy-presto text-[32px] md:text-[44px] font-normal text-[#ffffff] leading-tight">
              Autonomous Signal
            </h3>
            <h2 className="text-[18px] font-sans font-medium text-[#cc9166]">
              Intelligence Terminal
            </h2>
          </div>

          <p className="text-[14px] text-[#9194a1] leading-relaxed max-w-md">
            Synthesizing multi-timeframe OHLCV, server-side indicators, order book microstructure, and macro sentiment into an executive trade setup with visual level mapping and Pine Script v5 export.
          </p>
        </div>

        <div className="w-full space-y-6 pt-8 border-t border-[#1c1d22] relative z-10">
          <div className="flex items-center justify-between text-[13px] text-[#5e616e]">
            <span>Symbol: <strong className="text-[#e2e3e9]">{symbol}</strong></span>
            <span>Venue: <strong className="text-[#cc9166]">{exchange.toUpperCase()} ({timeframe})</strong></span>
          </div>

          <button
            onClick={onRunAnalysis}
            className="bg-[#ffffff] text-[#08080a] w-full text-[13px] font-sans font-medium py-3.5 px-6 rounded-[9999px] hover:bg-[#e2e3e9] transition-colors cursor-pointer flex items-center justify-center"
          >
            <span>Execute Analysis ({symbol})</span>
            <ArrowRight className="w-4 h-4 ml-2 inline" />
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && !content) {
    return <AnalysisSkeleton steps={logSteps} />;
  }

  return (
    <div className="bg-[#08080a] space-y-6 min-h-[760px]">
      <ExecutiveSignalCard data={parsedJson} isLoading={isStreaming && !parsedJson} />

      <TradeSetupCard setup={parsedJson?.trade_setup} isLoading={isStreaming && !parsedJson} />

      <SignalVisualizerChart data={parsedJson} symbol={symbol} />

      <SmartSuggestions data={parsedJson} symbol={symbol} onSelectAction={onSelectAction} />

      <PineScriptEditor data={parsedJson} symbol={symbol} isLoading={isStreaming && !parsedJson} />

      <AIReasoningBadges badges={parsedJson?.reasoning_badges} isLoading={isStreaming && !parsedJson} />

      <AIChatWidget symbol={symbol} analysisSummary={parsedJson} />

      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-4">
        <div
          onClick={() => setShowMarkdown(!showMarkdown)}
          className="flex items-center justify-between cursor-pointer border-b border-[#1c1d22] pb-3"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#cc9166]" />
            <span className="text-[13px] text-[#e2e3e9] font-sans font-medium">
              Full Report
            </span>
          </div>
          <button className="flex items-center gap-1 text-[13px] text-[#5e616e] hover:text-[#e2e3e9] transition-colors">
            <span>{showMarkdown ? 'Hide' : 'Expand'}</span>
            {showMarkdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showMarkdown && (
          <div className="pt-2 max-h-[600px] overflow-y-auto pr-2 prose prose-invert max-w-none prose-headings:font-ivy-presto prose-headings:font-normal prose-headings:text-[#ffffff] prose-h2:text-base prose-h2:border-b prose-h2:border-[#1c1d22] prose-h2:pb-1.5 prose-h3:text-xs prose-p:text-[#e2e3e9] prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-li:text-[#e2e3e9] prose-strong:text-[#cc9166]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownText}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
