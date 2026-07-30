'use client';

import React from 'react';
import { ShieldCheck, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { CoinIcon } from '@/components/common/coin-icon';

interface DashboardTickerTapeProps {
  symbol: string;
  price?: number;
  change24h?: number;
  onSymbolClick?: () => void;
}

export const DashboardTickerTape: React.FC<DashboardTickerTapeProps> = ({
  symbol,
  price,
  change24h,
  onSymbolClick,
}) => {
  const baseAsset = symbol ? symbol.split('/')[0] : 'BTC';
  const isPositive = change24h !== undefined && change24h >= 0;

  return (
    <div className="w-full bg-[#040406] border-b border-[#1c1d22] text-[#e2e3e9] text-[12px] font-sans py-2.5 select-none">
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
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white text-[#08080a] px-3 py-1 rounded-[9999px] shadow-[0_0_12px_rgba(204,145,102,0.35),0_0_30px_rgba(204,145,102,0.15)] hover:shadow-[0_0_18px_rgba(204,145,102,0.5),0_0_40px_rgba(204,145,102,0.25)] transition-all duration-300 cursor-pointer animate-subtle-glow group"
        >
          <CoinIcon symbol={symbol} size={18} />
          <span className="font-semibold text-[13px]">{baseAsset}</span>
          <span className="text-[#c0c0c0] mx-0.5">|</span>
          {price ? (
            <>
              <span className="font-mono font-bold">
                ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {change24h !== undefined && (
                <span className={`flex items-center gap-0.5 font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                </span>
              )}
            </>
          ) : (
            <span className="text-[#888] italic">Loading...</span>
          )}
          <ChevronDown className="w-3 h-3 text-[#888] group-hover:text-[#08080a] transition-colors" />
        </button>

        {/* Right: status */}
        <div className="ml-auto pr-4 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[#5e616e]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#cc9166]" />
            <span className="text-[10px] tracking-wide">Encryption Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
