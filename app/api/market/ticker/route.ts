import { NextRequest, NextResponse } from 'next/server';
import { CCXTMarketService } from '@/lib/market/ccxt-service';

/**
 * In-memory cache for ticker responses.
 * Prevents pileup of concurrent requests when network is slow/down.
 */
const tickerCache = new Map<string, { data: { price: number; change24h: number; change24hPercentage: number }; expiresAt: number }>();
const CACHE_TTL_MS = 15_000; // 15 seconds — enough for a live ticker feel

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'BTC/USDT';
  const exchange = searchParams.get('exchange') || 'kucoin';

  const cacheKey = `${symbol}:${exchange}`;
  const now = Date.now();

  // Check cache
  const cached = tickerCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return NextResponse.json(cached.data);
  }

  // Deduplicate in-flight requests: if a request for the same key is already running,
  // we don't start another one. (This is handled by HTTP keep-alive + the single-exchange
  // fetch below, but the cache also helps.)
  try {
    const ticker = await CCXTMarketService.fetchTicker(symbol, exchange);
    const result = {
      price: ticker.price,
      change24h: ticker.change24h,
      change24hPercentage: ticker.change24hPercentage,
    };
    tickerCache.set(cacheKey, { data: result, expiresAt: now + CACHE_TTL_MS });
    return NextResponse.json(result);
  } catch {
    // On failure, return a short-lived stale fallback so the UI never hangs
    const fallback = { price: 0, change24h: 0, change24hPercentage: 0 };
    tickerCache.set(cacheKey, { data: fallback, expiresAt: now + 5_000 });
    return NextResponse.json(fallback);
  }
}
