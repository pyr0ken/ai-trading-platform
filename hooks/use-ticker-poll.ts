'use client';

import { useQuery } from '@tanstack/react-query';

interface TickerSnapshot {
  price: number;
  change24h: number;
  change24hPercentage: number;
}

export function useTickerPoll(symbol: string, exchange: string) {
  return useQuery<TickerSnapshot>({
    queryKey: ['ticker-poll', symbol, exchange],
    queryFn: async () => {
      const res = await fetch(
        `/api/market/ticker?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`
      );
      if (!res.ok) throw new Error('Ticker poll failed');
      return res.json();
    },
    // Poll very rarely — the server-side stale-while-revalidate cache handles freshness.
    // Server returns cached data instantly for 60s, then stale+bg-refresh for 5min.
    // The client only needs to pick up updated values occasionally.
    refetchInterval: 60_000,  // 60s — server always responds instantly from cache
    staleTime: 120_000,       // 120s — don't show loading spinners
    retry: 0,
  });
}
