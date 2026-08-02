import { useEffect } from 'react';
import { AppStorageEngine, StoredAnalysisRecord } from '@/lib/storage/app-db';
import { CandleData } from '@/types/market';

/**
 * Circuit breaker: if OHLCV calls keep failing, back off to avoid overwhelming the server.
 */
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const MAX_FAILURES = 5;
const BACKOFF_MS = 30_000; // 30 seconds

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

/**
 * Core function to evaluate all pending historical signals against market candle data.
 */
export async function resolvePendingSignals(): Promise<number> {
  if (isCircuitOpen()) {
    console.warn('[AutoResolver] Circuit open, skipping resolution cycle');
    return 0;
  }

  const analyses = AppStorageEngine.getAnalyses();
  const pending = analyses.filter(
    (rec) =>
      !rec.accuracy_evaluation ||
      rec.accuracy_evaluation.status === 'PENDING'
  );

  if (pending.length === 0) return 0;

  console.log(`[AutoResolver] Resolving ${pending.length} pending signals...`);
  let resolvedCount = 0;

  for (let i = 0; i < pending.length; i++) {
    const rec = pending[i];

    if (isCircuitOpen()) {
      console.warn('[AutoResolver] Circuit opened mid-loop, stopping');
      break;
    }

    try {
      if (i > 0) await new Promise((r) => setTimeout(r, 400));

      const since = new Date(rec.created_at).getTime();
      const ageInMs = Date.now() - since;
      const ageInHours = ageInMs / (1000 * 60 * 60);

      // Choose optimal timeframe & candle limit depending on signal age
      // Use 1h for signals > 24 hours old so we cover up to 20 days (500 candles)
      const timeframe = ageInHours > 24 ? '1h' : '15m';
      const limit = 500;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(
        `/api/market/history-ohlcv?symbol=${encodeURIComponent(rec.symbol)}&exchange=${rec.exchange}&timeframe=${timeframe}&since=${since}&limit=${limit}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 500) {
          recordFailure();
          console.warn(`[AutoResolver] Server error ${response.status} for ${rec.symbol}, stopping batch`);
          break;
        }
        continue;
      }

      recordSuccess();
      const data = await response.json();
      const candles: CandleData[] = data.candles || [];

      if (candles.length === 0) {
        // If signal is older than 48 hours and no candles returned, mark as invalidated
        if (ageInHours > 48) {
          AppStorageEngine.updateAnalysisRecordStatus(rec.id, 'INVALIDATED', rec.price, 0);
          resolvedCount++;
        }
        continue;
      }

      const setup = rec.json_output?.trade_setup;
      if (!setup) {
        AppStorageEngine.updateAnalysisRecordStatus(rec.id, 'INVALIDATED', rec.price, 0);
        resolvedCount++;
        continue;
      }

      const entryRangeMin = Math.min(setup.entry_range?.[0] || rec.price, setup.entry_range?.[1] || rec.price);
      const entryRangeMax = Math.max(setup.entry_range?.[0] || rec.price, setup.entry_range?.[1] || rec.price);
      const stopLoss = setup.stop_loss;
      const tp1 = setup.take_profit_1;
      const isLong = setup.position === 'LONG';

      // Default entered to true if signal price was already inside/near entry range or if market setup
      let entered =
        !setup.entry_range ||
        (rec.price >= entryRangeMin * 0.998 && rec.price <= entryRangeMax * 1.002);

      let resolvedStatus: 'WIN' | 'LOSS' | 'PENDING' | 'INVALIDATED' = 'PENDING';
      let finalPrice = rec.price;

      for (const candle of candles) {
        if (!entered) {
          // Check if candle high/low crossed entry range
          if (candle.low <= entryRangeMax && candle.high >= entryRangeMin) {
            entered = true;
          }
        }

        if (entered) {
          if (isLong) {
            // Check Stop Loss first for conservative risk assessment
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

      // If still pending after checking candles:
      if (resolvedStatus === 'PENDING') {
        if (!entered && ageInHours > 24) {
          // Entry price was never reached within 24 hours
          resolvedStatus = 'INVALIDATED';
        } else if (ageInHours > 48) {
          // Signal active for 48+ hours without hitting TP or SL -> evaluate latest candle price
          const lastCandle = candles[candles.length - 1];
          finalPrice = lastCandle ? lastCandle.close : rec.price;

          const pnl = isLong
            ? ((finalPrice - rec.price) / rec.price) * 100
            : ((rec.price - finalPrice) / rec.price) * 100;

          if (pnl > 0.5) {
            resolvedStatus = 'WIN';
          } else if (pnl < -0.5) {
            resolvedStatus = 'LOSS';
          } else {
            resolvedStatus = 'INVALIDATED';
          }
        }
      }

      if (resolvedStatus !== 'PENDING') {
        const pnl = isLong
          ? ((finalPrice - rec.price) / rec.price) * 100
          : ((rec.price - finalPrice) / rec.price) * 100;

        AppStorageEngine.updateAnalysisRecordStatus(
          rec.id,
          resolvedStatus,
          finalPrice,
          Number(pnl.toFixed(2))
        );
        resolvedCount++;
        console.log(`[AutoResolver] Resolved ${rec.symbol} (${rec.id}) -> ${resolvedStatus} (PnL: ${pnl.toFixed(2)}%)`);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        console.warn(`[AutoResolver] Request for ${rec.symbol} timed out`);
      } else {
        console.error(`[AutoResolver] Error evaluating ${rec.symbol}:`, e);
      }
      recordFailure();
    }
  }

  return resolvedCount;
}

export function useAutoResolver() {
  useEffect(() => {
    // Initial resolution check on mount
    const timer = setTimeout(() => {
      resolvePendingSignals().catch((err) =>
        console.warn('[AutoResolver] Execution error:', err)
      );
    }, 1500);

    // Periodic re-check every 20 seconds for active pending signals
    const interval = setInterval(() => {
      resolvePendingSignals().catch((err) =>
        console.warn('[AutoResolver] Execution error:', err)
      );
    }, 20_000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);
}
