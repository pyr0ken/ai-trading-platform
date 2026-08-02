import { useEffect, useRef } from 'react';
import { AppStorageEngine } from '@/lib/storage/app-db';
import { CandleData } from '@/types/market';

/**
 * Circuit breaker: if OHLCV calls keep failing, back off to avoid overwhelming the server.
 */
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const MAX_FAILURES = 3;
const BACKOFF_MS = 60_000; // 1 minute

function isCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

function recordFailure(): void {
  consecutiveFailures++;
  if (consecutiveFailures >= MAX_FAILURES) {
    circuitOpenUntil = Date.now() + BACKOFF_MS;
    console.warn(`[AutoResolver] Circuit breaker opened for ${BACKOFF_MS / 1000}s`);
  }
}

function recordSuccess(): void {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

export function useAutoResolver() {
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;

    const resolvePendingSignals = async () => {
      // Circuit breaker check
      if (isCircuitOpen()) {
        const remaining = Math.ceil((circuitOpenUntil - Date.now()) / 1000);
        console.warn(`[AutoResolver] Circuit open, waiting ${remaining}s`);
        return;
      }

      const analyses = AppStorageEngine.getAnalyses();
      const pending = analyses.filter(
        (rec) =>
          !rec.accuracy_evaluation ||
          rec.accuracy_evaluation.status === 'PENDING'
      );

      if (pending.length === 0) return;

      console.log(`[AutoResolver] Resolving ${pending.length} pending signals`);

      for (let i = 0; i < pending.length; i++) {
        const rec = pending[i];
        
        // Check circuit before each request
        if (isCircuitOpen()) {
          console.warn('[AutoResolver] Circuit opened mid-loop, stopping');
          break;
        }

        try {
          // Small delay between signals
          if (i > 0) await new Promise((r) => setTimeout(r, 1000)); // 1s delay (was 300ms)

          const since = new Date(rec.created_at).getTime();
          
          // Use AbortController to cancel timed-out requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8_000); // 8s timeout

          const response = await fetch(
            `/api/market/history-ohlcv?symbol=${encodeURIComponent(rec.symbol)}&exchange=${rec.exchange}&timeframe=15m&since=${since}&limit=100`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status >= 500) {
              recordFailure();
              console.warn(`[AutoResolver] Server error ${response.status}, stopping`);
              break;
            }
            continue;
          }

          recordSuccess();
          const data = await response.json();
          const candles: CandleData[] = data.candles || [];
          if (candles.length === 0) continue;

          const setup = rec.json_output?.trade_setup;
          if (!setup) {
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

          for (const candle of candles) {
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

          // Invalidate signals older than 3 days
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
            console.log(`[AutoResolver] ${rec.symbol}: ${resolvedStatus} (PnL: ${pnl.toFixed(2)}%)`);
          }
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') {
            console.warn(`[AutoResolver] Request for ${rec.symbol} timed out (8s limit)`);
          } else {
            console.error(`[AutoResolver] Error:`, e);
          }
          recordFailure();
          
          // Stop on circuit open
          if (isCircuitOpen()) {
            console.warn('[AutoResolver] Circuit opened due to error');
            break;
          }
        }
      }
    };

    // Start initial check after 2 seconds, then re-check every 30 seconds
    const timer = setTimeout(() => resolvePendingSignals(), 2_000);
    const interval = setInterval(() => resolvePendingSignals(), 30_000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);
}
