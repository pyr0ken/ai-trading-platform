import { NextResponse } from 'next/server';
import { CCXTMarketService } from '@/lib/market/ccxt-service';

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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const rawCandles = await CCXTMarketService.fetchOHLCVWithSince(symbol, timeframe, since, limit, exchange);
    clearTimeout(timeout);
    return NextResponse.json({ candles: rawCandles });
  } catch (err) {
    console.error('[API /market/history-ohlcv] Error:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch historical candles.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
