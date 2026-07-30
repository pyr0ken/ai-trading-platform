import { NextRequest, NextResponse } from 'next/server';
import { CCXTMarketService } from '@/lib/market/ccxt-service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'BTC/USDT';
  const exchange = searchParams.get('exchange') || 'kucoin';

  try {
    const ticker = await CCXTMarketService.fetchTicker(symbol, exchange);
    if (!ticker || ticker.price <= 0) {
      return NextResponse.json({ price: 0, change24h: 0, change24hPercentage: 0 });
    }
    return NextResponse.json({
      price: ticker.price,
      change24h: ticker.change24h,
      change24hPercentage: ticker.change24hPercentage,
    });
  } catch {
    return NextResponse.json({ price: 0, change24h: 0, change24hPercentage: 0 });
  }
}
