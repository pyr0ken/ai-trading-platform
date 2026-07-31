'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { CoinIcon } from '@/components/common/coin-icon';

interface DashboardTickerTapeProps {
  symbol: string;
  price?: number;
  change24h?: number;
  change24hPercentage?: number;
  onSymbolClick?: () => void;
  onWhaleToggle?: () => void;
  whaleAlertCount?: number;
}

type MetricMode = 'absolute' | 'percentage';
const VALID_PRICE = (p?: number) => p !== undefined && p !== null && p > 0;

export const DashboardTickerTape: React.FC<DashboardTickerTapeProps> = ({
  symbol,
  price,
  change24h,
  change24hPercentage,
  onSymbolClick,
  onWhaleToggle,
  whaleAlertCount,
}) => {
  const baseAsset = symbol ? symbol.split('/')[0] : 'BTC';
  const [metricMode, setMetricMode] = useState<MetricMode>('percentage');
  const [fading, setFading] = useState(false);
  const hasPrice = VALID_PRICE(price);

  // Cycle between absolute change and percentage change every 4 seconds
  useEffect(() => {
    if (!VALID_PRICE(price) || (change24h === undefined && change24hPercentage === undefined)) return;

    let fadeTimer: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setFading(true);
      fadeTimer = setTimeout(() => {
        setMetricMode((prev) => (prev === 'absolute' ? 'percentage' : 'absolute'));
        setFading(false);
      }, 300);
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
    };
  }, [price, change24h, change24hPercentage]);

  const activeValue = metricMode === 'absolute' ? change24h : change24hPercentage;
  const isPositive = activeValue !== undefined && activeValue >= 0;

  return (
    <div className="sticky top-0 z-50 w-full bg-[#040406]/95 backdrop-blur-md border-b border-[#1c1d22] text-[#e2e3e9] text-[12px] font-sans py-2.5 select-none">
      <div className="relative flex items-center">
        {/* Left: market stats */}
        <div className="flex items-center gap-4 pl-4">
          <div className="hidden sm:flex items-center gap-1.5 text-[#5e616e]">
            <span>24h Vol: <strong className="text-[#e2e3e9] font-medium">$94.2B</strong></span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[#5e616e]">
            <span>BTC Dom: <strong className="text-[#e2e3e9] font-medium">54.2%</strong></span>
          </div>

          <div className="hidden lg:flex items-center gap-2 bg-[#08080a] border border-[#1c1d22] px-3 py-1 rounded-[9999px] text-[#e2e3e9]">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#cc9166]"></span>
            </span>
            <span className="text-[10px] text-[#9194a1]">Fear & Greed: <strong className="text-[#e2e3e9]">68 (Greed)</strong></span>
          </div>
        </div>

        {/* Center: selected coin — interactive pill */}
        <button
          onClick={onSymbolClick}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#08080a] text-[#e2e3e9] px-3 py-1 rounded-[9999px] shadow-[0_0_14px_rgba(204,145,102,0.4),0_0_40px_rgba(204,145,102,0.18),0_0_60px_rgba(204,145,102,0.08)] hover:shadow-[0_0_22px_rgba(204,145,102,0.6),0_0_55px_rgba(204,145,102,0.3),0_0_80px_rgba(204,145,102,0.12)] hover:border-[#cc9166]/80 transition-all duration-500 ease-out cursor-pointer animate-copper-pulse group border border-[#1c1d22]"
        >
          <CoinIcon symbol={symbol} size={18} />
          <span className="font-semibold text-[13px]">{baseAsset}</span>
          <span className="text-[#5e616e] mx-0.5">|</span>
          {hasPrice ? (
            <>
              <span className="font-mono font-bold text-[#e2e3e9]">
                ${price!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {activeValue !== undefined ? (
                <span
                  className={`flex items-center gap-0.5 font-medium transition-opacity duration-300 ${
                    fading ? 'opacity-30' : 'opacity-100'
                  } ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
                  title={
                    metricMode === 'percentage' && VALID_PRICE(change24h)
                      ? `$${change24h!.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : `${change24hPercentage?.toFixed(2)}%`
                  }
                >
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>
                    {isPositive ? '+' : ''}
                    {metricMode === 'absolute'
                      ? `$${change24h!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `${change24hPercentage!.toFixed(2)}%`
                    }
                  </span>
                  <span className="text-[8px] text-[#5e616e] ml-0.5 font-mono">
                    {metricMode === 'percentage' ? '%' : '$'}
                  </span>
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-[#5e616e] italic text-[11px]">—</span>
          )}
          <ChevronDown className="w-3 h-3 text-[#5e616e] group-hover:text-[#e2e3e9] transition-colors duration-300" />
        </button>

        {/* Right: status + whale toggle */}
        <div className="ml-auto pr-4 shrink-0 flex items-center gap-2">
          <button
            onClick={onWhaleToggle}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[#cc9166] hover:text-[#e2e3e9] hover:bg-[#1c1d22] border border-[#1c1d22] hover:border-[#cc9166]/30 transition-all duration-200 cursor-pointer"
            title="Whale Alert Feed"
          >
            <span className="text-[11px] leading-none">🐋</span>
            <span className="text-[9px] font-mono uppercase tracking-wider font-bold">Whale</span>
            {whaleAlertCount !== undefined && whaleAlertCount > 0 && (
              <span className="text-[9px] font-mono bg-rose-500/20 text-rose-400 px-1 py-0.5 rounded-[2px]">
                {whaleAlertCount}
              </span>
            )}
          </button>
          <div className="hidden sm:flex items-center gap-1.5 text-[#5e616e]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#cc9166]" />
            <span className="text-[10px] tracking-wide">Encryption Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
