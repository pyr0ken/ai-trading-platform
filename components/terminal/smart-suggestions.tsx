'use client';

import React from 'react';
import { Sparkles, ArrowRight, Code2, LineChart, ShieldAlert, FileText, Zap } from 'lucide-react';
import { StructuredLLMOutput } from '@/types/terminal';

interface SmartSuggestionsProps {
  data?: StructuredLLMOutput | null;
  symbol: string;
  onSelectAction: (actionText: string) => void;
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ data, symbol, onSelectAction }) => {
  if (!data) return null;

  const suggestions = [
    { label: `Compare ${symbol} with ETH/USDT`, action: `Compare ${symbol} relative performance and correlation with ETH/USDT` },
    { label: 'Export Pine Script Overlay', action: 'Generate Pine Script' },
    { label: 'Explain RSI & MACD Divergence', action: `Explain RSI and MACD momentum divergence on ${symbol}` },
    { label: 'Show Bull vs Bear Scenarios', action: `Detail the Bullish target and Bearish invalidation levels for ${symbol}` },
    { label: 'Estimate 24h Price Probability', action: `Provide probability estimates for ${symbol} over the next 24h` },
  ];

  return (
    <div className="bg-[#18181b]/90 border border-[#27272a] backdrop-blur-xl rounded-[24px] p-5 text-[#f5f5f4] shadow-2xl space-y-3 hover:border-[#fbe1d1]/30 transition-all duration-300">
      <div className="flex items-center gap-2 border-b border-[#27272a] pb-2.5">
        <Sparkles className="w-4 h-4 text-[#fbe1d1]" />
        <span className="text-xs text-[#71717a] font-normal tracking-wide uppercase">
          SMART AI FOLLOW-UP ACTIONS
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectAction(item.action)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121214] hover:bg-[#27272a] border border-[#27272a] text-xs text-[#fbe1d1] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{item.label}</span>
            <ArrowRight className="w-3 h-3 text-[#fbe1d1]" />
          </button>
        ))}
      </div>
    </div>
  );
};
