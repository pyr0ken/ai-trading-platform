'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, TrendingUp, X, Sparkles, Check, ArrowRight, DollarSign, Globe, Layers, Cpu, ShieldAlert } from 'lucide-react';
import { ALL_MARKET_SYMBOLS, MarketSymbolItem } from '@/lib/constants/market-symbols';
import { CoinIcon } from '@/components/common/coin-icon';

interface QuickSymbolSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: string, exchange?: string) => void;
  currentSymbol: string;
}

type TabType = 'all' | 'crypto' | 'forex' | 'ai' | 'meme' | 'majors';

export const QuickSymbolSearch: React.FC<QuickSymbolSearchProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  currentSymbol,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveTab('all');
      setSelectedIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const cleanQuery = query.trim().toUpperCase();

  // Format custom query into valid symbol string if not directly matched
  const customFormattedSymbol = useMemo(() => {
    if (!cleanQuery) return '';
    if (cleanQuery.includes('/')) return cleanQuery;
    
    // Check if query matches a known forex currency base (e.g. EUR -> EUR/USD)
    if (['EUR', 'GBP', 'AUD', 'NZD', 'CAD', 'CHF', 'JPY', 'XAU', 'XAG'].includes(cleanQuery)) {
      return `${cleanQuery}/USD`;
    }
    return `${cleanQuery}/USDT`;
  }, [cleanQuery]);

  // Filter 1000+ symbols based on search query & active tab
  const filteredSymbols = useMemo(() => {
    let dataset = ALL_MARKET_SYMBOLS;

    if (activeTab === 'crypto') {
      dataset = dataset.filter((item) => item.type === 'crypto');
    } else if (activeTab === 'forex') {
      dataset = dataset.filter((item) => item.type === 'forex' || item.type === 'commodity' || item.type === 'index');
    } else if (activeTab === 'ai') {
      dataset = dataset.filter((item) => item.category.toLowerCase().includes('ai') || item.category.toLowerCase().includes('depin'));
    } else if (activeTab === 'meme') {
      dataset = dataset.filter((item) => item.category.toLowerCase().includes('meme'));
    } else if (activeTab === 'majors') {
      dataset = dataset.filter((item) => item.category.toLowerCase().includes('major'));
    }

    if (!cleanQuery) {
      return dataset.slice(0, 80); // Cap initial list for ultra-fast rendering
    }

    const qLower = cleanQuery.toLowerCase();
    const matches = dataset.filter(
      (item) =>
        item.symbol.toLowerCase().includes(qLower) ||
        item.base.toLowerCase().includes(qLower) ||
        item.name.toLowerCase().includes(qLower) ||
        item.category.toLowerCase().includes(qLower)
    );

    return matches.slice(0, 100); // Cap filtered results to top 100
  }, [activeTab, cleanQuery]);

  // Reset selected index when query or tab changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeTab]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listContainerRef.current) {
      const selectedEl = listContainerRef.current.children[selectedIndex + 1] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const selectAndClose = (item: MarketSymbolItem | string) => {
    let symStr = typeof item === 'string' ? item : item.symbol;
    let preferredExchange: string | undefined = undefined;

    if (typeof item !== 'string') {
      if (item.type === 'forex' || item.type === 'commodity' || item.type === 'index') {
        preferredExchange = 'forex';
      }
    } else {
      const cleanUpper = symStr.toUpperCase();
      if (cleanUpper.includes('EUR/') || cleanUpper.includes('GBP/') || cleanUpper.includes('USD/') || cleanUpper.includes('XAU/') || cleanUpper.includes('XAG/')) {
        preferredExchange = 'forex';
      }
    }

    const formatted = symStr.toUpperCase().includes('/') ? symStr.toUpperCase() : `${symStr.toUpperCase()}/USDT`;
    onSelectSymbol(formatted, preferredExchange);
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
        selectAndClose(filteredSymbols[selectedIndex]);
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 bg-black/85 backdrop-blur-md transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#040406] border border-[#1c1d22] rounded-[14px] shadow-2xl overflow-hidden flex flex-col mx-4 animate-in fade-in zoom-in-95 duration-150 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Box Header */}
        <div className="flex items-center px-4 border-b border-[#1c1d22] bg-[#08080a] relative">
          <Search className="w-4 h-4 text-[#cc9166] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search 1,000+ Crypto & Forex pairs (e.g. BTC, EUR/USD, SOL, XAU/USD, ETH)..."
            className="w-full bg-transparent py-4 text-sm text-[#e2e3e9] placeholder-[#5e616e] outline-none font-sans"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
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

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#08080a]/80 border-b border-[#1c1d22] overflow-x-auto custom-scrollbar text-xs">
          {[
            { id: 'all', label: 'All Markets (1000+)' },
            { id: 'crypto', label: 'Crypto (500+)' },
            { id: 'forex', label: 'Forex & Metals (500+)' },
            { id: 'ai', label: 'AI & DePIN' },
            { id: 'meme', label: 'Meme Coins' },
            { id: 'majors', label: 'Majors' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#1c1d22] text-[#cc9166] border border-[#cc9166]/40 shadow-sm'
                    : 'text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#121317]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div ref={listContainerRef} className="max-h-[420px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#5e616e] flex items-center justify-between">
            <span>
              Showing {filteredSymbols.length} Market Matches
            </span>
            <span>Use Arrow keys ↑ ↓ &amp; Enter</span>
          </div>

          {/* Custom Search Option if user typed custom text not matching exact list */}
          {cleanQuery && !filteredSymbols.some((s) => s.symbol === customFormattedSymbol) && (
            <div
              onClick={() => selectAndClose(customFormattedSymbol)}
              className="flex items-center justify-between px-3 py-2.5 rounded-[8px] cursor-pointer bg-[#cc9166]/10 border border-[#cc9166]/40 text-[#ffffff] hover:bg-[#cc9166]/20 transition-all mb-2"
            >
              <div className="flex items-center gap-2.5">
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
              const isCrypto = item.type === 'crypto';
              const isForex = item.type === 'forex';
              const isCommodity = item.type === 'commodity' || item.type === 'index';

              return (
                <div
                  key={item.symbol}
                  onClick={() => selectAndClose(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-[8px] cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#121317] border border-[#cc9166]/40 text-[#ffffff] shadow-md'
                      : 'hover:bg-[#121317]/50 text-[#9194a1] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon / Flag Avatar Badge */}
                    {isCrypto ? (
                      <CoinIcon symbol={item.symbol} size={32} className="shrink-0 shadow-sm" />
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-[8px] flex items-center justify-center font-mono text-sm font-bold shrink-0 ${
                          isCurrent
                            ? 'bg-[#cc9166]/20 text-[#cc9166] border border-[#cc9166]'
                            : isForex
                            ? 'bg-[#121317] text-sky-400 border border-sky-500/30'
                            : 'bg-[#121317] text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {item.flag || item.icon || item.symbol.substring(0, 3)}
                      </div>
                    )}

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

                  <div className="flex items-center gap-2">
                    {/* Asset Type Badge */}
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] border uppercase font-bold ${
                        isCrypto
                          ? 'bg-[#121317] text-[#cc9166] border-[#1c1d22]'
                          : isForex
                          ? 'bg-sky-950/40 text-sky-400 border-sky-500/40'
                          : 'bg-amber-950/40 text-amber-400 border-amber-500/40'
                      }`}
                    >
                      {item.type}
                    </span>

                    <span className="text-[10px] font-mono text-[#5e616e] bg-[#08080a] border border-[#1c1d22] px-2 py-0.5 rounded-[4px] hidden sm:inline-block">
                      {item.category}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-[#5e616e] space-y-3">
              <Sparkles className="w-6 h-6 text-[#cc9166] mx-auto" />
              <p className="text-xs text-[#9194a1]">No preset match found for &quot;{query}&quot;</p>
              {customFormattedSymbol && (
                <button
                  onClick={() => selectAndClose(customFormattedSymbol)}
                  className="mt-2 text-xs text-[#cc9166] hover:underline font-mono inline-flex items-center gap-1.5 bg-[#121317] border border-[#cc9166]/40 px-3.5 py-2 rounded-[6px] cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Auto-complete to &quot;{customFormattedSymbol}&quot;
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#08080a] border-t border-[#1c1d22] flex items-center justify-between text-[11px] text-[#5e616e]">
          <span className="flex items-center gap-1.5 font-mono">
            <TrendingUp className="w-3.5 h-3.5 text-[#cc9166]" /> 1,000+ Crypto &amp; Forex Institutional Pairs
          </span>
          <span>Click any symbol or press Enter</span>
        </div>
      </div>
    </div>
  );
};
