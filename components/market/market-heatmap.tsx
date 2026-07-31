'use client';

import React, { useState, useEffect } from 'react';
import { WatchlistItem } from '@/lib/storage/app-db';
import { TrendingUp, TrendingDown, Coins } from 'lucide-react';

interface MarketHeatmapProps {
  watchlist: WatchlistItem[];
  onSelectCoin: (symbol: string) => void;
}

interface HeatmapData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
}

export const MarketHeatmap: React.FC<MarketHeatmapProps> = ({ watchlist, onSelectCoin }) => {
  const [data, setData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (watchlist.length === 0) {
      setTimeout(() => {
        setData([]);
        setLoading(false);
      }, 0);
      return;
    }

    let isSubscribed = true;

    const fetchAllData = async () => {
      if (document.hidden) return;
      setLoading(true);
      const promises = watchlist.map(async (item) => {
        const cleanPair = item.symbol.replace('/', '').toUpperCase();
        try {
          const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${cleanPair}`, {
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) {
            const ticker = await res.json();
            return {
              symbol: item.symbol,
              price: parseFloat(ticker.lastPrice) || 0,
              change24h: parseFloat(ticker.priceChangePercent) || 0,
              volume: parseFloat(ticker.quoteVolume) || 0,
            };
          }
        } catch {}

        // Fallback to KuCoin if Binance fails
        try {
          const kucoinPair = item.symbol.replace('/', '-').toUpperCase();
          const res = await fetch(`https://api.kucoin.com/api/v1/market/stats?symbol=${kucoinPair}`, {
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) {
            const json = await res.json();
            if (json?.data) {
              return {
                symbol: item.symbol,
                price: parseFloat(json.data.last) || 0,
                change24h: (parseFloat(json.data.changeRate) || 0) * 100,
                volume: parseFloat(json.data.volValue) || 0,
              };
            }
          }
        } catch {}

        return {
          symbol: item.symbol,
          price: 0,
          change24h: 0,
          volume: 0,
        };
      });

      const results = await Promise.all(promises);
      if (isSubscribed) {
        setData(results.filter((r) => r.price > 0));
        setLoading(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 10000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [watchlist]);

  if (loading && data.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-pulse">
        {watchlist.map((item, i) => (
          <div key={i} className="bg-[#121317] border border-[#1c1d22] h-20 rounded-none" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-8 text-[#5e616e] font-mono text-xs border border-[#1c1d22] bg-[#040406]">
        No live market connection or empty watchlist.
      </div>
    );
  }

  // Sort by change percentage absolute magnitude or simply by value
  const sortedData = [...data].sort((a, b) => b.change24h - a.change24h);

  const getBgColor = (change: number) => {
    if (change > 5) return 'bg-emerald-950/90 text-emerald-400 border-emerald-500 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]';
    if (change > 1) return 'bg-emerald-950/50 text-emerald-400/90 border-emerald-900/50 hover:bg-emerald-900/40';
    if (change > 0) return 'bg-emerald-950/20 text-emerald-500/80 border-emerald-950/40 hover:bg-emerald-950/30';
    if (change < -5) return 'bg-rose-950/90 text-rose-400 border-rose-500 hover:bg-rose-900/60 shadow-[0_0_8px_rgba(244,63,94,0.15)]';
    if (change < -1) return 'bg-rose-950/50 text-rose-400/90 border-rose-900/50 hover:bg-rose-900/40';
    return 'bg-rose-950/20 text-rose-500/80 border-rose-950/40 hover:bg-rose-950/30';
  };

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center justify-between text-[10px] text-[#5e616e] uppercase">
        <span className="flex items-center gap-1">
          <Coins className="w-3.5 h-3.5 text-[#cc9166]" />
          24h Market Heatmap
        </span>
        <span>Auto-refresh: 10s</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 select-none">
        {sortedData.map((coin) => {
          const coinName = coin.symbol.split('/')[0];
          const hasGained = coin.change24h >= 0;

          return (
            <button
              key={coin.symbol}
              onClick={() => onSelectCoin(coin.symbol)}
              className={`h-24 p-3 border transition-all duration-300 text-left flex flex-col justify-between cursor-pointer rounded-none ${getBgColor(
                coin.change24h
              )}`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-sans font-bold text-[14px] uppercase tracking-wider">{coinName}</span>
                <span className="text-[10px] font-mono font-bold flex items-center gap-0.5">
                  {hasGained ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {hasGained ? '+' : ''}
                  {coin.change24h.toFixed(2)}%
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="text-white text-xs font-bold font-mono">
                  ${coin.price >= 1 ? coin.price.toLocaleString() : coin.price.toFixed(4)}
                </div>
                <div className="text-[9px] text-[#9194a1] font-mono">
                  Vol: ${(coin.volume / 1000000).toFixed(2)}M
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
