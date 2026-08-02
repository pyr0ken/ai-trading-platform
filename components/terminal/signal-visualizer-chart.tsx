'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StructuredLLMOutput } from '@/types/terminal';
import { ArrowUpRight, ArrowDownRight, PauseCircle, Zap, RefreshCw, BarChart2 } from 'lucide-react';
import {
  createChart,
  ColorType,
  LineStyle,
  CrosshairMode,
  CandlestickSeries,
  IChartApi,
  ISeriesApi,
  Time,
} from 'lightweight-charts';

interface SignalVisualizerChartProps {
  data?: StructuredLLMOutput | null;
  currentPrice?: number;
  symbol?: string;
  exchange?: string;
  timeframe?: string;
}

export const SignalVisualizerChart: React.FC<SignalVisualizerChartProps> = ({
  data,
  currentPrice = 67420.5,
  symbol = 'BTC/USDT',
  exchange = 'kucoin',
  timeframe = '15m',
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [isLoadingCandles, setIsLoadingCandles] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const setup = data?.trade_setup;
  const isLong = setup?.position === 'LONG';
  const isShort = setup?.position === 'SHORT';
  const isNeutral = !setup || setup.position === 'NEUTRAL';

  // Position badge style
  const positionBadgeStyle = isLong
    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
    : isShort
    ? 'bg-rose-950/80 text-rose-400 border border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
    : 'bg-amber-950/60 text-amber-400 border border-amber-600/60';

  const PositionIcon = isLong ? ArrowUpRight : isShort ? ArrowDownRight : PauseCircle;
  const positionLabel = isLong ? 'BULLISH LONG' : isShort ? 'BEARISH SHORT' : 'NEUTRAL / HOLD';

  // Derived setup values
  const currP = Number(currentPrice);
  const rawMin = setup?.entry_range?.[0] ?? (isLong ? currP * 0.995 : currP * 1.005);
  const rawMax = setup?.entry_range?.[1] ?? (isLong ? currP * 1.005 : currP * 0.995);
  const rawSL = setup?.stop_loss ?? (isLong ? currP * 0.97 : currP * 1.03);
  const rawTP1 = setup?.take_profit_1 ?? (isLong ? currP * 1.02 : currP * 0.98);
  const rawTP2 = setup?.take_profit_2 ?? (isLong ? currP * 1.04 : currP * 0.96);
  const rawTP3 = setup?.take_profit_3 ?? (isLong ? currP * 1.06 : currP * 0.94);

  const entryMin = Number(rawMin);
  const entryMax = Number(rawMax);
  const stopLoss = Number(rawSL);
  const tp1 = Number(rawTP1);
  const tp2 = Number(rawTP2);
  const tp3 = Number(rawTP3);

  const getPctDiff = useCallback(
    (targetPrice: number) => {
      const diff = ((targetPrice - currP) / currP) * 100;
      return (diff >= 0 ? '+' : '') + diff.toFixed(2) + '%';
    },
    [currP]
  );

  // Generate fallback candles if network fails or while loading
  const generateFallbackCandles = useCallback(() => {
    const candles = [];
    const now = Math.floor(Date.now() / 1000);
    const intervalSeconds = 15 * 60;
    let base = currP * 0.98;

    for (let i = 50; i >= 0; i--) {
      const time = (now - i * intervalSeconds) as Time;
      const volatility = base * 0.004;
      const open = base + (Math.random() - 0.48) * volatility;
      const high = open + Math.random() * volatility;
      const low = open - Math.random() * volatility;
      const close = (open + high + low) / 3;
      base = close;

      candles.push({
        time,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
      });
    }
    return candles;
  }, [currP]);

  // Initialize TradingView Lightweight Chart
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#040406' },
        textColor: '#9194a1',
        fontSize: 11,
        fontFamily: 'monospace',
      },
      grid: {
        vertLines: { color: '#121317' },
        horzLines: { color: '#121317' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#cc9166', width: 1, style: LineStyle.Dashed },
        horzLine: { color: '#cc9166', width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: '#1c1d22',
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
      },
      timeScale: {
        borderColor: '#1c1d22',
        timeVisible: true,
        secondsVisible: false,
      },
      width: container.clientWidth,
      height: 420,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Fetch real candles from API
    let isSubscribed = true;
    setIsLoadingCandles(true);

    const fetchCandles = async () => {
      try {
        const since = Date.now() - 50 * 15 * 60 * 1000;
        const res = await fetch(
          `/api/market/history-ohlcv?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}&timeframe=${timeframe}&since=${since}&limit=100`
        );
        if (!res.ok) throw new Error('API fetch failed');
        const json = await res.json();
        if (json.candles && json.candles.length > 0) {
          const formatted = json.candles.map((c: { timestamp: number; open: number; high: number; low: number; close: number }) => ({
            time: Math.floor(c.timestamp / 1000) as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));
          // Remove duplicates and sort by time
          const uniqueTimes = new Map();
          formatted.forEach((item: { time: Time }) => uniqueTimes.set(item.time, item));
          const sorted = Array.from(uniqueTimes.values()).sort((a, b) => (a.time as number) - (b.time as number));

          if (isSubscribed && seriesRef.current) {
            seriesRef.current.setData(sorted);
            chart.timeScale().fitContent();
          }
        } else {
          throw new Error('Empty candles');
        }
      } catch {
        if (isSubscribed && seriesRef.current) {
          const fallback = generateFallbackCandles();
          seriesRef.current.setData(fallback);
          chart.timeScale().fitContent();
        }
      } finally {
        if (isSubscribed) setIsLoadingCandles(false);
      }
    };

    fetchCandles();

    // Add Trade Setup Price Lines to Series
    if (setup && !isNeutral) {
      // Entry Min & Max
      candlestickSeries.createPriceLine({
        price: entryMin,
        color: '#3b82f6',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Entry Min: $${entryMin}`,
      });

      candlestickSeries.createPriceLine({
        price: entryMax,
        color: '#3b82f6',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Entry Max: $${entryMax}`,
      });

      // Stop Loss
      candlestickSeries.createPriceLine({
        price: stopLoss,
        color: '#f43f5e',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `SL: $${stopLoss}`,
      });

      // Take Profits
      candlestickSeries.createPriceLine({
        price: tp1,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TP1: $${tp1}`,
      });

      candlestickSeries.createPriceLine({
        price: tp2,
        color: '#14b8a6',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TP2: $${tp2}`,
      });

      candlestickSeries.createPriceLine({
        price: tp3,
        color: '#84cc16',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TP3: $${tp3}`,
      });
    }

    // Resize observer for dynamic layout adjustment
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      if (width > 0 && chartRef.current) {
        chartRef.current.applyOptions({ width });
      }
    });

    resizeObserver.observe(container);

    return () => {
      isSubscribed = false;
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol, exchange, timeframe, refreshKey, setup, isNeutral, entryMin, entryMax, stopLoss, tp1, tp2, tp3, generateFallbackCandles]);

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-5 flex flex-col w-full space-y-4 shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1c1d22]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#121317] border border-[#1c1d22] flex items-center justify-center text-[#cc9166]">
            <BarChart2 className="w-4 h-4 text-[#cc9166]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-[#ffffff] uppercase tracking-wider">
                TradingView Lightweight Target Map
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-[#121317] border border-[#1c1d22] text-[#9194a1]">
                {symbol} • {exchange.toUpperCase()} • {timeframe}
              </span>
            </div>
            <span className="text-xs text-[#5e616e] font-mono">
              Live HTML5 Canvas Candlestick Chart with Dynamic Entry, SL &amp; TP Target Overlay
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className={`flex items-center gap-1.5 px-3 py-1 font-bold text-xs ${positionBadgeStyle}`}>
            <PositionIcon className="w-3.5 h-3.5" />
            {positionLabel} {setup?.recommended_leverage && !isNeutral ? `(${setup.recommended_leverage})` : ''}
          </span>

          {!isNeutral && (
            <div className="flex items-center gap-1 bg-[#121317] border border-[#1c1d22] px-3 py-1 text-[#9194a1]">
              <Zap className="w-3.5 h-3.5 text-[#cc9166]" />
              <span>R:R <strong className="text-[#ffffff]">{setup?.risk_reward_ratio || '2.5'}R</strong></span>
            </div>
          )}

          <button
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] hover:border-[#cc9166] text-[#9194a1] hover:text-[#e2e3e9] transition-all cursor-pointer"
            title="Refresh Chart Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#cc9166] ${isLoadingCandles ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Target Level Pills Summary */}
      {setup && !isNeutral && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
          <div className="bg-[#121317] border border-blue-900/40 p-2 text-center">
            <span className="text-[#5e616e] block text-[10px] uppercase">Entry Zone</span>
            <span className="text-blue-400 font-bold">${entryMin} - ${entryMax}</span>
          </div>

          <div className="bg-[#121317] border border-rose-900/40 p-2 text-center">
            <span className="text-[#5e616e] block text-[10px] uppercase">Stop Loss ({getPctDiff(stopLoss)})</span>
            <span className="text-rose-400 font-bold">${stopLoss}</span>
          </div>

          <div className="bg-[#121317] border border-emerald-900/40 p-2 text-center">
            <span className="text-[#5e616e] block text-[10px] uppercase">TP1 Target ({getPctDiff(tp1)})</span>
            <span className="text-emerald-400 font-bold">${tp1}</span>
          </div>

          <div className="bg-[#121317] border border-teal-900/40 p-2 text-center">
            <span className="text-[#5e616e] block text-[10px] uppercase">TP2 Target ({getPctDiff(tp2)})</span>
            <span className="text-teal-400 font-bold">${tp2}</span>
          </div>

          <div className="bg-[#121317] border border-lime-900/40 p-2 text-center col-span-2 sm:col-span-1">
            <span className="text-[#5e616e] block text-[10px] uppercase">TP3 Target ({getPctDiff(tp3)})</span>
            <span className="text-lime-400 font-bold">${tp3}</span>
          </div>
        </div>
      )}

      {/* TradingView Lightweight Chart Container */}
      <div className="relative w-full border border-[#1c1d22] bg-[#040406] overflow-hidden">
        {isLoadingCandles && (
          <div className="absolute inset-0 bg-[#040406]/70 backdrop-blur-xs flex items-center justify-center z-10 font-mono text-xs text-[#cc9166]">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            <span>Loading TradingView Lightweight Chart...</span>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-[420px]" />
      </div>
    </div>
  );
};
