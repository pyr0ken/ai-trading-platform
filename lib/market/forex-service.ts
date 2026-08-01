import { MarketTicker, CandleData } from '@/types/market';
import { getPipInfo } from '@/lib/constants/forex-pairs';

/**
 * Forex Data Service
 * Provides live forex rates, weekend market status check, and OHLCV candle feeds.
 * Uses Yahoo Finance API as primary source with built-in fallback pricing.
 */
export class ForexMarketService {
  /**
   * Check if Forex Market is closed (Saturdays & Sundays UTC)
   * Forex closes Friday 21:00 UTC and opens Sunday 21:00 UTC
   */
  public static isMarketClosed(): boolean {
    const now = new Date();
    const day = now.getUTCDay();
    const hour = now.getUTCHours();

    if (day === 6) return true;
    if (day === 5 && hour >= 21) return true;
    if (day === 0 && hour < 21) return true;
    return false;
  }

  /**
   * Format pair symbol for Yahoo Finance API
   */
  private static formatYahooSymbol(symbol: string): string {
    const clean = symbol.replace('/', '').toUpperCase();
    if (clean === 'XAUUSD') return 'GC=F';
    if (clean === 'WTIUSD') return 'CL=F';
    if (clean === 'DXY') return 'DX-Y.NYB';
    if (clean === 'US30') return '^DJI';
    if (clean === 'SPX500') return '^GSPC';
    if (clean === 'NAS100') return '^IXIC';
    return `${clean}=X`;
  }

  /**
   * In-memory cache with stale-while-revalidate for forex tickers
   */
  private static tickerCache = new Map<string, { data: MarketTicker; expiresAt: number }>();
  private static TICKER_CACHE_TTL = 30_000; // 30 seconds

  private static getTickerFromCache(symbol: string): MarketTicker | null {
    const entry = this.tickerCache.get(symbol.toUpperCase());
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data;
    }
    return null;
  }

  /**
   * Fetch live Ticker for a Forex Pair / Commodity / Index
   */
  public static async fetchTicker(symbol: string): Promise<MarketTicker> {
    const upper = symbol.toUpperCase();
    
    // Return cached value if fresh
    const cached = this.getTickerFromCache(upper);
    if (cached) return cached;

    const yahooSym = this.formatYahooSymbol(symbol);
    const { decimals, pipSize } = getPipInfo(symbol);

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1m&range=1d`;
      const res = await fetch(url, {
        next: { revalidate: 15 },
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const json = await res.json();
        const result = json?.chart?.result?.[0];
        const meta = result?.meta;
        if (meta && meta.regularMarketPrice) {
          const price = Number(meta.regularMarketPrice);
          const prevClose = Number(meta.chartPreviousClose || meta.previousClose || price);
          const changeVal = Number((price - prevClose).toFixed(decimals));
          const changePct = Number((((price - prevClose) / prevClose) * 100).toFixed(2));

          const ticker: MarketTicker = {
            symbol: upper,
            exchange: 'forex',
            price: Number(price.toFixed(decimals)),
            change24h: changeVal,
            change24hPercentage: changePct,
            high24h: Number((meta.regularMarketDayHigh || price * 1.003).toFixed(decimals)),
            low24h: Number((meta.regularMarketDayLow || price * 0.997).toFixed(decimals)),
            volume24h: Number(meta.regularMarketVolume || 125000),
            bid: Number((price - pipSize).toFixed(decimals)),
            ask: Number((price + pipSize).toFixed(decimals)),
          };

          this.tickerCache.set(upper, { data: ticker, expiresAt: Date.now() + this.TICKER_CACHE_TTL });
          return ticker;
        }
      }
    } catch {
      // Network failure — fall through to fallback
    }

    const fallbackPrices: Record<string, number> = {
      'EUR/USD': 1.0850, 'GBP/USD': 1.2720, 'USD/JPY': 155.40,
      'USD/CHF': 0.8980, 'AUD/USD': 0.6650, 'USD/CAD': 1.3680,
      'NZD/USD': 0.6120, 'EUR/GBP': 0.8530, 'EUR/JPY': 168.60,
      'GBP/JPY': 197.60, 'XAU/USD': 2350.50, 'XAG/USD': 30.20,
      'WTI/USD': 78.50,  'DXY': 104.80,      'US30': 38850.0,
      'SPX500': 5350.0,  'NAS100': 18600.0,
    };

    const basePrice = fallbackPrices[upper] || 1.0;
    const fallbackPip = getPipInfo(symbol).pipSize;
    return {
      symbol: upper,
      exchange: 'forex',
      price: Number(basePrice.toFixed(decimals)),
      change24h: 0.0012,
      change24hPercentage: 0.11,
      high24h: Number((basePrice * 1.003).toFixed(decimals)),
      low24h: Number((basePrice * 0.997).toFixed(decimals)),
      volume24h: 85000,
      bid: Number((basePrice - fallbackPip).toFixed(decimals)),
      ask: Number((basePrice + fallbackPip).toFixed(decimals)),
    };
  }

  /**
   * Fetch OHLCV candles for Forex pairs
   */
  public static async fetchOHLCV(
    symbol: string,
    timeframe: string,
    limit = 50
  ): Promise<CandleData[]> {
    const yahooSym = this.formatYahooSymbol(symbol);
    const { decimals } = getPipInfo(symbol);

    const intervalMap: Record<string, { interval: string; range: string }> = {
      '5m': { interval: '5m', range: '5d' },
      '15m': { interval: '15m', range: '5d' },
      '1h': { interval: '60m', range: '1mo' },
      '4h': { interval: '60m', range: '1mo' },
      '1d': { interval: '1d', range: '6mo' },
    };

    const config = intervalMap[timeframe] || { interval: '60m', range: '1mo' };

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${config.interval}&range=${config.range}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const json = await res.json();
        const chartResult = json?.chart?.result?.[0];
        const timestamps: number[] = chartResult?.timestamp || [];
        const quote = chartResult?.indicators?.quote?.[0] || {};

        if (timestamps.length > 0 && quote.close) {
          const rawCandles: CandleData[] = [];
          for (let i = 0; i < timestamps.length; i++) {
            const close = quote.close[i];
            const open = quote.open[i] ?? close;
            const high = quote.high[i] ?? close;
            const low = quote.low[i] ?? close;
            const volume = quote.volume[i] ?? 1000;

            if (close !== null && close !== undefined && !isNaN(close)) {
              const ts = timestamps[i] * 1000;
              const dt = new Date(ts);

              rawCandles.push({
                timestamp: ts,
                gregorianDate: dt.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
                open: Number(open.toFixed(decimals)),
                high: Number(high.toFixed(decimals)),
                low: Number(low.toFixed(decimals)),
                close: Number(close.toFixed(decimals)),
                volume: Number(volume),
              });
            }
          }

          if (rawCandles.length > 0) {
            return rawCandles.slice(-limit);
          }
        }
      }
    } catch {
      // Failed to fetch real Forex candles — throw error instead of generating fake candles
      throw new Error(`Failed to fetch Forex candles for ${symbol} (${timeframe})`);
    }

    throw new Error(`No Forex candle data returned for ${symbol} (${timeframe})`);
  }
}
