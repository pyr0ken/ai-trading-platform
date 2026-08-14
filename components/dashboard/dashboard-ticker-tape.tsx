'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { ModelSelectorCombobox } from '@/components/settings/model-selector-combobox';
import { formatPrice, priceDecimals } from '@/lib/utils/price-format';
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

interface FearGreedState {
  value: number;
  label: string;
  loaded: boolean;
}

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

  // Live Fear & Greed — fetched from alternative.me (same source as sidebar)
  const [fearGreed, setFearGreed] = useState<FearGreedState>({ value: 0, label: '', loaded: false });

  useEffect(() => {
    let cancelled = false;
    const fetchFG = async () => {
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=1');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.data?.[0]) {
          setFearGreed({
            value: parseInt(data.data[0].value, 10),
            label: data.data[0].value_classification,
            loaded: true,
          });
        }
      } catch {
        // Non-fatal — pill just stays hidden until next refetch
      }
    };
    fetchFG();
    // Refresh every hour (F&G updates once/day but we don't want stale pill on long sessions)
    const id = setInterval(fetchFG, 3_600_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

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

  // Decimal-aware formatting
  const d = price ? priceDecimals(price) : 2;

  const formattedPrice = price
    ? price.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '—';

  const formattedChange = (() => {
    if (activeValue === undefined) return null;
    if (metricMode === 'absolute' && change24h !== undefined) {
      const ad = priceDecimals(Math.abs(change24h) || (price ?? 1));
      return `${isPositive ? '+' : ''}$${change24h.toLocaleString('en-US', {
        minimumFractionDigits: ad,
        maximumFractionDigits: ad,
      })}`;
    }
    return `${isPositive ? '+' : ''}${change24hPercentage!.toFixed(2)}%`;
  })();

  const changeTooltip = (() => {
    if (metricMode === 'percentage' && VALID_PRICE(change24h)) {
      const ad = priceDecimals(Math.abs(change24h!) || (price ?? 1));
      return `$${change24h!.toLocaleString('en-US', { minimumFractionDigits: ad, maximumFractionDigits: ad })}`;
    }
    return `${change24hPercentage?.toFixed(2)}%`;
  })();

  // Fear & Greed colour
  const fgColor = fearGreed.value >= 75 ? 'text-rose-400'
    : fearGreed.value >= 55 ? 'text-amber-400'
    : fearGreed.value >= 45 ? 'text-[#e2e3e9]'
    : fearGreed.value >= 25 ? 'text-sky-400'
    : 'text-blue-400';

  return (
    <div className="sticky top-0 z-50 w-full bg-[#040406]/95 backdrop-blur-md border-b border-[#1c1d22] text-[#e2e3e9] text-[12px] font-sans py-2.5 select-none">
      <div className="relative flex items-center">
        {/* Left: live market meta */}
        <div className="flex items-center gap-4 pl-4">
          {/* Fear & Greed — hidden until loaded to avoid flicker */}
          {fearGreed.loaded && (
            <div className="hidden lg:flex items-center gap-2 bg-[#08080a] border border-[#1c1d22] px-3 py-1 rounded-[9999px]">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#cc9166]" />
              </span>
              <span className="text-[10px] text-[#9194a1]">
                Fear &amp; Greed:{' '}
                <strong className={`${fgColor}`}>
                  {fearGreed.value} ({fearGreed.label})
                </strong>
              </span>
            </div>
          )}
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
                ${formattedPrice}
              </span>
              {formattedChange !== null && (
                <span
                  className={`flex items-center gap-0.5 font-medium transition-opacity duration-300 ${
                    fading ? 'opacity-30' : 'opacity-100'
                  } ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
                  title={changeTooltip}
                >
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{formattedChange}</span>
                </span>
              )}
            </>
          ) : (
            <span className="text-[#5e616e] italic text-[11px]">—</span>
          )}
          <ChevronDown className="w-3 h-3 text-[#5e616e] group-hover:text-[#e2e3e9] transition-colors duration-300" />
        </button>

        {/* Right: status & active model */}
        <div className="ml-auto pr-4 shrink-0 flex items-center gap-3">
          <ModelSelectorCombobox variant="compact" />
          <div className="hidden sm:flex items-center gap-1.5 text-[#5e616e]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#cc9166]" />
            <span className="text-[10px] tracking-wide">Encryption Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
