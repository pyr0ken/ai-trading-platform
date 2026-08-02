'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  Copy,
  Check,
  Zap,
  Target,
  ShieldCheck,
  Code2,
  Cpu,
} from 'lucide-react';
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
      <div className="bg-[#040406] border border-[#1c1d22] text-[#e2e3e9] rounded-[10px] p-6 min-h-[580px] flex flex-col justify-between relative overflow-hidden shadow-2xl transition-all duration-300">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#cc9166]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="space-y-5 relative z-10">
          <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3.5">
            <div className="flex items-center gap-2 text-xs font-mono text-[#cc9166]">
              <Cpu className="w-4 h-4 text-[#cc9166]" />
              <span className="font-bold tracking-wide uppercase">AI QUANT SIGNAL TERMINAL</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="bg-[#121317] border border-[#1c1d22] px-2.5 py-0.5 rounded-[4px] text-[#9194a1]">
                {symbol}
              </span>
              <span className="bg-[#121317] border border-[#1c1d22] px-2.5 py-0.5 rounded-[4px] text-[#cc9166] uppercase">
                {exchange.toUpperCase()} ({timeframe})
              </span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5">
            <h2 className="font-ivy-presto text-[28px] md:text-[36px] font-normal text-[#ffffff] leading-tight">
              Autonomous AI Signal Engine
            </h2>
            <p className="text-xs text-[#9194a1] leading-relaxed max-w-lg font-sans">
              Synthesizing multi-timeframe OHLCV, server-side indicators, order book microstructure, and macro sentiment into an executive trade setup with Pine Script v5 export.
            </p>
          </div>

          {/* Minimal 2x2 Feature Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
            <div className="bg-[#121317] border border-[#1c1d22] p-3 rounded-[8px] space-y-1">
              <div className="flex items-center gap-1.5 text-[#cc9166] font-bold text-[11px]">
                <Zap className="w-3.5 h-3.5 text-[#cc9166]" />
                <span>Multi-Timeframe Radar</span>
              </div>
              <p className="text-[10px] text-[#9194a1] font-sans">
                Scans 5m, 15m, 1h, 4h &amp; 1D confluence across trend and momentum
              </p>
            </div>

            <div className="bg-[#121317] border border-[#1c1d22] p-3 rounded-[8px] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>Trade Setup Calculator</span>
              </div>
              <p className="text-[10px] text-[#9194a1] font-sans">
                Optimal Entry range, Stop Loss, Take Profit 1–3 &amp; Leverage bounds
              </p>
            </div>

            <div className="bg-[#121317] border border-[#1c1d22] p-3 rounded-[8px] space-y-1">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                <span>Risk &amp; Invalidation Scan</span>
              </div>
              <p className="text-[10px] text-[#9194a1] font-sans">
                Orderbook delta, CVD &amp; liquidity pool fact-checking before execution
              </p>
            </div>

            <div className="bg-[#121317] border border-[#1c1d22] p-3 rounded-[8px] space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Pine Script v5 Export</span>
              </div>
              <p className="text-[10px] text-[#9194a1] font-sans">
                Generates copyable TradingView indicator script for visual charting
              </p>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-6 border-t border-[#1c1d22] relative z-10 space-y-2">
          <button
            onClick={onRunAnalysis}
            className="w-full py-3.5 px-6 rounded-[9999px] bg-gradient-to-r from-[#cc9166] via-[#ae9357] to-[#cc9166] text-[#08080a] text-xs font-bold font-sans tracking-wide hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-[0_0_20px_rgba(204,145,102,0.35)] flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 fill-[#08080a]" />
            <span>Execute AI Quant Analysis ({symbol})</span>
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
