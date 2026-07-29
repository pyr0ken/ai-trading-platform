'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Star,
  Pin,
  Trash2,
  Plus,
  Search,
  Download,
  Upload,
  X,
  Coins,
  Sparkles,
} from 'lucide-react';
import { AppStorageEngine, WatchlistItem } from '@/lib/storage/app-db';
import { TOP_300_COINS } from '@/lib/constants/top-coins';
import { CoinIcon } from '@/components/common/coin-icon';

interface WatchlistManagerProps {
  onSelectCoin: (symbol: string) => void;
  selectedSymbol: string;
}

export const WatchlistManager: React.FC<WatchlistManagerProps> = ({
  onSelectCoin,
  selectedSymbol,
}) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    return AppStorageEngine.getWatchlist();
  });
  const [search, setSearch] = useState('');
  const [customCoinInput, setCustomCoinInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'favorites' | 'pinned'>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

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

  const handleTogglePin = (symbol: string) => {
    const updated = AppStorageEngine.togglePin(symbol);
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
    if (filterTab === 'pinned') return item.pinned;
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
    <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 min-h-screen">
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] w-full max-w-xl p-6 text-[#e2e3e9] space-y-5 my-auto">
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
                Organize, pin & sync top 300+ crypto pairs
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
            <button
              onClick={() => setFilterTab('pinned')}
              className={`px-3 py-1 rounded-[9999px] transition-all cursor-pointer ${
                filterTab === 'pinned'
                  ? 'bg-[#ffffff] text-[#08080a] font-semibold'
                  : 'text-[#9194a1] hover:text-[#e2e3e9]'
              }`}
            >
              Pinned ({watchlist.filter((i) => i.pinned).length})
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

        {/* Watchlist Items Grid */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
          {filteredList.length === 0 ? (
            <div className="text-center text-[#777a88] py-8">
              No coins found matching criteria.
            </div>
          ) : (
            filteredList.map((item) => {
              const isSelected = selectedSymbol === item.symbol;
              return (
                <div
                  key={item.symbol}
                  onClick={() => {
                    onSelectCoin(item.symbol);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between p-3.5 rounded-[10px] border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#121317] border-[#cc9166] text-[#e2e3e9]'
                      : 'bg-[#121317] border-[#1c1d22] text-[#e2e3e9] hover:border-[#777a88]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(item.symbol);
                      }}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          item.favorite
                            ? 'text-[#cc9166] fill-[#cc9166]'
                            : 'text-[#5e616e] hover:text-[#e2e3e9]'
                        }`}
                      />
                    </button>

                    <CoinIcon symbol={item.symbol} size={24} />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#ffffff]">{item.symbol}</span>
                        {item.pinned && (
                          <span className="text-[9px] bg-[#1c1d22] text-[#cc9166] px-1.5 py-0.2 rounded-[9999px] uppercase">
                            Pinned
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#9194a1] uppercase font-sans">
                        Venue: {item.exchange}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(item.symbol);
                      }}
                      title="Pin to top"
                      className="p-1.5 rounded-[9999px] text-[#5e616e] hover:text-[#cc9166] hover:bg-[#1c1d22] transition-all cursor-pointer"
                    >
                      <Pin className={`w-3.5 h-3.5 ${item.pinned ? 'text-[#cc9166]' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCoin(item.symbol);
                      }}
                      title="Remove symbol"
                      className="p-1.5 rounded-[9999px] text-[#5e616e] hover:text-rose-400 hover:bg-[#1c1d22] transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
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
        <Star className="w-3.5 h-3.5 text-[#cc9166] fill-[#cc9166]" />
        <span>Watchlist ({watchlist.length})</span>
      </button>

      {mounted && isOpen && createPortal(modalContent, document.body)}
    </div>
  );
};

