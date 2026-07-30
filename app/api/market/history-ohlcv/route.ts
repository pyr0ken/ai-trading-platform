import { NextResponse } from 'next/server';
import { CCXTMarketService } from '@/lib/market/ccxt-service';

/**
 * Simple in-memory cache for OHLCV responses.
 * Only caches the JSON body, NOT Response objects (which can't be reused).
 */
interface CacheEntry {
  data: unknown;
  expiresAt: number;
}
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds (was 10s)
const MAX_CACHE_SIZE = 50;

// Cleanup stale entries periodically
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 30_000;

function cleanupCache(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of responseCache) {
    if (now >= entry.expiresAt) {
      responseCache.delete(key);
    }
  }

  // If still too big, evict oldest half
  if (responseCache.size > MAX_CACHE_SIZE) {
    const keys = Array.from(responseCache.keys()).slice(0, Math.floor(MAX_CACHE_SIZE / 2));
    keys.forEach((k) => responseCache.delete(k));
  }
}

function getCached(key: string): unknown | undefined {
  cleanupCache();
  const entry = responseCache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  if (entry) responseCache.delete(key);
  return undefined;
}

function setCache(key: string, data: unknown): void {
  cleanupCache();
  // Evict if at capacity
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTC/USDT';
  const exchange = searchParams.get('exchange') || 'kucoin';
  const timeframe = searchParams.get('timeframe') || '1m';
  const sinceStr = searchParams.get('since');
  const limitStr = searchParams.get('limit') || '500';

  if (!sinceStr) {
    return NextResponse.json({ error: 'Missing since parameter' }, { status: 400 });
  }

  const since = parseInt(sinceStr, 10);
  const limit = parseInt(limitStr, 10);
  const cacheKey = `${symbol}:${exchange}:${timeframe}:${since}:${limit}`;

  // 1. Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // 2. Fetch fresh data
  try {
    const rawCandles = await CCXTMarketService.fetchOHLCVWithSince(
      symbol,
      timeframe,
      since,
      limit,
      exchange,
    );

    const body = { candles: rawCandles };
    setCache(cacheKey, body);
    return NextResponse.json(body);
  } catch (err) {
    console.error('[API /market/history-ohlcv] Error:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch historical candles.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
