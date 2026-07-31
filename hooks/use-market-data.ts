'use client';

import { useQuery } from '@tanstack/react-query';
import { FullMarketContextPayload } from '@/types/analysis';

export function useMarketData(symbol: string, exchange: string, timeframe: string, enabled = true) {
  return useQuery<FullMarketContextPayload, Error>({
    queryKey: ['market-data', symbol, exchange, timeframe],
    queryFn: async () => {
      const res = await fetch(
        `/api/market/full-context?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(
          exchange
        )}&timeframe=${encodeURIComponent(timeframe)}`
      );
      
      if (!res.ok) {
        let errMsg = `Market data API error: ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.error) {
            errMsg = errData.error;
          }
          if (errData.details) {
            errMsg += ` | Details: ${Array.isArray(errData.details) ? errData.details.join('; ') : errData.details}`;
          }
        } catch {
          // ignore JSON parse error on generic HTML error pages
        }
        throw new Error(errMsg);
      }
      
      const data = await res.json();
      
      // If the backend returns empty candles due to network issues
      if (data.timeframes && Object.keys(data.timeframes).length > 0) {
        const primaryTf = data.metadata?.primaryTimeframe || '1h';
        const tfData = data.timeframes[primaryTf];
        if (!tfData?.candles || tfData.candles.length === 0) {
          throw new Error('Exchange API failed to return market data (Network timeout or Rate Limit). Please try again or switch exchanges.');
        }
      }
      
      return data;
    },
    enabled, // Gate: only fetch when caller flips this on (e.g. user clicked Analyze)
    staleTime: 30000,
    retry: 0, // Do not auto-retry on UI, let the user decide
  });
}
