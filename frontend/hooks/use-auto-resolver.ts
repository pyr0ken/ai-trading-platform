import { useEffect } from 'react';
import { AppStorageEngine } from '@/lib/storage/app-db';
import { CandleData } from '@/types/market';
import { resolveTradeSetup } from '@/lib/analysis/setup-resolver';

/**
 * Circuit breaker: if OHLCV calls keep failing, back off to avoid overwhelming the server.
 */
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const MAX_FAILURES = 5;
const BACKOFF_MS = 30_000; // 30 seconds

/**
 * Fallback round-trip execution cost, as a percentage, for records saved before
 * per-signal cost capture existed.
 *
 * Mirrors lib/analysis/trading-costs.ts for a KuCoin taker fill (0.10% fee per
 * side + ~0.04% spread + 0.03% slippage per side). Signals written by the
 * current pipeline carry `round_trip_cost_pct` measured from the live orderbook
 * at signal time and that value is preferred — real spread varies with
 * liquidity, so charging a flat 0.30% to a fill that actually paid 0.35%
 * flatters the result.
 */
const FALLBACK_ROUND_TRIP_COST_PCT = 0.3;

/**
 * Cost actually charged to a given record.
 *
 * Clamped to a sane band so a corrupt or absurd stored value cannot silently
 * wipe out or invent PnL.
 */
function roundTripCostFor(rec: { round_trip_cost_pct?: number }): number {
  const stored = rec.round_trip_cost_pct;
  if (typeof stored === 'number' && Number.isFinite(stored) && stored >= 0 && stored <= 5) {
    return stored;
  }
  return FALLBACK_ROUND_TRIP_COST_PCT;
}

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

      /**
       * Read the setup through the shared resolver rather than the legacy
       * `trade_setup` field alone.
       *
       * The prompt instructs the model to place the executable setup at
       * `playbook.actionable.setup`. Reading only `trade_setup` here meant every
       * such signal resolved to INVALIDATED and dropped out of the win-rate
       * statistics entirely — a biased subsample that also fed back into the
       * prompt via recentHistoricalSignals.
       */
      const setup = resolveTradeSetup(rec.json_output);
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

      /**
       * Entry detection, corrected.
       *
       * The previous implementation defaulted `entered` to true whenever the
       * spot price at analysis time sat near the requested range, and then
       * measured PnL from that spot price. Two defects followed:
       *
       *   1. A limit setup whose entry never printed was still scored — usually
       *      as a LOSS once price ran the other way — inventing losses for
       *      trades that never existed.
       *   2. When the entry DID fill, profit was measured from the analysis-time
       *      price rather than the fill, which mis-stated PnL by the whole
       *      distance between them (measured at 1.52 percentage points on a
       *      realistic BTC example).
       *
       * Now: a fill requires price to actually trade into the range, and the
       * fill price itself is recorded and used as the PnL basis.
       */
      const spotInsideRange =
        !setup.entry_range ||
        (rec.price >= entryRangeMin && rec.price <= entryRangeMax);

      let entered = spotInsideRange;
      // A market entry fills at the analysis price; a limit entry fills at the
      // nearer edge of the range once touched.
      let entryFillPrice = spotInsideRange ? rec.price : 0;

      let resolvedStatus: 'WIN' | 'LOSS' | 'PENDING' | 'INVALIDATED' | 'NOT_FILLED' = 'PENDING';
      let finalPrice = rec.price;

      for (const candle of candles) {
        if (!entered) {
          // Price must genuinely trade through the requested band.
          if (candle.low <= entryRangeMax && candle.high >= entryRangeMin) {
            entered = true;
            // Fill at the edge price is touched first: for a long waiting below,
            // that is the upper edge on the way down.
            entryFillPrice = isLong
              ? Math.min(entryRangeMax, Math.max(entryRangeMin, candle.high >= entryRangeMax ? entryRangeMax : candle.high))
              : Math.max(entryRangeMin, Math.min(entryRangeMax, candle.low <= entryRangeMin ? entryRangeMin : candle.low));
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
          // The entry price was never reached. This is NOT a loss — no position
          // ever opened. Scoring it as one would fabricate a losing trade and
          // corrupt the win-rate feedback the model learns from.
          resolvedStatus = 'NOT_FILLED';
        } else if (entered && ageInHours > 48) {
          // Position opened but neither target nor stop was reached in 48h.
          // Mark to market from the ACTUAL fill.
          const lastCandle = candles[candles.length - 1];
          finalPrice = lastCandle ? lastCandle.close : entryFillPrice;

          const basis = entryFillPrice > 0 ? entryFillPrice : rec.price;
          const grossPnl = isLong
            ? ((finalPrice - basis) / basis) * 100
            : ((basis - finalPrice) / basis) * 100;
          const netPnl = grossPnl - roundTripCostFor(rec);

          // Judge on NET, since that is what the account actually shows.
          if (netPnl > 0.1) {
            resolvedStatus = 'WIN';
          } else if (netPnl < -0.1) {
            resolvedStatus = 'LOSS';
          } else {
            resolvedStatus = 'INVALIDATED';
          }
        }
      }

      if (resolvedStatus !== 'PENDING') {
        // NOT_FILLED carries no PnL: there was no trade.
        if (resolvedStatus === 'NOT_FILLED') {
          AppStorageEngine.updateAnalysisRecordStatus(rec.id, 'NOT_FILLED', rec.price, 0);
          resolvedCount++;
          console.log(`[AutoResolver] ${rec.symbol} (${rec.id}) -> NOT_FILLED (entry never reached)`);
          continue;
        }

        /**
         * PnL is measured from the real fill and charged the full round-trip
         * execution cost. Reporting gross PnL would flatter every result by
         * ~0.30% and make a break-even strategy look profitable.
         */
        const basis = entryFillPrice > 0 ? entryFillPrice : rec.price;
        const grossPnl = isLong
          ? ((finalPrice - basis) / basis) * 100
          : ((basis - finalPrice) / basis) * 100;
        const netPnl = grossPnl - roundTripCostFor(rec);

        AppStorageEngine.updateAnalysisRecordStatus(
          rec.id,
          resolvedStatus,
          finalPrice,
          Number(netPnl.toFixed(2)),
          {
            entryFillPrice: Number(basis.toFixed(8)),
            grossPnl: Number(grossPnl.toFixed(2)),
          }
        );
        resolvedCount++;
        console.log(
          `[AutoResolver] Resolved ${rec.symbol} (${rec.id}) -> ${resolvedStatus} ` +
          `(fill $${basis} | gross ${grossPnl.toFixed(2)}% | net ${netPnl.toFixed(2)}%)`
        );
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
