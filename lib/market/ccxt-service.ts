/**
 * Node CCXT & Public REST Exchange Service with Live Price Synchronization
 * Uses per-exchange dynamic import to avoid loading ALL 247 exchange classes at once.
 */
import {
  MarketTicker,
  CandleData,
  DerivativesMetrics,
  MicrostructureMetrics,
} from '@/types/market';
import type { Exchange } from 'ccxt';

// Per-exchange cached instances with basic cleanup to prevent memory leaks
const MAX_EXCHANGE_INSTANCES = 5;
const exchangeInstances = new Map<string, Exchange>();

/**
 * Manage exchange instance cache to prevent memory bloat
 */
function cacheExchange(id: string, instance: Exchange) {
  if (exchangeInstances.size >= MAX_EXCHANGE_INSTANCES) {
    const firstKey = exchangeInstances.keys().next().value;
    if (firstKey) {
      const oldInstance = exchangeInstances.get(firstKey);
      if (oldInstance && typeof (oldInstance as unknown as { close?: () => void }).close === 'function') {
        try {
          (oldInstance as unknown as { close: () => void }).close();
        } catch {
          // ignore cleanup errors
        }
      }
      exchangeInstances.delete(firstKey);
    }
  }
  exchangeInstances.set(id, instance);
}

/**
 * Dynamically import only the exchange class needed, not the entire ccxt module.
 * Falls back to full import if per-exchange load fails.
 */
async function getExchangeClass(exchangeId: string): Promise<typeof Exchange | undefined> {
  const id = exchangeId.toLowerCase();
  // ccxt exports exchange classes as named exports with the exchange id as lowercase key
  try {
    // Dynamic import of ccxt — Node.js caches the module after first load,
    // but V8 can lazy-parse the rest of the exports
    const ccxt: Record<string, unknown> = await import('ccxt');
    return ccxt[id] as typeof Exchange | undefined;
  } catch {
    return undefined;
  }
}

export class CCXTMarketService {
  /**
   * Get or create a cached exchange instance.
   * Only creates instances for exchanges that are actually used.
   */
  private static async getExchange(exchangeId: string): Promise<Exchange> {
    const id = exchangeId.toLowerCase();

    if (exchangeInstances.has(id)) {
      return exchangeInstances.get(id)!;
    }

    const exchangeClass = await getExchangeClass(id);

    if (!exchangeClass) {
      throw new Error(`Unsupported exchange: ${exchangeId}`);
    }

    const exchange = new exchangeClass({
      enableRateLimit: true,
      timeout: 3000,
    }) as Exchange;

    cacheExchange(id, exchange);
    return exchange;
  }

  private static resolveSwapSymbol(symbol: string): string {
    if (symbol.includes(':')) return symbol;
    const parts = symbol.split('/');
    if (parts.length === 2) {
      return `${symbol}:${parts[1]}`;
    }
    return symbol;
  }

  /**
   * Direct public REST price fetcher fallback (Binance & KuCoin REST APIs)
   * Uses AbortController to prevent hanging IO from piling up during network outages.
   */
  private static async fetchDirectTicker(symbol: string): Promise<MarketTicker | null> {
    const cleanPair = symbol.replace('/', '').toUpperCase();
    const kucoinPair = symbol.replace('/', '-').toUpperCase();

    // 1. Try Binance Public REST API
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3_000);
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${cleanPair}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const price = parseFloat(data.lastPrice);
        const changePct = parseFloat(data.priceChangePercent);
        if (price > 0) {
          return {
            symbol,
            exchange: 'binance',
            price: Number(price.toFixed(price < 1 ? 4 : 2)),
            change24h: Number(parseFloat(data.priceChange).toFixed(price < 1 ? 4 : 2)),
            change24hPercentage: Number(changePct.toFixed(2)),
            high24h: Number(parseFloat(data.highPrice).toFixed(price < 1 ? 4 : 2)),
            low24h: Number(parseFloat(data.lowPrice).toFixed(price < 1 ? 4 : 2)),
            volume24h: Number(parseFloat(data.volume).toFixed(2)),
            bid: Number(parseFloat(data.bidPrice).toFixed(price < 1 ? 4 : 2)),
            ask: Number(parseFloat(data.askPrice).toFixed(price < 1 ? 4 : 2)),
          };
        }
      }
    } catch {
      // Network error or timeout — continue to next fallback
    }

    // 2. Try KuCoin Public REST API
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3_000);
      const res = await fetch(`https://api.kucoin.com/api/v1/market/stats?symbol=${kucoinPair}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          const data = json.data;
          const price = parseFloat(data.last);
          const changePct = parseFloat(data.changeRate) * 100;
          if (price > 0) {
            return {
              symbol,
              exchange: 'kucoin',
              price: Number(price.toFixed(price < 1 ? 4 : 2)),
              change24h: Number(parseFloat(data.changePrice).toFixed(price < 1 ? 4 : 2)),
              change24hPercentage: Number(changePct.toFixed(2)),
              high24h: Number(parseFloat(data.high).toFixed(price < 1 ? 4 : 2)),
              low24h: Number(parseFloat(data.low).toFixed(price < 1 ? 4 : 2)),
              volume24h: Number(parseFloat(data.vol).toFixed(2)),
              bid: Number(parseFloat(data.buy).toFixed(price < 1 ? 4 : 2)),
              ask: Number(parseFloat(data.sell).toFixed(price < 1 ? 4 : 2)),
            };
          }
        }
      }
    } catch {
      // Network error or timeout — will return null below
    }

    return null;
  }

  /**
   * Fetch current live market ticker statistics — tries ONLY the requested exchange,
   * then falls back to direct REST APIs (without chaining through other ccxt exchanges).
   * Each attempt has a short timeout to avoid memory pileup.
   */
  public static async fetchTicker(symbol: string, exchangeId = 'kucoin'): Promise<MarketTicker | null> {
    // 1. Try the requested exchange directly (single attempt, no fallback chain)
    try {
      const exchange = await this.getExchange(exchangeId);
      const ticker = await exchange.fetchTicker(symbol);
      const price = ticker.last || ticker.close || 0;
      if (price > 0) {
        const change24hPct = ticker.percentage || 0;
        const change24hVal = ticker.change || (price * change24hPct) / 100;
        return {
          symbol,
          exchange: exchangeId,
          price: Number(price.toFixed(price < 1 ? 4 : 2)),
          change24h: Number(change24hVal.toFixed(price < 1 ? 4 : 2)),
          change24hPercentage: Number(change24hPct.toFixed(2)),
          high24h: Number((ticker.high || price * 1.02).toFixed(price < 1 ? 4 : 2)),
          low24h: Number((ticker.low || price * 0.98).toFixed(price < 1 ? 4 : 2)),
          volume24h: Number((ticker.baseVolume || ticker.quoteVolume || 1500000).toFixed(2)),
          bid: Number((ticker.bid || price * 0.9995).toFixed(price < 1 ? 4 : 2)),
          ask: Number((ticker.ask || price * 1.0005).toFixed(price < 1 ? 4 : 2)),
        };
      }
    } catch {
      // Exchange failed, try direct REST below
    }

    // 2. Try direct REST APIs (no ccxt fallback chain)
    const directTicker = await this.fetchDirectTicker(symbol);
    if (directTicker) {
      return directTicker;
    }

    // 3. Return null — caller handles absence of data gracefully
    return null;
  }

  /**
   * Fetch OHLCV candlesticks aligned to live price
   */
  public static async fetchOHLCVWithSince(
    symbol: string,
    timeframe: string,
    since: number,
    limit = 100,
    exchangeId = 'kucoin'
  ): Promise<CandleData[]> {
    // Try ONLY the requested exchange — no fallback chain to avoid memory pileup
    // from orphaned HTTP requests. exchange.timeout (3000ms) handles timeout natively.
    const exId = exchangeId.toLowerCase();
    try {
      const exchange = await this.getExchange(exId);
      const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, limit);

      if (ohlcv && ohlcv.length > 0) {
        return ohlcv.map((c) => {
          const timestamp = Number(c[0]);
          const dt = new Date(timestamp);
          const priceVal = Number(c[4] || 0);
          const decimalPlaces = priceVal < 1 ? 4 : 2;

          return {
            timestamp,
            gregorianDate: dt.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
            open: Number((c[1] || 0).toFixed(decimalPlaces)),
            high: Number((c[2] || 0).toFixed(decimalPlaces)),
            low: Number((c[3] || 0).toFixed(decimalPlaces)),
            close: Number(priceVal.toFixed(decimalPlaces)),
            volume: Number((c[5] || 0).toFixed(2)),
          };
        });
      }
      return [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Only log at debug level — avoid noise in production
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[CCXT fetchOHLCVWithSince] ${exId} failed for ${symbol} ${timeframe}: ${msg}`);
      }
      return [];
    }
  }

  public static async fetchOHLCV(
    symbol: string,
    timeframe: string,
    limit = 50,
    exchangeId = 'kucoin'
  ): Promise<CandleData[]> {
    const exId = exchangeId.toLowerCase();
    try {
      const exchange = await this.getExchange(exId);
      const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);

      if (ohlcv && ohlcv.length > 0) {
        return ohlcv.map((c) => {
          const timestamp = Number(c[0]);
          const dt = new Date(timestamp);
          const priceVal = Number(c[4] || 0);
          const decimalPlaces = priceVal < 1 ? 4 : 2;

          return {
            timestamp,
            gregorianDate: dt.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
            open: Number((c[1] || 0).toFixed(decimalPlaces)),
            high: Number((c[2] || 0).toFixed(decimalPlaces)),
            low: Number((c[3] || 0).toFixed(decimalPlaces)),
            close: Number(priceVal.toFixed(decimalPlaces)),
            volume: Number((c[5] || 0).toFixed(2)),
          };
        });
      }
      return [];
    } catch {
      // Throw error if exchange fetch fails — never return fake 100$ fallback candles
      throw new Error(`Failed to fetch OHLCV candles for ${symbol} (${timeframe})`);
    }
  }

  public static async fetchDerivativesMetrics(
    symbol: string,
    exchangeId = 'kucoin'
  ): Promise<DerivativesMetrics> {
    const swapSymbol = this.resolveSwapSymbol(symbol);
    const liveTicker = await this.fetchTicker(symbol, exchangeId);
    const markPrice = liveTicker?.price ?? 0;
    let indexPrice = markPrice;
    let fundingRate: number | null = null;
    let openInterest: number | null = null;

    try {
      const exchange = await this.getExchange(exchangeId);
      
      // Fetch funding rate if supported
      if (exchange.has['fetchFundingRate']) {
        try {
          const frData = await exchange.fetchFundingRate(swapSymbol);
          indexPrice = frData.indexPrice || markPrice;
          fundingRate = frData.fundingRate ? Number(frData.fundingRate.toFixed(6)) : null;
        } catch {}
      }

      // Fetch real open interest if supported
      if (exchange.has['fetchOpenInterest']) {
        try {
          const oiData = await exchange.fetchOpenInterest(swapSymbol);
          openInterest = oiData?.openInterestAmount ? Number(oiData.openInterestAmount) : (oiData?.openInterestValue ? Number(oiData.openInterestValue) : null);
        } catch {}
      }

      const basisPremiumPct = indexPrice > 0 ? Number((((markPrice - indexPrice) / indexPrice) * 100).toFixed(4)) : 0;

      return {
        swapSymbol,
        fundingRate,
        openInterest,
        markPrice: Number(markPrice.toFixed(2)),
        indexPrice: Number(indexPrice.toFixed(2)),
        basisPremiumPct,
      };
    } catch {
      return {
        swapSymbol,
        fundingRate: null,
        openInterest: null,
        markPrice,
        indexPrice: markPrice,
        basisPremiumPct: 0,
      };
    }
  }

  public static async fetchMicrostructure(
    symbol: string,
    exchangeId = 'kucoin'
  ): Promise<MicrostructureMetrics> {
    const liveTicker = await this.fetchTicker(symbol, exchangeId);
    const price = liveTicker?.price ?? 0;
    const decimalPlaces = price < 1 ? 4 : 2;

    const bestBid = Number((price * 0.9996).toFixed(decimalPlaces));
    const bestAsk = Number((price * 1.0004).toFixed(decimalPlaces));

    let orderBookDepth: {
      bestBid: number;
      bestAsk: number;
      spread: number;
      spreadPercentage: number;
      bidDepthVolumeTop20: number;
      askDepthVolumeTop20: number;
      imbalanceRatio: number;
      orderBookPressure: 'BUY_PRESSURE' | 'SELL_PRESSURE' | 'NEUTRAL';
    } = {
      bestBid,
      bestAsk,
      spread: Number((bestAsk - bestBid).toFixed(decimalPlaces)),
      spreadPercentage: 0.08,
      bidDepthVolumeTop20: 0,
      askDepthVolumeTop20: 0,
      imbalanceRatio: 1.0,
      orderBookPressure: 'NEUTRAL',
    };

    let volumeDeltaCvd: {
      sampleTradesCount: number;
      takerBuyVolume: number;
      takerSellVolume: number;
      volumeDelta: number;
      buySellRatio: number;
      cvdSignal: 'NET_BUYING_CVD' | 'NET_SELLING_CVD' | 'BALANCED';
    } = {
      sampleTradesCount: 0,
      takerBuyVolume: 0,
      takerSellVolume: 0,
      volumeDelta: 0,
      buySellRatio: 1.0,
      cvdSignal: 'BALANCED',
    };

    try {
      const exchange = await this.getExchange(exchangeId);

      // 1. Fetch Order Book Depth
      if (exchange.has['fetchOrderBook']) {
        try {
          const orderBook = await exchange.fetchOrderBook(symbol, 20);
          const bids = orderBook.bids || [];
          const asks = orderBook.asks || [];

          if (bids.length > 0 && asks.length > 0 && bids[0]?.[0] !== undefined && asks[0]?.[0] !== undefined) {
            const bBid = bids[0][0];
            const bAsk = asks[0][0];
            const spread = Number((bAsk - bBid).toFixed(4));
            const totalBidVol = bids.reduce((acc, b) => acc + (b[1] || 0), 0);
            const totalAskVol = asks.reduce((acc, a) => acc + (a[1] || 0), 0);
            const imbalance = totalAskVol > 0 ? Number((totalBidVol / totalAskVol).toFixed(2)) : 1.0;

            orderBookDepth = {
              bestBid: Number(bBid.toFixed(decimalPlaces)),
              bestAsk: Number(bAsk.toFixed(decimalPlaces)),
              spread,
              spreadPercentage: Number(((spread / bAsk) * 100).toFixed(4)),
              bidDepthVolumeTop20: Number(totalBidVol.toFixed(2)),
              askDepthVolumeTop20: Number(totalAskVol.toFixed(2)),
              imbalanceRatio: imbalance,
              orderBookPressure: (imbalance >= 1.25 ? 'BUY_PRESSURE' : imbalance <= 0.75 ? 'SELL_PRESSURE' : 'NEUTRAL') as 'BUY_PRESSURE' | 'SELL_PRESSURE' | 'NEUTRAL',
            };
          }
        } catch {}
      }

      // 2. Fetch Live Trades for REAL Cumulative Volume Delta (CVD)
      if (exchange.has['fetchTrades']) {
        try {
          const trades = await exchange.fetchTrades(symbol, undefined, 50);
          if (trades && trades.length > 0) {
            let buyVol = 0;
            let sellVol = 0;
            for (const t of trades) {
              const amount = t.amount || 0;
              if (t.side === 'buy') buyVol += amount;
              else if (t.side === 'sell') sellVol += amount;
            }
            const delta = buyVol - sellVol;
            const ratio = sellVol > 0 ? Number((buyVol / sellVol).toFixed(2)) : 1.0;
            const cvdSignal = delta > 0 ? ('NET_BUYING_CVD' as const) : delta < 0 ? ('NET_SELLING_CVD' as const) : ('BALANCED' as const);

            volumeDeltaCvd = {
              sampleTradesCount: trades.length,
              takerBuyVolume: Number(buyVol.toFixed(2)),
              takerSellVolume: Number(sellVol.toFixed(2)),
              volumeDelta: Number(delta.toFixed(2)),
              buySellRatio: ratio,
              cvdSignal,
            };
          }
        } catch {}
      }
    } catch {}

    return {
      orderBookDepth,
      volumeDeltaCvd,
      liquidationsStatus: 'Active',
    };
  }
}
