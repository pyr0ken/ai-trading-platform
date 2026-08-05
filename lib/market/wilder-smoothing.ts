/**
 * Wilder's Smoothing (RMA) — the correct smoothing for ATR and Wilder-family
 * indicators.
 *
 * WHY THIS EXISTS
 * ---------------
 * Standard EMA uses alpha = 2/(period+1). Wilder's uses alpha = 1/period.
 * For period 14 that is 0.1333 versus 0.0714 — EMA reacts almost twice as fast.
 *
 * calculateATR() was smoothing True Range with calculateEMA(), which makes ATR
 * spike harder and decay faster than the Wilder definition every charting
 * package implements. ATR is load-bearing across this platform:
 *
 *   - decision-zones.ts sizes every zone's half-width from ATR
 *   - extractTechnicalFacts derives atrSuggestedStopLoss/TakeProfit from it
 *   - the no-trade gate reasons about distance measured in ATR units
 *
 * so the error propagated into zone widths, stop placement and gate decisions,
 * and none of those numbers reconciled with TradingView.
 *
 * LENGTH CONTRACT
 * ---------------
 * Returns an array the SAME length as the input. Callers index it positionally
 * against candles (see calculateIndicators: `atr14[idx]`), so a shorter array
 * would silently misalign every value with the wrong bar.
 *
 * Warm-up bars before the first full window are filled with the running mean of
 * what is available, matching how the rest of this engine avoids emitting NaN
 * into UI and downstream maths.
 */

/**
 * Smooth a series using Wilder's Method (RMA / Running Moving Average).
 *
 * @param data   Input series (e.g. True Range values).
 * @param period Lookback. Wilder's alpha is 1/period.
 * @returns Array of the same length as `data`.
 */
export function smoothWilders(data: number[], period: number): number[] {
  const out: number[] = new Array(data.length);
  if (data.length === 0) return out;

  const p = Math.max(1, Math.floor(period));

  // Warm-up: running mean, so early bars carry a sensible magnitude instead of
  // NaN or a hard zero that would collapse ATR-scaled zone widths.
  let runningSum = 0;
  const seedCount = Math.min(p, data.length);
  for (let i = 0; i < seedCount; i++) {
    const v = Number.isFinite(data[i]) ? data[i] : 0;
    runningSum += v;
    out[i] = runningSum / (i + 1);
  }

  if (data.length <= p) return out;

  // Seed the recursion with the simple average of the first full window, which
  // is exactly how Wilder defines the first ATR value.
  let smoothed = runningSum / p;
  out[p - 1] = smoothed;

  const alpha = 1 / p;
  for (let i = p; i < data.length; i++) {
    const v = Number.isFinite(data[i]) ? data[i] : smoothed;
    smoothed = smoothed + alpha * (v - smoothed);
    out[i] = smoothed;
  }

  return out;
}
