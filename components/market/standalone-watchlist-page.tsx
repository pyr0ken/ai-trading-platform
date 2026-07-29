'use client';

import React, { useState } from 'react';
import {
  Star,
  Pin,
  Trash2,
  Plus,
  Search,
  Download,
  Upload,
  Coins,
  Sparkles,
  Check,
} from 'lucide-react';
import { AppStorageEngine, WatchlistItem } from '@/lib/storage/app-db';
import { TOP_300_COINS } from '@/lib/constants/top-coins';
import { CoinIcon } from '@/components/common/coin-icon';

interface StandaloneWatchlistPageProps {
  onSelectCoin: (symbol: string) => void;
  selectedSymbol: string;
}

export const StandaloneWatchlistPage: React.FC<StandaloneWatchlistPageProps> = ({
  onSelectCoin,
  selectedSymbol,
}) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    return AppStorageEngine.getWatchlist();
  });
  const [search, setSearch] = useState('');
  const [customCoinInput, setCustomCoinInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'favorites' | 'pinned'>('all');

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
      ).slice(0, 10)
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-center space-y-2">
        <div className="w-12 h-12 rounded-[9999px] bg-[#121317] border border-[#cc9166] flex items-center justify-center text-[#cc9166] mx-auto">
          <Coins className="w-6 h-6 text-[#cc9166]" />
        </div>
        <h2 className="font-ivy-presto text-3xl font-normal text-[#ffffff]">
          Crypto Portfolio Watchlist Hub
        </h2>
        <p className="text-xs text-[#9194a1] font-mono max-w-xl mx-auto">
          Manage your top 300+ cryptocurrency watchlist pairs, starred favorites, and pinned assets.
        </p>
      </div>

      {/* Main Add & Autocomplete Search Card */}
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 space-y-5">
        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#777a88] absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Search Top 300 crypto pairs (e.g. BT, AVA, PEPE, SUI, TAO, SOL)..."
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
                className="w-full bg-[#121317] border border-[#1c1d22] focus:border-[#777a88] rounded-[9999px] pl-11 pr-4 py-3 text-xs text-[#e2e3e9] placeholder-[#777a88] focus:outline-none transition-all"
              />
            </div>
            <button
              onClick={handleAddCoin}
              className="flex items-center gap-2 px-6 py-3 rounded-[9999px] bg-[#ffffff] hover:bg-[#e2e3e9] text-[#08080a] text-xs font-semibold cursor-pointer shrink-0 transition-all"
            >
              <Plus className="w-4 h-4 text-[#08080a]" />
              <span>Add Symbol</span>
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-[#121317] border border-[#1c1d22] rounded-[10px] p-3 space-y-1">
              <div className="px-3 py-1.5 text-[10px] text-[#9194a1] font-mono uppercase border-b border-[#1c1d22] mb-1 flex items-center justify-between">
                <span>Matching Top 300 Crypto Symbols</span>
                <Sparkles className="w-3 h-3 text-[#cc9166]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {suggestions.map((sug) => (
                  <div
                    key={sug.symbol}
                    onClick={() => handleAddDirectSymbol(sug.symbol)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-[9999px] hover:bg-[#1c1d22] cursor-pointer transition-all text-xs font-mono group"
                  >
                    <div className="flex items-center gap-2.5">
                      <CoinIcon symbol={sug.symbol} size={20} />
                      <span className="font-bold text-[#cc9166]">
                        {sug.symbol}
                      </span>
                      <span className="text-[11px] text-[#9194a1] font-sans">({sug.name})</span>
                    </div>
                    <span className="text-[10px] bg-[#1c1d22] group-hover:bg-[#cc9166] group-hover:text-[#08080a] px-2.5 py-1 rounded-[9999px] text-[#e2e3e9] transition-all font-semibold">
                      + Add
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono border-t border-b border-[#1c1d22] py-4">
          <div className="flex items-center gap-2 bg-[#121317] border border-[#1c1d22] p-1 rounded-[9999px]">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-4 py-1.5 rounded-[9999px] transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-[#ffffff] text-[#08080a] font-bold'
                  : 'text-[#9194a1] hover:text-[#e2e3e9]'
              }`}
            >
              All Assets ({watchlist.length})
            </button>
            <button
              onClick={() => setFilterTab('favorites')}
              className={`px-4 py-1.5 rounded-[9999px] transition-all cursor-pointer ${
                filterTab === 'favorites'
                  ? 'bg-[#ffffff] text-[#08080a] font-bold'
                  : 'text-[#9194a1] hover:text-[#e2e3e9]'
              }`}
            >
              Starred ({watchlist.filter((i) => i.favorite).length})
            </button>
            <button
              onClick={() => setFilterTab('pinned')}
              className={`px-4 py-1.5 rounded-[9999px] transition-all cursor-pointer ${
                filterTab === 'pinned'
                  ? 'bg-[#ffffff] text-[#08080a] font-bold'
                  : 'text-[#9194a1] hover:text-[#e2e3e9]'
              }`}
            >
              Pinned Workstation ({watchlist.filter((i) => i.pinned).length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search watchlist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 bg-[#121317] border border-[#1c1d22] rounded-[9999px] px-4 py-1.5 text-xs text-[#e2e3e9] placeholder-[#777a88] focus:outline-none"
            />

            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-[#9194a1] hover:text-[#e2e3e9] transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#cc9166]" />
              <span>Export</span>
            </button>

            <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-[#9194a1] hover:text-[#e2e3e9] transition-all cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[#cc9166]" />
              <span>Import</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>

        {/* Portfolio Watchlist Cards Grid - Clicking anywhere on the card selects the coin! */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
          {filteredList.length === 0 ? (
            <div className="col-span-full text-center text-[#777a88] py-12">
              No cryptocurrency assets found in this view.
            </div>
          ) : (
            filteredList.map((item) => {
              const isSelected = selectedSymbol === item.symbol;
              return (
                <div
                  key={item.symbol}
                  onClick={() => onSelectCoin(item.symbol)}
                  className={`p-4 rounded-[10px] border transition-all space-y-3 cursor-pointer ${
                    isSelected
                      ? 'bg-[#121317] border-[#cc9166] text-[#e2e3e9]'
                      : 'bg-[#121317] border-[#1c1d22] text-[#e2e3e9] hover:border-[#777a88]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
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
                      <span className="font-bold text-base text-[#ffffff]">{item.symbol}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(item.symbol);
                        }}
                        title="Pin to Workstation chips"
                        className={`p-1.5 rounded-[9999px] border transition-all cursor-pointer ${
                          item.pinned
                            ? 'bg-[#1c1d22] text-[#cc9166] border-[#cc9166]/50'
                            : 'text-[#5e616e] border-transparent hover:bg-[#1c1d22]'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCoin(item.symbol);
                        }}
                        title="Remove coin"
                        className="p-1.5 rounded-[9999px] text-[#5e616e] hover:text-rose-400 hover:bg-[#1c1d22] transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#1c1d22]">
                    <span className="text-[11px] text-[#9194a1]">Venue: {item.exchange}</span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#cc9166] font-semibold">
                        <Check className="w-3.5 h-3.5 text-[#cc9166]" /> Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

