'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TradeSetup } from '@/types/terminal';
import { ShieldAlert, CheckCircle2, Copy, Check } from 'lucide-react';
import { generateAdvancedPineScriptCode } from '@/lib/tradingview/pine-generator';

interface TradingViewChartProps {
  symbol: string;
  exchange: string;
  timeframe: string;
  setup?: TradeSetup | null;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  exchange,
  timeframe,
  setup,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const mapResolution = (tf: string): string => {
    switch (tf) {
      case '1m':
        return '1';
      case '5m':
        return '5';
      case '15m':
        return '15';
      case '1h':
        return '60';
      case '4h':
        return '240';
      case '1d':
        return 'D';
      default:
        return '60';
    }
  };

  const formatTVSymbol = (rawSymbol: string, rawExchange: string): string => {
    const cleanSymbol = rawSymbol.replace('/', '').replace('-', '').toUpperCase();
    const ex = rawExchange.toUpperCase();
    return `${ex}:${cleanSymbol}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const containerId = 'tv_chart_container_' + Math.random().toString(36).substring(2, 9);
    const chartDiv = document.createElement('div');
    chartDiv.id = containerId;
    chartDiv.style.width = '100%';
    chartDiv.style.height = '850px';
    containerRef.current.appendChild(chartDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof window !== 'undefined' && (window as any).TradingView) {
        new (window as any).TradingView.widget({
          autosize: false,
          width: '100%',
          height: 850,
          symbol: formatTVSymbol(symbol, exchange),
          interval: mapResolution(timeframe),
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#040406',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerId,
          hide_side_toolbar: false,
        });
      }
    };

    containerRef.current.appendChild(script);
  }, [symbol, exchange, timeframe]);

  const handleCopyPine = async () => {
    const code = generateAdvancedPineScriptCode(setup ? ({ trade_setup: setup } as any) : null, symbol);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-4 flex flex-col w-full space-y-3">
      {/* TradingView Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2 border-b border-[#1c1d22]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#cc9166] animate-pulse" />
          <span className="text-xs font-sans font-medium text-[#ffffff]">
            {formatTVSymbol(symbol, exchange)} ({timeframe}) • TradingView Terminal
          </span>
        </div>

        <button
          onClick={handleCopyPine}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans transition-all cursor-pointer ${
            copied
              ? 'bg-[#ffffff] text-[#08080a] font-medium'
              : 'bg-[#121317] hover:bg-[#1c1d22] border border-[#777a88] text-[#ffffff]'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#08080a]" /> : <Copy className="w-3.5 h-3.5 text-[#cc9166]" />}
          <span>{copied ? 'Pine Copied!' : 'Copy Pine Script for TV'}</span>
        </button>
      </div>

      {/* Floating Level Overlay Banner */}
      {setup && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121317] border border-[#1c1d22] p-2.5 rounded-[10px] text-xs font-sans">
          <div className="flex items-center gap-2 text-rose-400 font-medium bg-[#1c1d22] border border-rose-900/50 px-3 py-1 rounded-full">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SL: ${setup.stop_loss}</span>
          </div>

          <div className="flex items-center gap-2 text-[#ffffff] font-medium bg-[#1c1d22] border border-[#2e3038] px-3 py-1 rounded-full">
            <span>Entry: ${setup.entry_range?.[0]} - ${setup.entry_range?.[1]}</span>
          </div>

          <div className="flex items-center gap-2 text-[#cc9166] font-medium bg-[#1c1d22] border border-[#cc9166]/30 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>TP1: ${setup.take_profit_1}</span>
          </div>

          <div className="flex items-center gap-2 text-[#cc9166] font-medium bg-[#1c1d22] border border-[#cc9166]/30 px-3 py-1 rounded-full">
            <span>TP2: ${setup.take_profit_2}</span>
          </div>

          <div className="flex items-center gap-2 text-[#cc9166] font-medium bg-[#1c1d22] border border-[#cc9166]/30 px-3 py-1 rounded-full">
            <span>TP3: ${setup.take_profit_3}</span>
          </div>
        </div>
      )}

      {/* TradingView Widget Box */}
      <div
        ref={containerRef}
        className="w-full h-[850px] rounded-[10px] overflow-hidden shrink-0 border border-[#1c1d22]"
        style={{ height: '850px', minHeight: '850px' }}
      />
    </div>
  );
};

