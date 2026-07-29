'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TradeSetup, StructuredLLMOutput } from '@/types/terminal';
import { ShieldAlert, CheckCircle2, Copy, Check, PauseCircle, TrendingUp, TrendingDown } from 'lucide-react';
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
      const win = window as unknown as { TradingView?: { widget: new (config: Record<string, unknown>) => unknown } };
      if (typeof window !== 'undefined' && win.TradingView) {
        new win.TradingView.widget({
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
    const code = generateAdvancedPineScriptCode(setup ? ({ trade_setup: setup } as unknown as StructuredLLMOutput) : null, symbol);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  // ─── Position styling helpers ────────────────────────────────────────────────
  const isLong     = setup?.position === 'LONG';
  const isShort    = setup?.position === 'SHORT';
  const isNeutral  = !setup || setup.position === 'NEUTRAL';
  const hasLevels  = setup && !isNeutral; // only show SL/TP/Entry for LONG or SHORT

  const positionBadgeStyle = isLong
    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
    : isShort
    ? 'bg-rose-950/80 text-rose-400 border border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
    : 'bg-amber-950/60 text-amber-400 border border-amber-600/60';

  const PositionIcon = isLong
    ? TrendingUp
    : isShort
    ? TrendingDown
    : PauseCircle;

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-4 flex flex-col w-full space-y-3">
      {/* TradingView Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2 border-b border-[#1c1d22]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-none bg-emerald-400 animate-pulse" />
          <span className="eyebrow-copper">
            QUANT RECHARTS TARGET MAP
          </span>
          <span className="text-xs font-sans text-[#9194a1] hidden sm:inline">
            • Pure Target Level Channels (Entry Zone, SL &amp; Take Profit Targets)
          </span>
        </div>

        <button
          onClick={handleCopyPine}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-mono transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-400 text-[#08080a] font-bold'
              : 'bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] hover:border-[#cc9166] text-[#e2e3e9]'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#08080a]" /> : <Copy className="w-3.5 h-3.5 text-[#cc9166]" />}
          <span>{copied ? 'Pine Copied!' : 'Copy Pine Script for TV'}</span>
        </button>
      </div>

      {/* ── Floating Level Overlay Banner ─────────────────────────────────────── */}
      {setup && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121317] border border-[#1c1d22] p-2.5 rounded-none text-xs font-mono">

          {/* Position + Leverage badge — colour tied to direction */}
          <div className={`flex items-center gap-1.5 font-bold px-3 py-1 rounded-none ${positionBadgeStyle}`}>
            <PositionIcon className="w-3.5 h-3.5" />
            <span>{setup.position} {setup.recommended_leverage && !isNeutral ? `(${setup.recommended_leverage})` : ''}</span>
            {!isNeutral && (
              <>
                <span className="text-[#5e616e]">|</span>
                <span>R:R {setup.risk_reward_ratio}R</span>
              </>
            )}
          </div>

          {/* NEUTRAL: show a calm "no trade" notice instead of SL/TP/Entry */}
          {isNeutral ? (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-950/40 border border-amber-800/50 px-3 py-1 rounded-none font-mono text-xs">
              <PauseCircle className="w-3.5 h-3.5" />
              <span>No active trade levels — Monitor market conditions</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-rose-400 font-bold bg-rose-950/80 border border-rose-500 px-3 py-1 rounded-none">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>SL: ${setup.stop_loss}</span>
              </div>

              <div className="flex items-center gap-2 text-[#ffffff] font-medium bg-[#08080a] border border-[#1c1d22] px-3 py-1 rounded-none">
                <span>Entry: ${setup.entry_range?.[0]} - ${setup.entry_range?.[1]}</span>
              </div>

              <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-900/60 px-3 py-1 rounded-none">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>TP1: ${setup.take_profit_1}</span>
              </div>

              <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-900/60 px-3 py-1 rounded-none">
                <span>TP2: ${setup.take_profit_2}</span>
              </div>

              <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-900/60 px-3 py-1 rounded-none">
                <span>TP3: ${setup.take_profit_3}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* TradingView Widget Box */}
      <div
        ref={containerRef}
        className="w-full h-[850px] rounded-none overflow-hidden shrink-0 border border-[#1c1d22]"
        style={{ height: '850px', minHeight: '850px' }}
      />
    </div>
  );
};
