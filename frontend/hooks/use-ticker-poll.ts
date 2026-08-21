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
    queryFn: async ({ signal }) => {
      const res = await fetch(
        `/api/market/ticker?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
        { signal }
      );
      if (!res.ok) throw new Error('Ticker poll failed');
      return res.json();
    },
    refetchInterval: 60_000,  // 60s — server always responds instantly from cache
    refetchIntervalInBackground: false, // pause polling when tab is in background
    staleTime: 120_000,       // 120s — don't show loading spinners
    retry: 0,
  });
}
