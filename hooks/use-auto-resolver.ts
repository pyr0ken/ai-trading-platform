import { useEffect, useRef } from 'react';
import { AppStorageEngine } from '@/lib/storage/app-db';
import { CandleData } from '@/types/market';

export function useAutoResolver() {
  const resolvedRef = useRef(false);

  useEffect(() => {
    // Only run once on mount to avoid repeated API calls
    if (resolvedRef.current) return;
    resolvedRef.current = true;

    const resolvePendingSignals = async () => {
      const analyses = AppStorageEngine.getAnalyses();
      const pending = analyses.filter(
        (rec) =>
          !rec.accuracy_evaluation ||
          rec.accuracy_evaluation.status === 'PENDING'
      );

      if (pending.length === 0) return;

      console.log(`[AutoResolver] Found ${pending.length} pending signals to resolve.`);

      // Process signals sequentially with a small delay to avoid memory pileup
      for (let i = 0; i < pending.length; i++) {
        const rec = pending[i];
        try {
          // Small delay between signals to let GC breathe
          if (i > 0) {
            await new Promise(r => setTimeout(r, 500));
          }

          const since = new Date(rec.created_at).getTime();
          // We will fetch 1h or 15m candles from since timestamp to current time.
          // Let's use 15m timeframe to get enough price granularities
          const response = await fetch(
            `/api/market/history-ohlcv?symbol=${encodeURIComponent(
              rec.symbol
            )}&exchange=${rec.exchange}&timeframe=15m&since=${since}&limit=100`
          );

          if (!response.ok) continue;

          const data = await response.json();
          const candles: CandleData[] = data.candles || [];

          if (candles.length === 0) continue;

          const setup = rec.json_output?.trade_setup;
          if (!setup) {
            // If there's no trade setup inside JSON (e.g. LLM returned NEUTRAL or invalid JSON)
            AppStorageEngine.updateAnalysisRecordStatus(rec.id, 'INVALIDATED', rec.price, 0);
            continue;
          }

          const entryMin = setup.entry_range?.[0] || rec.price * 0.999;
          const entryMax = setup.entry_range?.[1] || rec.price * 1.001;
          const stopLoss = setup.stop_loss;
          const tp1 = setup.take_profit_1;
          const isLong = setup.position === 'LONG';

          let entered = false;
          let resolvedStatus: 'WIN' | 'LOSS' | 'PENDING' | 'INVALIDATED' = 'PENDING';
          let finalPrice = rec.price;

          // Check if we hit entry, stop loss, or take profit
          for (const candle of candles) {
            // First check if price triggered the Entry Range
            if (!entered) {
              if (
                (candle.low <= entryMax && candle.high >= entryMin) ||
                (candle.close >= entryMin && candle.close <= entryMax)
              ) {
                entered = true;
              }
            }

            if (entered) {
              if (isLong) {
                if (candle.low <= stopLoss) {
                  resolvedStatus = 'LOSS';
                  finalPrice = stopLoss;
                  break;
                }
                if (candle.high >= tp1) {
                  resolvedStatus = 'WIN';
                  finalPrice = tp1;
                  break;
                }
              } else {
                // Short position
                if (candle.high >= stopLoss) {
                  resolvedStatus = 'LOSS';
                  finalPrice = stopLoss;
                  break;
                }
                if (candle.low <= tp1) {
                  resolvedStatus = 'WIN';
                  finalPrice = tp1;
                  break;
                }
              }
            }
          }

          // Invalidation check: If signal is older than 3 days and hasn't triggered entry/SL/TP
          const ageInMs = Date.now() - since;
          const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
          if (resolvedStatus === 'PENDING' && ageInMs > threeDaysInMs) {
            resolvedStatus = 'INVALIDATED';
          }

          if (resolvedStatus !== 'PENDING') {
            const pnl = entered
              ? isLong
                ? ((finalPrice - rec.price) / rec.price) * 100
                : ((rec.price - finalPrice) / rec.price) * 100
              : 0;

            AppStorageEngine.updateAnalysisRecordStatus(
              rec.id,
              resolvedStatus,
              finalPrice,
              Number(pnl.toFixed(2))
            );
            console.log(
              `[AutoResolver] Resolved Signal ID ${rec.id} (${rec.symbol}) as ${resolvedStatus}. PnL: ${pnl.toFixed(2)}%`
            );
          }
        } catch (e) {
          console.error(`[AutoResolver] Error resolving signal ${rec.id}:`, e);
        }
      }
    };

    resolvePendingSignals();
  }, []);
}
