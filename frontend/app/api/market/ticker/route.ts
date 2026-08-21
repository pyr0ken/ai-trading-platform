import { NextRequest, NextResponse } from 'next/server';
import { CCXTMarketService } from '@/lib/market/ccxt-service';
import { ForexMarketService } from '@/lib/market/forex-service';
import { getPipInfo } from '@/lib/constants/forex-pairs';

/**
 * Stale-while-revalidate cache for ticker responses.
 * NEVER hangs waiting for the exchange — always returns cached data instantly if available,
 * then refreshes in the background. This prevents IO pileup when network is degraded.
 */
interface CacheEntry {
  data: { price: number; change24h: number; change24hPercentage: number };
  /** Hard expiry — after this, we must wait for fresh data */
  expiresAt: number;
  /** Stale expiry — serve stale data and trigger background refresh until this */
  staleAt: number;
  /** A promise for an in-flight refresh — deduplicates concurrent requests */
  refreshPromise: Promise<{ price: number; change24h: number; change24hPercentage: number }> | null;
}

const MAX_CACHE_SIZE = 100;
const cache = new Map<string, CacheEntry>();
const FRESH_TTL_MS = 60_000;    // 60 seconds: serve directly from cache
const STALE_TTL_MS = 300_000;   // 5 minutes: serve stale + bg refresh

function evictOldestIfNeeded() {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'BTC/USDT';
  const exchange = searchParams.get('exchange') || 'kucoin';

  const pipInfo = getPipInfo(symbol);
  const isForex = pipInfo.isForex || exchange.toLowerCase() === 'forex' || exchange.toLowerCase() === 'oanda';

  const cacheKey = `${symbol}:${exchange}`;
  const now = Date.now();
  const entry = cache.get(cacheKey);

  // 1. Fresh cache hit — return instantly (most common case)
  if (entry && now < entry.expiresAt) {
    return NextResponse.json(entry.data);
  }

  // 2. Stale cache hit — return stale data, trigger background refresh
  if (entry && now < entry.staleAt) {
    if (!entry.refreshPromise) {
      entry.refreshPromise = refresh(cacheKey, symbol, exchange, isForex).catch(() => entry.data);
    }
    return NextResponse.json(entry.data);
  }

  // 3. No cache or stale past limit — must refresh (return stale if exists)
  if (entry) {
    refresh(cacheKey, symbol, exchange, isForex).catch(() => {});
    return NextResponse.json(entry.data);
  }

  // 4. First request ever — no cache at all, must wait
  try {
    const result = await refresh(cacheKey, symbol, exchange, isForex);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { price: null, change24h: null, change24hPercentage: null, message: 'Market data temporarily unavailable' },
      { status: 503 }
    );
  }
}

async function refresh(
  cacheKey: string,
  symbol: string,
  exchange: string,
  isForex: boolean
): Promise<{ price: number; change24h: number; change24hPercentage: number }> {
  const entry = cache.get(cacheKey);

  // If a refresh is already in-flight, wait for it
  if (entry?.refreshPromise) {
    try {
      await entry.refreshPromise;
    } catch {
      throw new Error('Exchange API failed');
    }
    const updated = cache.get(cacheKey);
    if (!updated) throw new Error('Cache cleared during refresh');
    return updated!.data;
  }

  // Mark in-flight
  const refreshPromise = doFetch(symbol, exchange, cacheKey, isForex);
  if (entry) entry.refreshPromise = refreshPromise;

  try {
    return await refreshPromise;
  } finally {
    const updated = cache.get(cacheKey);
    if (updated) updated.refreshPromise = null;
  }
}

async function doFetch(
  symbol: string,
  exchange: string,
  cacheKey: string,
  isForex: boolean
): Promise<{ price: number; change24h: number; change24hPercentage: number }> {
  const now = Date.now();

  const ticker = isForex
    ? await ForexMarketService.fetchTicker(symbol)
    : await CCXTMarketService.fetchTicker(symbol, exchange);

  if (!ticker || !ticker.price || ticker.price <= 0) {
    throw new Error('Invalid ticker data received from exchange');
  }

  const result = {
    price: ticker.price,
    change24h: ticker.change24h,
    change24hPercentage: ticker.change24hPercentage,
  };

  evictOldestIfNeeded();
  cache.set(cacheKey, {
    data: result,
    expiresAt: now + FRESH_TTL_MS,
    staleAt: now + STALE_TTL_MS,
    refreshPromise: null,
  });

  return result;
}
