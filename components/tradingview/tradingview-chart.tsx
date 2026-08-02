'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TradeSetup, StructuredLLMOutput } from '@/types/terminal';
import { ShieldAlert, CheckCircle2, Copy, Check, PauseCircle, TrendingUp, TrendingDown, RefreshCw, BarChart2, Radio } from 'lucide-react';
import { generateAdvancedPineScriptCode } from '@/lib/tradingview/pine-generator';
import {
  createChart,
  ColorType,
  LineStyle,
  CrosshairMode,
  CandlestickSeries,
  IChartApi,
  ISeriesApi,
  Time,
  IPriceLine,
} from 'lightweight-charts';

interface TradingViewChartProps {
  symbol: string;
  exchange: string;
  timeframe: string;
  currentPrice?: number;
  setup?: TradeSetup | null;
  onTimeframeChange?: (tf: string) => void;
}

interface Candle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  exchange,
  timeframe,
  currentPrice,
  setup,
  onTimeframeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const lastCandleRef = useRef<Candle | null>(null);

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [livePrice, setLivePrice] = useState<number | undefined>(currentPrice);

  // Update internal live price when currentPrice prop updates
  useEffect(() => {
    if (currentPrice && currentPrice > 0) {
      setLivePrice(currentPrice);
    }
  }, [currentPrice]);

  // Setup position helpers
  const isLong = setup?.position === 'LONG';
  const isShort = setup?.position === 'SHORT';
  const isNeutral = !setup || setup.position === 'NEUTRAL';

  const positionBadgeStyle = isLong
    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
    : isShort
    ? 'bg-rose-950/80 text-rose-400 border border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
    : 'bg-amber-950/60 text-amber-400 border border-amber-600/60';

  const PositionIcon = isLong ? TrendingUp : isShort ? TrendingDown : PauseCircle;

  // Copy Pine Script helper
  const handleCopyPine = async () => {
    const code = generateAdvancedPineScriptCode(
      setup ? ({ trade_setup: setup } as unknown as StructuredLLMOutput) : null,
      symbol
    );
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  // Generate fallback candles if network fails
  const generateFallbackCandles = useCallback(() => {
    const candles: Candle[] = [];
    const now = Math.floor(Date.now() / 1000);
    let intervalSeconds = 15 * 60;
    if (timeframe === '1m') intervalSeconds = 60;
    if (timeframe === '5m') intervalSeconds = 5 * 60;
    if (timeframe === '1h') intervalSeconds = 3600;
    if (timeframe === '4h') intervalSeconds = 4 * 3600;
    if (timeframe === '1d') intervalSeconds = 86400;

    let base = livePrice && livePrice > 0 ? livePrice : 67000;
    if (symbol.includes('ETH')) base = livePrice || 3500;
    if (symbol.includes('SOL')) base = livePrice || 165;

    for (let i = 120; i >= 0; i--) {
      const time = (now - i * intervalSeconds) as Time;
      const volatility = base * 0.005;
      const open = base + (Math.random() - 0.49) * volatility;
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
  }, [symbol, timeframe, livePrice]);

  // Main Effect: Create & Manage Lightweight Chart + Live Polling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#040406' },
        textColor: '#9194a1',
        fontSize: 12,
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
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#1c1d22',
        timeVisible: true,
        secondsVisible: false,
      },
      width: container.clientWidth,
      height: 360,
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

    let isSubscribed = true;
    setLoading(true);

    const loadMarketCandles = async () => {
      try {
        const timeframeMinutes =
          timeframe === '1m' ? 1 : timeframe === '5m' ? 5 : timeframe === '15m' ? 15 : timeframe === '1h' ? 60 : timeframe === '4h' ? 240 : 1440;
        const since = Date.now() - 150 * timeframeMinutes * 60 * 1000;

        const response = await fetch(
          `/api/market/history-ohlcv?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}&timeframe=${timeframe}&since=${since}&limit=200`
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (data.candles && Array.isArray(data.candles) && data.candles.length > 0) {
          const formatted: Candle[] = data.candles.map(
            (c: { timestamp: number; open: number; high: number; low: number; close: number }) => ({
              time: Math.floor(c.timestamp / 1000) as Time,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            })
          );

          // Deduplicate and sort timestamps ascending
          const uniqueTimes = new Map<Time, Candle>();
          formatted.forEach((item) => uniqueTimes.set(item.time, item));
          const sorted = Array.from(uniqueTimes.values()).sort((a, b) => (a.time as number) - (b.time as number));

          if (isSubscribed && seriesRef.current) {
            seriesRef.current.setData(sorted);
            lastCandleRef.current = sorted[sorted.length - 1] || null;
            if (sorted.length > 0) {
              setLivePrice(sorted[sorted.length - 1].close);
            }
            chart.timeScale().fitContent();
          }
        } else {
          throw new Error('Empty candle data');
        }
      } catch {
        if (isSubscribed && seriesRef.current) {
          const fallback = generateFallbackCandles();
          seriesRef.current.setData(fallback);
          lastCandleRef.current = fallback[fallback.length - 1] || null;
          chart.timeScale().fitContent();
        }
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    loadMarketCandles();

    // Live streaming poll every 10 seconds
    const pollInterval = setInterval(() => {
      loadMarketCandles();
    }, 10_000);

    // Clear old price lines
    priceLinesRef.current.forEach((line) => {
      try {
        candlestickSeries.removePriceLine(line);
      } catch {}
    });
    priceLinesRef.current = [];

    // Add Trade Setup Overlay Price Lines
    if (setup && !isNeutral) {
      if (setup.entry_range?.[0]) {
        const line = candlestickSeries.createPriceLine({
          price: setup.entry_range[0],
          color: '#3b82f6',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `Entry Min: $${setup.entry_range[0]}`,
        });
        priceLinesRef.current.push(line);
      }

      if (setup.entry_range?.[1]) {
        const line = candlestickSeries.createPriceLine({
          price: setup.entry_range[1],
          color: '#3b82f6',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `Entry Max: $${setup.entry_range[1]}`,
        });
        priceLinesRef.current.push(line);
      }

      if (setup.stop_loss) {
        const line = candlestickSeries.createPriceLine({
          price: setup.stop_loss,
          color: '#f43f5e',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `Stop Loss: $${setup.stop_loss}`,
        });
        priceLinesRef.current.push(line);
      }

      if (setup.take_profit_1) {
        const line = candlestickSeries.createPriceLine({
          price: setup.take_profit_1,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP1: $${setup.take_profit_1}`,
        });
        priceLinesRef.current.push(line);
      }

      if (setup.take_profit_2) {
        const line = candlestickSeries.createPriceLine({
          price: setup.take_profit_2,
          color: '#14b8a6',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP2: $${setup.take_profit_2}`,
        });
        priceLinesRef.current.push(line);
      }

      if (setup.take_profit_3) {
        const line = candlestickSeries.createPriceLine({
          price: setup.take_profit_3,
          color: '#84cc16',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP3: $${setup.take_profit_3}`,
        });
        priceLinesRef.current.push(line);
      }
    }

    // Handle container resize dynamically
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
      clearInterval(pollInterval);
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol, exchange, timeframe, setup, isNeutral, refreshKey, generateFallbackCandles]);

  // Real-time tick updates when livePrice / currentPrice changes
  useEffect(() => {
    if (!seriesRef.current || !livePrice || livePrice <= 0) return;

    const intervalSeconds =
      timeframe === '1m' ? 60 : timeframe === '5m' ? 300 : timeframe === '15m' ? 900 : timeframe === '1h' ? 3600 : timeframe === '4h' ? 14400 : 86400;

    const nowSeconds = Math.floor(Date.now() / 1000);
    const candleTime = (Math.floor(nowSeconds / intervalSeconds) * intervalSeconds) as Time;

    if (lastCandleRef.current && (lastCandleRef.current.time as number) === (candleTime as number)) {
      // Update existing live candle
      const updatedCandle: Candle = {
        time: candleTime,
        open: lastCandleRef.current.open,
        high: Math.max(lastCandleRef.current.high, livePrice),
        low: Math.min(lastCandleRef.current.low, livePrice),
        close: livePrice,
      };
      lastCandleRef.current = updatedCandle;
      seriesRef.current.update(updatedCandle);
    } else {
      // Start a new candle period
      const newCandle: Candle = {
        time: candleTime,
        open: livePrice,
        high: livePrice,
        low: livePrice,
        close: livePrice,
      };
      lastCandleRef.current = newCandle;
      seriesRef.current.update(newCandle);
    }
  }, [livePrice, timeframe]);

  const availableTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-none p-4 flex flex-col w-full space-y-3">
      {/* TradingView Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2 border-b border-[#1c1d22]">
        <div className="flex items-center gap-2">
          {/* Live Pulsing Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-950/80 border border-emerald-500 text-emerald-400 font-mono text-xs">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>LIVE {livePrice ? `$${livePrice.toLocaleString()}` : ''}</span>
          </div>

          <span className="font-mono text-xs font-bold text-[#ffffff] uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-[#cc9166]" />
            TradingView Lightweight Chart
          </span>
          <span className="text-xs font-mono text-[#cc9166] px-2 py-0.5 bg-[#121317] border border-[#1c1d22]">
            {symbol} ({exchange.toUpperCase()})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Quick Switcher */}
          <div className="flex items-center bg-[#121317] border border-[#1c1d22] p-0.5">
            {availableTimeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange?.(tf)}
                className={`px-2 py-0.5 text-xs font-mono transition-all cursor-pointer ${
                  tf === timeframe
                    ? 'bg-[#cc9166] text-[#08080a] font-bold'
                    : 'text-[#9194a1] hover:text-[#e2e3e9] hover:bg-[#1c1d22]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] hover:border-[#cc9166] text-[#9194a1] hover:text-[#e2e3e9] transition-all cursor-pointer"
            title="Reload Chart Data"
          >
            <RefreshCw className={`w-3 h-3 text-[#cc9166] ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>

          <button
            onClick={handleCopyPine}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-400 text-[#08080a] font-bold'
                : 'bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] hover:border-[#cc9166] text-[#e2e3e9]'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#08080a]" /> : <Copy className="w-3.5 h-3.5 text-[#cc9166]" />}
            <span>{copied ? 'Pine Copied!' : 'Copy Pine Script'}</span>
          </button>
        </div>
      </div>

      {/* Floating Level Overlay Banner */}
      {setup && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121317] border border-[#1c1d22] p-2.5 text-xs font-mono">
          <div className={`flex items-center gap-1.5 font-bold px-3 py-1 ${positionBadgeStyle}`}>
            <PositionIcon className="w-3.5 h-3.5" />
            <span>
              {setup.position} {setup.recommended_leverage && !isNeutral ? `(${setup.recommended_leverage})` : ''}
            </span>
            {!isNeutral && (
              <>
                <span className="text-[#5e616e]">|</span>
                <span>R:R {setup.risk_reward_ratio}R</span>
              </>
            )}
          </div>

          {isNeutral ? (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-950/40 border border-amber-800/50 px-3 py-1 font-mono text-xs">
              <PauseCircle className="w-3.5 h-3.5" />
              <span>No active trade levels — Monitor market structure</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/80 border border-rose-500 px-3 py-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>SL: ${setup.stop_loss}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[#ffffff] font-medium bg-[#08080a] border border-[#1c1d22] px-3 py-1">
                <span>Entry: ${setup.entry_range?.[0]} - ${setup.entry_range?.[1]}</span>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-900/60 px-3 py-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>TP1: ${setup.take_profit_1}</span>
              </div>

              <div className="flex items-center gap-1.5 text-teal-400 font-bold bg-teal-950/60 border border-teal-900/60 px-3 py-1">
                <span>TP2: ${setup.take_profit_2}</span>
              </div>

              <div className="flex items-center gap-1.5 text-lime-400 font-bold bg-lime-950/60 border border-lime-900/60 px-3 py-1">
                <span>TP3: ${setup.take_profit_3}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TradingView Lightweight Chart Container */}
      <div className="relative w-full h-[360px] border border-[#1c1d22] bg-[#040406]">
        {loading && (
          <div className="absolute inset-0 bg-[#040406]/70 backdrop-blur-xs flex items-center justify-center z-10 font-mono text-xs text-[#cc9166]">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            <span>Loading TradingView Lightweight Chart ({symbol})...</span>
          </div>
        )}
        <div ref={containerRef} className="w-full h-[360px]" />
      </div>
    </div>
  );
};
