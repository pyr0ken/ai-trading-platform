'use client';

import React, { useState } from 'react';
import { Code2, Copy, Check, Terminal } from 'lucide-react';
import { StructuredLLMOutput } from '@/types/terminal';
import { generateAdvancedPineScriptCode } from '@/lib/tradingview/pine-generator';

interface PineScriptCardProps {
  data?: StructuredLLMOutput | null;
  symbol: string;
  isLoading?: boolean;
}

export const PineScriptCard: React.FC<PineScriptCardProps> = ({ data, symbol, isLoading }) => {
  const [copied, setCopied] = useState(false);

  const pineCode = generateAdvancedPineScriptCode(data ?? null, symbol);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pineCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = pineCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#18181b] border border-[#27272a] rounded-[24px] p-6 text-[#f5f5f4] animate-pulse space-y-4">
        <div className="h-6 w-48 bg-[#27272a] rounded-full" />
        <div className="h-32 bg-[#121214] rounded-[10px]" />
      </div>
    );
  }

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-[24px] p-6 text-[#f5f5f4] shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#fbe1d1]" />
          <span className="text-xs text-[#71717a] font-normal tracking-wide uppercase">
            TRADINGVIEW PINE SCRIPT V5
          </span>
        </div>
        <span className="text-[10px] text-[#fbe1d1] font-mono bg-[#2a140d] border border-[#5d2a1a] px-2.5 py-0.5 rounded-full">
          Overlay Indicator
        </span>
      </div>

      <p className="text-xs text-[#a1a1aa] leading-relaxed">
        Copy this auto-generated <strong>Pine Script v5</strong> code to overlay entry bounds, target levels (TP1/2/3), and stop loss on your TradingView chart.
      </p>

      {/* Copy Code Button Bar */}
      <div className="flex items-center justify-between bg-[#121214] border border-[#27272a] p-2.5 rounded-[10px]">
        <div className="flex items-center gap-2 text-xs font-mono text-[#f5f5f4]">
          <Terminal className="w-4 h-4 text-[#fbe1d1]" />
          <span>{symbol.replace('/', '')}_Steep_AI_Signal.pine</span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : 'bg-[#f5f5f4] hover:bg-[#e7e7e4] text-[#0c0a09]'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Pine Script</span>
            </>
          )}
        </button>
      </div>

      {/* Code Block Preview */}
      <div className="relative bg-[#0c0a09] border border-[#27272a] rounded-[10px] p-4 max-h-48 overflow-y-auto font-mono text-[11px] text-[#a1a1aa] leading-relaxed scrollbar-thin">
        <pre className="whitespace-pre-wrap select-all">{pineCode}</pre>
      </div>

      {/* Quick Usage Steps */}
      <div className="bg-[#121214] border border-[#27272a] rounded-[10px] p-3.5 text-xs text-[#71717a] space-y-1.5">
        <span className="text-[#f5f5f4] font-semibold text-[11px] block">
          How to use in TradingView:
        </span>
        <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#a1a1aa]">
          <li>Click <strong>Copy Pine Script</strong> above.</li>
          <li>Open TradingView and click the <strong>Pine Editor</strong> tab at the bottom.</li>
          <li>Paste the code into the editor and click <strong>Add to Chart</strong>.</li>
        </ol>
      </div>
    </div>
  );
};
