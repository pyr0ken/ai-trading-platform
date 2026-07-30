'use client';

import React from 'react';
import { ShieldCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { CoinIcon } from '@/components/common/coin-icon';

interface DashboardTickerTapeProps {
  symbol: string;
  price?: number;
  change24h?: number;
}

export const DashboardTickerTape: React.FC<DashboardTickerTapeProps> = ({
  symbol,
  price,
  change24h,
}) => {
  const baseAsset = symbol ? symbol.split('/')[0] : 'BTC';
  const isPositive = change24h !== undefined && change24h >= 0;

  return (
    <div className="w-full bg-[#040406] border-b border-[#1c1d22] text-[#e2e3e9] text-[12px] font-sans py-2.5 px-2 select-none">
      <div className="w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 shrink-0">
          {/* Selected Asset Live Price */}
          <div className="flex items-center gap-2 bg-[#08080a] border border-[#1c1d22] px-3 py-1 rounded-[9999px]">
            <CoinIcon symbol={symbol} size={18} />
            <span className="text-[#e2e3e9] font-semibold text-[13px]">{baseAsset}</span>
            <span className="text-[#5e616e] mx-0.5">|</span>
            {price ? (
              <>
                <span className="font-mono font-bold text-[#e2e3e9]">
                  ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {change24h !== undefined && (
                  <span className={`flex items-center gap-0.5 font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                  </span>
                )}
              </>
            ) : (
              <span className="text-[#5e616e] italic">Loading...</span>
            )}
          </div>

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

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[#5e616e]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#cc9166]" />
            <span className="text-[10px] tracking-wide">Encryption Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
