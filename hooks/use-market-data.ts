'use client';

import { useQuery } from '@tanstack/react-query';
import { FullMarketContextPayload } from '@/types/analysis';

export function useMarketData(symbol: string, exchange: string, timeframe: string, enabled = false) {
  return useQuery<FullMarketContextPayload>({
    queryKey: ['market-data', symbol, exchange, timeframe],
    queryFn: async () => {
      const res = await fetch(
        `/api/market/full-context?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(
          exchange
        )}&timeframe=${encodeURIComponent(timeframe)}`
      );
      if (!res.ok) {
        throw new Error(`Market data API error: ${res.status}`);
      }
      return res.json();
    },
    enabled, // Only execute when user explicitly clicks Run Analysis button
    staleTime: 30000,
  });
}
