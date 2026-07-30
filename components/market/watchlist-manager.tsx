'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Star,
  Plus,
  Search,
  Download,
  Upload,
  X,
  Coins,
  Sparkles,
  Grid3X3,
} from 'lucide-react';
import { AppStorageEngine, WatchlistItem } from '@/lib/storage/app-db';
import { TOP_300_COINS } from '@/lib/constants/top-coins';
import { CoinIcon } from '@/components/common/coin-icon';

interface WatchlistManagerProps {
  onSelectCoin: (symbol: string) => void;
  selectedSymbol: string;
  openExternal?: boolean;
  onOpened?: () => void;
}

export const WatchlistManager: React.FC<WatchlistManagerProps> = ({
  onSelectCoin,
  selectedSymbol,
  openExternal,
  onOpened,
}) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    return AppStorageEngine.getWatchlist();
  });
  const [search, setSearch] = useState('');
  const [customCoinInput, setCustomCoinInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'favorites'>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  // Open modal from external trigger (e.g. top-bar coin click)
  useEffect(() => {
    if (openExternal && !isOpen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        onOpened?.();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [openExternal, isOpen, onOpened]);

  const handleAddDirectSymbol = (symbolToAdd: string) => {
    const updated = AppStorageEngine.addCoinToWatchlist(symbolToAdd);
    setWatchlist(updated);
    setCustomCoinInput('');
    setShowSuggestions(false);
  };

  const handleAddCoin = () => {
    const coin = customCoinInput.trim().toUpperCase();
    if (!coin) return;
    const formatted = coin.includes('/') ? coin : `${coin}/USDT`;
    handleAddDirectSymbol(formatted);
  };

  const handleRemoveCoin = (symbol: string) => {
    const updated = AppStorageEngine.removeCoinFromWatchlist(symbol);
    setWatchlist(updated);
  };

  const handleToggleFavorite = (symbol: string) => {
    const updated = AppStorageEngine.toggleFavorite(symbol);
    setWatchlist(updated);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(watchlist, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', 'Watchlist_Export.json');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            AppStorageEngine.saveWatchlist(parsed);
            setWatchlist(parsed);
          }
        } catch {
          alert('Invalid JSON watchlist file format.');
        }
      };
    }
  };

  const filteredList = watchlist.filter((item) => {
    const matchesSearch = item.symbol.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterTab === 'favorites') return item.favorite;
    return true;
  });

  const suggestions = customCoinInput.trim()
    ? TOP_300_COINS.filter(
        (c) =>
          c.symbol.toLowerCase().includes(customCoinInput.toLowerCase()) ||
          c.name.toLowerCase().includes(customCoinInput.toLowerCase())
      ).slice(0, 8)
    : [];

  const modalContent = isOpen && mounted ? (
    <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 min-h-screen" onClick={() => setIsOpen(false)}>
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] w-full max-w-4xl p-5 text-[#e2e3e9] space-y-4 my-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1c1d22] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9999px] bg-[#121317] border border-[#cc9166] flex items-center justify-center text-[#cc9166]">
              <Coins className="w-4 h-4 text-[#cc9166]" />
            </div>
            <div>
              <h3 className="font-ivy-presto text-lg font-normal text-[#ffffff]">
                Crypto Watchlist Manager
              </h3>
              <span className="text-[11px] text-[#9194a1] font-mono">
                Organize & browse top 300+ crypto pairs
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-[9999px] text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#121317] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add Custom Coin Input */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#777a88] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search Top 300 crypto (e.g. BT, AVA, PEPE, SUI, TAO)..."
                value={customCoinInput}
                onChange={(e) => {
                  setCustomCoinInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (suggestions.length > 0) {
                      handleAddDirectSymbol(suggestions[0].symbol);
                    } else {
                      handleAddCoin();
                    }
                  }
                }}
                className="w-full bg-[#121317] border border-[#1c1d22] focus:border-[#777a88] rounded-[9999px] pl-10 pr-4 py-2 text-xs text-[#e2e3e9] placeholder-[#777a88] focus:outline-none transition-all"
              />
            </div>
            <button
              onClick={handleAddCoin}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[9999px] bg-[#ffffff] hover:bg-[#e2e3e9] text-[#08080a] text-xs font-semibold cursor-pointer shrink-0 transition-all"
            >
              <Plus className="w-4 h-4 text-[#08080a]" />
              <span>Add Symbol</span>
            </button>
          </div>

          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-[#121317] border border-[#1c1d22] rounded-[10px] p-2 space-y-1">
              <div className="px-3 py-1 text-[10px] text-[#9194a1] font-mono uppercase border-b border-[#1c1d22] mb-1 flex items-center justify-between">
                <span>Matching Top 300 Crypto Symbols</span>
                <Sparkles className="w-3 h-3 text-[#cc9166]" />
              </div>
              {suggestions.map((sug) => (
                <div
                  key={sug.symbol}
                  onClick={() => handleAddDirectSymbol(sug.symbol)}
                  className="flex items-center justify-between px-3.5 py-2 rounded-[9999px] hover:bg-[#1c1d22] cursor-pointer transition-all text-xs font-mono group"
                >
                  <div className="flex items-center gap-2.5">
                    <CoinIcon symbol={sug.symbol} size={20} />
                    <span className="font-bold text-[#cc9166]">
                      {sug.symbol}
                    </span>
                    <span className="text-[11px] text-[#9194a1] font-sans">({sug.name})</span>
                  </div>
                  <span className="text-[10px] bg-[#1c1d22] group-hover:bg-[#cc9166] group-hover:text-[#08080a] px-2 py-0.5 rounded-[9999px] text-[#e2e3e9] transition-all font-semibold">
                    + Add
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono border-b border-[#1c1d22] pb-3">
          <div className="flex items-center gap-1 bg-[#121317] border border-[#1c1d22] p-1 rounded-[9999px]">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 rounded-[9999px] transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-[#ffffff] text-[#08080a] font-semibold'
                  : 'text-[#9194a1] hover:text-[#e2e3e9]'
              }`}
            >
              All ({watchlist.length})
            </button>
            <button
              onClick={() => setFilterTab('favorites')}
              className={`px-3 py-1 rounded-[9999px] transition-all cursor-pointer ${
                filterTab === 'favorites'
                  ? 'bg-[#ffffff] text-[#08080a] font-semibold'
                  : 'text-[#9194a1] hover:text-[#e2e3e9]'
              }`}
            >
              Starred ({watchlist.filter((i) => i.favorite).length})
            </button>
          </div>

          <input
            type="text"
            placeholder="Filter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-36 bg-[#121317] border border-[#1c1d22] rounded-[9999px] px-3 py-1.5 text-xs text-[#e2e3e9] placeholder-[#777a88] focus:outline-none"
          />
        </div>

        {/* Watchlist Grid */}
        <div className="max-h-96 overflow-y-auto pr-1 font-mono text-xs">
          {filteredList.length === 0 ? (
            <div className="text-center text-[#777a88] py-8">
              No coins found matching criteria.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filteredList.map((item) => {
                const isSelected = selectedSymbol === item.symbol;
                return (
                  <div
                    key={item.symbol}
                    onClick={() => {
                      onSelectCoin(item.symbol);
                      setIsOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-[10px] border transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#121317] border-[#cc9166]'
                        : 'bg-[#121317] border-[#1c1d22] hover:border-[#777a88]'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(item.symbol);
                      }}
                      className="self-end -mb-2 p-0.5 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          item.favorite
                            ? 'text-[#cc9166] fill-[#cc9166]'
                            : 'text-[#5e616e] hover:text-[#e2e3e9]'
                        }`}
                      />
                    </button>

                    <CoinIcon symbol={item.symbol} size={28} />

                    <div>
                      <span className="font-bold text-sm text-[#ffffff] block">{item.symbol}</span>
                      <span className="text-[9px] text-[#9194a1] uppercase font-sans">{item.exchange}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCoin(item.symbol);
                      }}
                      title="Remove"
                      className="mt-1 px-2 py-0.5 rounded-[9999px] text-[9px] text-rose-400/60 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/30 transition-all cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#1c1d22] pt-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-[#9194a1] hover:text-[#e2e3e9] transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#cc9166]" />
              <span>Export</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-[#9194a1] hover:text-[#e2e3e9] transition-all cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[#cc9166]" />
              <span>Import</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>

          <span className="text-[11px] text-[#777a88]">Local Storage Synced</span>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-xs text-[#e2e3e9] transition-all cursor-pointer font-mono hover:border-[#777a88]"
      >
        <Grid3X3 className="w-3.5 h-3.5 text-[#cc9166]" />
        <span>Watchlist ({watchlist.length})</span>
      </button>

      {mounted && isOpen && createPortal(modalContent, document.body)}
    </div>
  );
};
