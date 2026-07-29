'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { StructuredLLMOutput } from '@/types/terminal';

interface SmartSuggestionsProps {
  data?: StructuredLLMOutput | null;
  symbol: string;
  onSelectAction: (actionText: string) => void;
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ data, symbol, onSelectAction }) => {
  if (!data) return null;

  const suggestions = [
    { label: `Compare ${symbol} with ETH/USDT >`, action: `Compare ${symbol} relative performance and correlation with ETH/USDT` },
    { label: 'Export Pine Script Overlay >', action: 'Generate Pine Script' },
    { label: 'Explain RSI & MACD Divergence >', action: `Explain RSI and MACD momentum divergence on ${symbol}` },
    { label: 'Show Bull vs Bear Scenarios >', action: `Detail the Bullish target and Bearish invalidation levels for ${symbol}` },
    { label: 'Estimate 24h Price Probability >', action: `Provide probability estimates for ${symbol} over the next 24h` },
  ];

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-5 text-[#e2e3e9] space-y-3">
      <div className="flex items-center gap-2 border-b border-[#1c1d22] pb-2.5">
        <Sparkles className="w-4 h-4 text-[#cc9166]" />
        <span className="eyebrow-copper uppercase">
          SMART AI FOLLOW-UP ACTIONS
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectAction(item.action)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-none bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] hover:border-[#cc9166] text-xs font-mono text-[#e2e3e9] hover:text-[#cc9166] transition-all cursor-pointer"
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
