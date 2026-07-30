import { NextRequest, NextResponse } from 'next/server';
import { CCXTMarketService } from '@/lib/market/ccxt-service';

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

const cache = new Map<string, CacheEntry>();
const FRESH_TTL_MS = 60_000;    // 60 seconds: serve directly from cache
const STALE_TTL_MS = 300_000;   // 5 minutes: serve stale + bg refresh

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'BTC/USDT';
  const exchange = searchParams.get('exchange') || 'kucoin';

  const cacheKey = `${symbol}:${exchange}`;
  const now = Date.now();
  const entry = cache.get(cacheKey);

  // 1. Fresh cache hit — return instantly (most common case)
  if (entry && now < entry.expiresAt) {
    return NextResponse.json(entry.data);
  }

  // 2. Stale cache hit — return stale data, trigger background refresh
  if (entry && now < entry.staleAt) {
    // If no refresh is already in-flight, start one
    if (!entry.refreshPromise) {
      entry.refreshPromise = refresh(cacheKey, symbol, exchange);
    }
    return NextResponse.json(entry.data);
  }

  // 3. No cache or stale past limit — must refresh (return stale if exists)
  if (entry) {
    // Return stale data while waiting (better than hanging)
    refresh(cacheKey, symbol, exchange);
    return NextResponse.json(entry.data);
  }

  // 4. First request ever — no cache at all, must wait
  const result = await refresh(cacheKey, symbol, exchange);
  return NextResponse.json(result);
}

/**
 * Fetch fresh ticker data from the exchange and update cache.
 * If this is an in-flight deduplication call, it waits for the existing refresh.
 */
async function refresh(
  cacheKey: string,
  symbol: string,
  exchange: string
): Promise<{ price: number; change24h: number; change24hPercentage: number }> {
  const entry = cache.get(cacheKey);

  // If a refresh is already in-flight, wait for it
  if (entry?.refreshPromise) {
    await entry.refreshPromise;
    const updated = cache.get(cacheKey);
    return updated!.data;
  }

  // Mark in-flight
  const refreshPromise = doFetch(symbol, exchange, cacheKey);
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
  cacheKey: string
): Promise<{ price: number; change24h: number; change24hPercentage: number }> {
  const now = Date.now();
  // Default fallback in case the exchange call fails
  const fallback = { price: 0, change24h: 0, change24hPercentage: 0 };

  try {
    const ticker = await CCXTMarketService.fetchTicker(symbol, exchange);
    const result = {
      price: ticker.price,
      change24h: ticker.change24h,
      change24hPercentage: ticker.change24hPercentage,
    };

    // Update cache with fresh data
    cache.set(cacheKey, {
      data: result,
      expiresAt: now + FRESH_TTL_MS,
      staleAt: now + STALE_TTL_MS,
      refreshPromise: null,
    });

    return result;
  } catch {
    // On complete failure: if we had a previous entry, extend its stale window
    // so we don't keep hammering the exchange
    const existing = cache.get(cacheKey);
    if (existing) {
      existing.staleAt = now + 60_000; // Extend stale window by 1 minute
      existing.refreshPromise = null;
      return existing.data;
    }

    // No previous data — return fallback
    cache.set(cacheKey, {
      data: fallback,
      expiresAt: now + 15_000,
      staleAt: now + 60_000,
      refreshPromise: null,
    });
    return fallback;
  }
}
