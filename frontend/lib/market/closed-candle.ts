/**
 * Closed-Candle Enforcement
 *
 * THE BUG THIS FIXES
 * ------------------
 * Every exchange OHLCV endpoint returns the CURRENTLY FORMING bar as the last
 * element. That bar's high, low, close and volume are all still mutating. A
 * measured example from this platform on BTC/USDT 1h:
 *
 *   last bar age 29.5min of a 60min bar, volume 64% of average
 *   RSI14     with it = 59.43   without it = 56.09   (3.34 points of drift)
 *   MACD hist with it = 15.72   without it = 10.93   (44% distortion)
 *
 * Any indicator computed over that bar is unstable: it "repaints". The model
 * analyses a snapshot that no longer exists by the time the bar closes, so the
 * premise of the trade evaporates minutes after entry. This is the single
 * largest structural source of losing signals in a system like this.
 *
 * THE FIX
 * -------
 * Drop the forming bar from the series used for indicators and structure, and
 * hand the live bar to the caller separately so it can still be shown as
 * "current price action in progress" without contaminating the maths.
 */

import { CandleData } from '@/types/market';

/** Timeframe string -> duration in milliseconds. */
const TF_MS: Record<string, number> = {
  '1m': 60_000,
  '3m': 180_000,
  '5m': 300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '2h': 7_200_000,
  '4h': 14_400_000,
  '6h': 21_600_000,
  '8h': 28_800_000,
  '12h': 43_200_000,
  '1d': 86_400_000,
  '3d': 259_200_000,
  '1w': 604_800_000,
};

/**
 * Resolve a timeframe label to milliseconds.
 * Returns null for unknown labels so callers can fail safe rather than guess.
 */
export function timeframeToMs(timeframe: string): number | null {
  const key = timeframe.toLowerCase().trim();
  if (TF_MS[key] !== undefined) return TF_MS[key];

  // Tolerate uppercase variants like '1H', '1W', '1D'
  const normalised = key.replace(/([0-9]+)([a-z]+)/i, (_m, n, u) => `${n}${u.toLowerCase()}`);
  return TF_MS[normalised] ?? null;
}

export interface ClosedCandleResult {
  /** Candles guaranteed to be fully closed. Safe for indicators. */
  closed: CandleData[];
  /**
   * The still-forming bar, if the feed included one. Never fed to indicators;
   * exposed so the UI/prompt can describe live price action honestly.
   */
  forming: CandleData | null;
  /** True when a forming bar was found and removed. */
  droppedForming: boolean;
}

/**
 * Split a candle series into "fully closed" and "still forming".
 *
 * A bar that opened at timestamp T on an N-ms timeframe is only closed once
 * `now >= T + N`. We additionally require a small settle margin so that a bar
 * which closed milliseconds ago — and may not yet be finalised on the venue's
 * side — is not treated as authoritative.
 *
 * @param candles   Ascending-by-time OHLCV series straight from the venue.
 * @param timeframe Timeframe label the series was requested at.
 * @param now       Injectable clock, for deterministic tests.
 */
export function splitClosedCandles(
  candles: CandleData[],
  timeframe: string,
  now: number = Date.now()
): ClosedCandleResult {
  if (!Array.isArray(candles) || candles.length === 0) {
    return { closed: [], forming: null, droppedForming: false };
  }

  const tfMs = timeframeToMs(timeframe);

  // Unknown timeframe: we cannot prove the last bar is closed, so we refuse to
  // guess. Dropping one bar is far cheaper than silently repainting.
  if (tfMs === null) {
    const closed = candles.slice(0, -1);
    return {
      closed,
      forming: candles[candles.length - 1] ?? null,
      droppedForming: candles.length > 0,
    };
  }

  // 2-second settle margin: venues occasionally stamp a bar closed while the
  // final trades are still being aggregated.
  const SETTLE_MS = 2_000;

  const last = candles[candles.length - 1];
  const lastCloseTime = last.timestamp + tfMs;
  const isForming = now < lastCloseTime + SETTLE_MS;

  if (!isForming) {
    return { closed: candles, forming: null, droppedForming: false };
  }

  return {
    closed: candles.slice(0, -1),
    forming: last,
    droppedForming: true,
  };
}

/**
 * Convenience wrapper for call sites that only need the safe series.
 */
export function dropUnclosedCandle(
  candles: CandleData[],
  timeframe: string,
  now: number = Date.now()
): CandleData[] {
  return splitClosedCandles(candles, timeframe, now).closed;
}

/**
 * Human-readable description of the forming bar for prompt injection.
 *
 * The model still benefits from knowing what price is doing right now — it just
 * must not treat it as settled history. Labelling it explicitly is safer than
 * hiding it, because otherwise the model sees a "stale" last close and may
 * assume the feed is lagging.
 */
export function describeFormingCandle(
  forming: CandleData | null,
  timeframe: string,
  now: number = Date.now()
): string {
  if (!forming) {
    return `LIVE BAR: none in feed — all ${timeframe} candles below are fully closed.`;
  }

  const tfMs = timeframeToMs(timeframe);
  const elapsedMs = now - forming.timestamp;
  const pct = tfMs ? Math.min(100, Math.max(0, (elapsedMs / tfMs) * 100)) : 0;
  const remainingMin = tfMs ? Math.max(0, (tfMs - elapsedMs) / 60_000) : 0;

  const dir = forming.close >= forming.open ? 'up' : 'down';
  const movePct = forming.open > 0
    ? ((forming.close - forming.open) / forming.open) * 100
    : 0;

  return [
    `LIVE BAR (${timeframe}, ${pct.toFixed(0)}% elapsed, ~${remainingMin.toFixed(0)}min until close):`,
    `  O=${forming.open} H=${forming.high} L=${forming.low} C=${forming.close} V=${forming.volume} (${dir} ${movePct >= 0 ? '+' : ''}${movePct.toFixed(2)}% so far)`,
    `  WARNING: this bar is UNFINISHED. Its high, low, close and volume WILL change.`,
    `  It is EXCLUDED from every indicator, SMA, RSI, MACD, support/resistance and`,
    `  zone calculation in this payload — all of those use CLOSED bars only.`,
    `  Treat it as "where price is right now", never as a confirmed candle pattern.`,
  ].join('\n');
}
