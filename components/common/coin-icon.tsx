'use client';

import React, { useState } from 'react';

interface CoinIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

export const CoinIcon: React.FC<CoinIconProps> = ({ symbol, size = 20, className = '' }) => {
  const [sourceIndex, setSourceIndex] = useState(0);

  // Clean symbol string (e.g. BTC/USDT -> btc)
  const cleanSymbol = symbol ? symbol.split('/')[0].split('-')[0].trim().toLowerCase() : 'btc';

  // Multi-CDN logo waterfall
  const sources = [
    `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${cleanSymbol}.png`,
    `https://assets.coincap.io/assets/icons/${cleanSymbol}@2x.png`,
    `https://cryptoicons.org/api/icon/${cleanSymbol}/64`,
    `https://coinicons-api.vercel.app/api/icon/${cleanSymbol}`,
  ];

  const handleImageError = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((prev) => prev + 1);
    } else {
      setSourceIndex(-1); // Switch to fallback SVG badge
    }
  };

  if (sourceIndex === -1) {
    const uppercaseTag = cleanSymbol.slice(0, 2).toUpperCase();
    return (
      <div
        className={`rounded-[9999px] bg-[#121317] border border-[#cc9166]/50 flex items-center justify-center font-mono font-bold text-[#cc9166] shrink-0 select-none ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(9, Math.floor(size * 0.45)) }}
      >
        {uppercaseTag}
      </div>
    );
  }

  return (
    <img
      src={sources[sourceIndex]}
      alt={symbol}
      width={size}
      height={size}
      onError={handleImageError}
      className={`rounded-[9999px] shrink-0 object-contain bg-[#121317] border border-[#1c1d22] ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
};
