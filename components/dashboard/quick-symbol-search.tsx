'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, TrendingUp, X, Sparkles, Check, ArrowRight } from 'lucide-react';

interface QuickSymbolSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: string, exchange?: string) => void;
  currentSymbol: string;
}

// Top crypto market pairs for search autocomplete
const POPULAR_SYMBOLS = [
  { symbol: 'BTC/USDT', name: 'Bitcoin', category: 'Major' },
  { symbol: 'ETH/USDT', name: 'Ethereum', category: 'Major' },
  { symbol: 'SOL/USDT', name: 'Solana', category: 'Layer 1' },
  { symbol: 'SUI/USDT', name: 'Sui Network', category: 'Layer 1' },
  { symbol: 'XRP/USDT', name: 'Ripple', category: 'Payment' },
  { symbol: 'BNB/USDT', name: 'BNB Chain', category: 'Major' },
  { symbol: 'DOGE/USDT', name: 'Dogecoin', category: 'Meme' },
  { symbol: 'AVAX/USDT', name: 'Avalanche', category: 'Layer 1' },
  { symbol: 'LINK/USDT', name: 'Chainlink', category: 'Oracle' },
  { symbol: 'ADA/USDT', name: 'Cardano', category: 'Layer 1' },
  { symbol: 'NEAR/USDT', name: 'NEAR Protocol', category: 'AI & Data' },
  { symbol: 'FET/USDT', name: 'Artificial Superintelligence', category: 'AI' },
  { symbol: 'RENDER/USDT', name: 'Render Network', category: 'AI & DePIN' },
  { symbol: 'PEPE/USDT', name: 'Pepe', category: 'Meme' },
  { symbol: 'SHIB/USDT', name: 'Shiba Inu', category: 'Meme' },
  { symbol: 'DOT/USDT', name: 'Polkadot', category: 'Layer 0' },
  { symbol: 'APT/USDT', name: 'Aptos', category: 'Layer 1' },
  { symbol: 'ARB/USDT', name: 'Arbitrum', category: 'Layer 2' },
  { symbol: 'OP/USDT', name: 'Optimism', category: 'Layer 2' },
  { symbol: 'INJ/USDT', name: 'Injective', category: 'DeFi' },
  { symbol: 'TIA/USDT', name: 'Celestia', category: 'Modular' },
  { symbol: 'SEI/USDT', name: 'Sei Network', category: 'Layer 1' },
  { symbol: 'WIF/USDT', name: 'dogwifhat', category: 'Meme' },
  { symbol: 'FLOKI/USDT', name: 'Floki', category: 'Meme' },
  { symbol: 'UNI/USDT', name: 'Uniswap', category: 'DeFi' },
  { symbol: 'LTC/USDT', name: 'Litecoin', category: 'Major' },
  { symbol: 'ATOM/USDT', name: 'Cosmos', category: 'Layer 0' },
];

export const QuickSymbolSearch: React.FC<QuickSymbolSearchProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  currentSymbol,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const cleanQuery = query.trim().toUpperCase();
  
  // Format custom query into valid symbol string if not directly matched
  const customFormattedSymbol = cleanQuery.includes('/')
    ? cleanQuery
    : cleanQuery ? `${cleanQuery}/USDT` : '';

  const filteredSymbols = POPULAR_SYMBOLS.filter(
    (item) =>
      item.symbol.toLowerCase().includes(query.toLowerCase()) ||
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const selectAndClose = (sym: string) => {
    const formatted = sym.toUpperCase().includes('/') ? sym.toUpperCase() : `${sym.toUpperCase()}/USDT`;
    onSelectSymbol(formatted);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredSymbols.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredSymbols.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSymbols[selectedIndex]) {
        selectAndClose(filteredSymbols[selectedIndex].symbol);
      } else if (customFormattedSymbol) {
        selectAndClose(customFormattedSymbol);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/80 backdrop-blur-md transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#040406] border border-[#1c1d22] rounded-[12px] shadow-2xl overflow-hidden flex flex-col mx-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Box Header */}
        <div className="flex items-center px-4 border-b border-[#1c1d22] bg-[#08080a]">
          <Search className="w-4 h-4 text-[#cc9166] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search crypto pair, coin symbol... (e.g. BTC, ETH, SOL, LINK)"
            className="w-full bg-transparent py-4 text-sm text-[#e2e3e9] placeholder-[#5e616e] outline-none font-sans"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 text-[#5e616e] hover:text-[#e2e3e9] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-[#5e616e] bg-[#121317] border border-[#1c1d22] px-2 py-0.5 rounded-[4px]">
              ESC to close
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#5e616e] flex items-center justify-between">
            <span>Available Markets</span>
            <span>Use Arrow keys ↑ ↓ & Enter</span>
          </div>

          {/* Custom Search Option if user typed custom text not matching exact list */}
          {cleanQuery && !filteredSymbols.some((s) => s.symbol === customFormattedSymbol) && (
            <div
              onClick={() => selectAndClose(customFormattedSymbol)}
              className="flex items-center justify-between px-3 py-2.5 rounded-[8px] cursor-pointer bg-[#cc9166]/10 border border-[#cc9166]/40 text-[#ffffff] hover:bg-[#cc9166]/20 transition-all mb-2"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#cc9166]" />
                <span className="font-mono text-xs text-[#cc9166]">
                  Search custom symbol: <strong className="text-white font-bold">{customFormattedSymbol}</strong>
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#cc9166]" />
            </div>
          )}

          {filteredSymbols.length > 0 ? (
            filteredSymbols.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isCurrent = item.symbol === currentSymbol;

              return (
                <div
                  key={item.symbol}
                  onClick={() => selectAndClose(item.symbol)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-[8px] cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#121317] border border-[#cc9166]/40 text-[#ffffff]'
                      : 'hover:bg-[#121317]/50 text-[#9194a1] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                        isCurrent
                          ? 'bg-[#cc9166]/20 text-[#cc9166] border border-[#cc9166]'
                          : 'bg-[#1c1d22] text-[#e2e3e9]'
                      }`}
                    >
                      {item.symbol.substring(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#e2e3e9]">
                          {item.symbol}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] bg-[#cc9166]/20 text-[#cc9166] px-1.5 py-0.2 rounded-full font-mono flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Selected
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#5e616e]">{item.name}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[#5e616e] bg-[#08080a] border border-[#1c1d22] px-2 py-0.5 rounded-[4px]">
                    {item.category}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-[#5e616e] space-y-2">
              <Sparkles className="w-6 h-6 text-[#cc9166] mx-auto" />
              <p className="text-xs">No direct preset match for &quot;{query}&quot;</p>
              {customFormattedSymbol && (
                <button
                  onClick={() => selectAndClose(customFormattedSymbol)}
                  className="mt-2 text-xs text-[#cc9166] hover:underline font-mono inline-flex items-center gap-1 bg-[#121317] border border-[#cc9166]/40 px-3 py-1.5 rounded-[6px]"
                >
                  Switch to &quot;{customFormattedSymbol}&quot; &rarr;
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-[#08080a] border-t border-[#1c1d22] flex items-center justify-between text-[11px] text-[#5e616e]">
          <span className="flex items-center gap-1.5 font-mono">
            <TrendingUp className="w-3.5 h-3.5 text-[#cc9166]" /> Instant Exchange Ticker
          </span>
          <span>Click any symbol or press Enter</span>
        </div>
      </div>
    </div>
  );
};
