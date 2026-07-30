'use client';

import { useQuery } from '@tanstack/react-query';

interface TickerSnapshot {
  price: number;
  change24h: number;
  change24hPercentage: number;
}

let consecutiveFailures = 0;
const MAX_FAILURES = 2;
const BASE_INTERVAL = 15_000; // 15s normal poll
const BACKOFF_INTERVAL = 60_000; // 60s when network is down

export function useTickerPoll(symbol: string, exchange: string) {
  return useQuery<TickerSnapshot>({
    queryKey: ['ticker-poll', symbol, exchange],
    queryFn: async () => {
      const res = await fetch(
        `/api/market/ticker?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`
      );
      if (!res.ok) throw new Error('Ticker poll failed');
      const data: TickerSnapshot = await res.json();
      // Success — reset failure counter
      consecutiveFailures = 0;
      return data;
    },
    refetchInterval: (query) => {
      // Backoff when network is down: progressively slow the poll
      if (query.state.error || query.state.data?.price === 0) {
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_FAILURES) {
          return BACKOFF_INTERVAL;
        }
      }
      return BASE_INTERVAL;
    },
    staleTime: BASE_INTERVAL,
    retry: 0, // Don't retry — fail fast, the next poll will try again
  });
}
