'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowRight, ChevronDown, ChevronUp, FileText, Compass, Sparkles, Copy, Check, Share2, Code2 } from 'lucide-react';
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
import { showToast } from '@/components/terminal/toast';

interface AnalysisCardProps {
  content: string;
  isStreaming: boolean;
  isLoading: boolean;
  symbol: string;
  exchange: string;
  timeframe: string;
  analysisMode?: 'scalp' | 'swing';
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
  analysisMode = 'swing',
  logSteps,
  hasRun,
  onRunAnalysis,
  onSelectAction = () => {},
}) => {
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [copied, setCopied] = useState(false);

  let parsedJson: StructuredLLMOutput | null = null;
  let markdownText = content;

  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      parsedJson = JSON.parse(jsonMatch[1]);
      markdownText = content.replace(/```json[\s\S]*?```/, '').trim();
    }
  } catch {
    // Ignore JSON parse errors
  }

  const handleCopyJSON = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      showToast('📋 Copied AI Quant Signal JSON report to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!hasRun && !content) {
    return (
      <div className="bg-[#040406] border border-[#1c1d22] text-[#e2e3e9] rounded-[12px] p-6 md:p-8 min-h-[720px] flex flex-col justify-between relative overflow-hidden shadow-2xl transition-all duration-300">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#cc9166]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Feature Tag */}
        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between border-b border-[#1c1d22] pb-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#cc9166]">
              <Sparkles className="w-4 h-4" />
              <span>AI QUANT SIGNAL TERMINAL</span>
            </div>
            <span className="text-[10px] font-mono bg-[#121317] border border-[#1c1d22] px-2.5 py-1 rounded-[6px] text-[#9194a1] uppercase">
              {analysisMode} Horizon
            </span>
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-mono text-[#cc9166] uppercase tracking-wider block">
              Autonomous Deep Intelligence
            </span>
            <h2 className="font-ivy-presto text-[32px] md:text-[42px] font-normal text-[#ffffff] leading-tight">
              AI Signal Engine
            </h2>
            <p className="text-xs text-[#9194a1] leading-relaxed max-w-md font-sans">
              Synthesizing multi-timeframe OHLCV, server-side indicators, order book microstructure, and macro sentiment into an executive trade setup with visual level mapping and Pine Script v5 export.
            </p>
          </div>

          {/* Key Intelligence Pillars */}
          <div className="grid grid-cols-1 gap-2.5 pt-2 text-xs font-mono">
            <div className="flex items-center gap-2 bg-[#121317] border border-[#1c1d22] p-2.5 rounded-[8px]">
              <span className="w-2 h-2 rounded-full bg-[#cc9166]" />
              <span className="text-[#e2e3e9]">Multi-Timeframe Trend &amp; Confluence Radar</span>
            </div>
            <div className="flex items-center gap-2 bg-[#121317] border border-[#1c1d22] p-2.5 rounded-[8px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[#e2e3e9]">Deterministic Preflight Fact-Checking</span>
            </div>
            <div className="flex items-center gap-2 bg-[#121317] border border-[#1c1d22] p-2.5 rounded-[8px]">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-[#e2e3e9]">Risk &amp; Leverage Position Calculator</span>
            </div>
          </div>
        </div>

        {/* Bottom Execution Action */}
        <div className="w-full space-y-4 pt-6 border-t border-[#1c1d22] relative z-10">
          <div className="flex items-center justify-between text-xs font-mono text-[#5e616e]">
            <span>Symbol: <strong className="text-[#e2e3e9]">{symbol}</strong></span>
            <span>Venue: <strong className="text-[#cc9166]">{exchange.toUpperCase()} ({timeframe})</strong></span>
          </div>

          <button
            onClick={onRunAnalysis}
            className="w-full py-3.5 px-6 rounded-[9999px] bg-gradient-to-r from-[#cc9166] via-[#ae9357] to-[#cc9166] text-[#08080a] text-xs font-bold font-sans tracking-wide hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-[0_0_20px_rgba(204,145,102,0.3)] flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 fill-[#08080a]" />
            <span>Run AI Quant Analysis ({symbol})</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && !content) {
    return <AnalysisSkeleton steps={logSteps} />;
  }

  return (
    <div className="bg-[#08080a] space-y-5 min-h-[760px]">
      {/* Top Quick Bar for Report Controls */}
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] px-4 py-2.5 text-xs font-mono flex items-center justify-between text-[#9194a1]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[#e2e3e9] font-medium">{symbol} AI Report</span>
          <span className="text-[10px] text-[#5e616e] uppercase">({timeframe})</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJSON}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-[#e2e3e9] hover:text-[#cc9166] transition-all cursor-pointer"
            title="Copy Report JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <ExecutiveSignalCard data={parsedJson} isLoading={isStreaming && !parsedJson} />

      <TradeSetupCard setup={parsedJson?.trade_setup} isLoading={isStreaming && !parsedJson} symbol={symbol} />

      <SignalVisualizerChart data={parsedJson} symbol={symbol} exchange={exchange} timeframe={timeframe} />

      <SmartSuggestions data={parsedJson} symbol={symbol} onSelectAction={onSelectAction} />

      <PineScriptEditor data={parsedJson} symbol={symbol} isLoading={isStreaming && !parsedJson} />

      <AIReasoningBadges badges={parsedJson?.reasoning_badges} isLoading={isStreaming && !parsedJson} />

      <AIChatWidget symbol={symbol} analysisSummary={parsedJson} />

      {analysisMode !== 'scalp' ? (
        <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] space-y-4">
          <div
            onClick={() => setShowMarkdown(!showMarkdown)}
            className="flex items-center justify-between cursor-pointer border-b border-[#1c1d22] pb-3"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#cc9166]" />
              <span className="text-xs text-[#e2e3e9] font-mono font-semibold uppercase">
                Detailed Quant Report
              </span>
            </div>
            <button className="flex items-center gap-1 text-xs text-[#5e616e] hover:text-[#e2e3e9] transition-colors cursor-pointer">
              <span>{showMarkdown ? 'Collapse' : 'Expand Report'}</span>
              {showMarkdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showMarkdown && (
            <div className="pt-2 max-h-[600px] overflow-y-auto pr-2 prose prose-invert max-w-none prose-headings:font-ivy-presto prose-headings:font-normal prose-headings:text-[#ffffff] prose-h2:text-base prose-h2:border-b prose-h2:border-[#1c1d22] prose-h2:pb-1.5 prose-h3:text-xs prose-p:text-[#e2e3e9] prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-li:text-[#e2e3e9] prose-strong:text-[#cc9166]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownText}</ReactMarkdown>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#040406] border border-rose-950/60 rounded-[10px] p-6 text-center text-rose-400 font-sans text-xs">
          <span>Scalp Mode Active: Deep report skipped for latency optimization.</span>
        </div>
      )}
    </div>
  );
};
