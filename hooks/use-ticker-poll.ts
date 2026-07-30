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
    refetchInterval: 10_000, // poll every 10s
    staleTime: 5_000,
    retry: 1,
  });
}
