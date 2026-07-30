'use client';

import React, { useState } from 'react';
import {
  Star,
  Trash2,
  Plus,
  Search,
  Download,
  Upload,
  Coins,
  Sparkles,
} from 'lucide-react';
import { AppStorageEngine, WatchlistItem } from '@/lib/storage/app-db';
import { TOP_300_COINS } from '@/lib/constants/top-coins';
import { CoinIcon } from '@/components/common/coin-icon';
import { MarketHeatmap } from './market-heatmap';

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
  const [filterTab, setFilterTab] = useState<'all' | 'favorites'>('all');

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
      ).slice(0, 10)
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-4 text-center space-y-1">
        <div className="w-10 h-10 rounded-full bg-[#121317] border border-[#cc9166] flex items-center justify-center mx-auto">
          <Coins className="w-5 h-5 text-[#cc9166]" />
        </div>
        <h2 className="font-ivy-presto text-2xl font-normal text-[#ffffff]">
          Watchlist
        </h2>
      </div>

      {/* Add & Search */}
      <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-4 space-y-4">
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#777a88] absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search & add coins..."
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
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-[#121317] border border-[#1c1d22] rounded-[10px] p-2 space-y-1">
              <div className="px-3 py-1 text-[10px] text-[#9194a1] font-mono uppercase border-b border-[#1c1d22] mb-1 flex items-center justify-between">
                <span>Matching Top 300</span>
                <Sparkles className="w-3 h-3 text-[#cc9166]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {suggestions.map((sug) => (
                  <div
                    key={sug.symbol}
                    onClick={() => handleAddDirectSymbol(sug.symbol)}
                    className="flex items-center justify-between px-3 py-2 rounded-[9999px] hover:bg-[#1c1d22] cursor-pointer transition-all text-xs font-mono group"
                  >
                    <div className="flex items-center gap-2">
                      <CoinIcon symbol={sug.symbol} size={18} />
                      <span className="font-bold text-[#cc9166]">{sug.symbol}</span>
                      <span className="text-[10px] text-[#9194a1] font-sans">({sug.name})</span>
                    </div>
                    <span className="text-[10px] bg-[#1c1d22] group-hover:bg-[#cc9166] group-hover:text-[#08080a] px-2 py-0.5 rounded-[9999px] text-[#e2e3e9] transition-all font-semibold">+ Add</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono border-t border-[#1c1d22] pt-3">
          <div className="flex items-center gap-1 bg-[#121317] border border-[#1c1d22] p-1 rounded-[9999px]">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 rounded-[9999px] transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-[#ffffff] text-[#08080a] font-bold'
                  : 'text-[#9194a1] hover:text-[#e2e3e9]'
              }`}
            >
              All ({watchlist.length})
            </button>
            <button
              onClick={() => setFilterTab('favorites')}
              className={`px-3 py-1 rounded-[9999px] transition-all cursor-pointer ${
                filterTab === 'favorites'
                  ? 'bg-[#ffffff] text-[#08080a] font-bold'
                  : 'text-[#9194a1] hover:text-[#e2e3e9]'
              }`}
            >
              Starred ({watchlist.filter((i) => i.favorite).length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-36 bg-[#121317] border border-[#1c1d22] rounded-[9999px] px-3 py-1 text-xs text-[#e2e3e9] placeholder-[#777a88] focus:outline-none"
            />
            <button onClick={handleExportJSON} className="p-1.5 rounded-[9999px] text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#1c1d22] transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5 text-[#cc9166]" />
            </button>
            <label className="p-1.5 rounded-[9999px] text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#1c1d22] transition-all cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[#cc9166]" />
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>

        {/* Grid */}
        {filteredList.length === 0 ? (
          <div className="text-center text-[#777a88] py-10 text-xs">
            No coins found. Add some from the search above.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filteredList.map((item) => {
              const isSelected = selectedSymbol === item.symbol;
              return (
                <div
                  key={item.symbol}
                  onClick={() => onSelectCoin(item.symbol)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-[10px] border transition-all cursor-pointer text-center ${
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
                    className="self-end -mb-1 p-0.5 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-3 h-3 ${
                        item.favorite
                          ? 'text-[#cc9166] fill-[#cc9166]'
                          : 'text-[#5e616e] hover:text-[#e2e3e9]'
                      }`}
                    />
                  </button>

                  <CoinIcon symbol={item.symbol} size={24} />

                  <span className="font-bold text-xs text-[#ffffff] truncate max-w-full">{item.symbol}</span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCoin(item.symbol);
                    }}
                    className="px-2 py-0.5 rounded-[9999px] text-[8px] text-rose-400/50 hover:text-rose-300 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-all cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
