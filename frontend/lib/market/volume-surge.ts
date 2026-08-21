/**
 * Volume Surge Ratio — single shared definition.
 *
 * WHY THIS EXISTS
 * ---------------
 * Two places need "is volume expanding right now": the prompt line shown to the
 * model (institutional-prompt.ts) and technicalFacts.volumeSurgeRatio, which the
 * conviction scorer reads. They were computed independently, which is how a
 * scorer and a prompt end up disagreeing about the same bar.
 *
 * More importantly this replaces `breakoutVolumeRatio` as the scorer's source.
 * detectBreakout() returns early with { type: 'NONE' } whenever the ratio is
 * under 1.5, so outside an actual break of structure that field says nothing
 * about volume — the scorer was awarding a default neutral score on a number
 * that carried no information.
 */

import { CandleData } from '@/types/market';

/** Bars in the baseline average. 20 matches the Bollinger/volume convention. */
export const VOLUME_BASELINE_BARS = 20;

/**
 * Latest closed bar volume divided by the trailing average.
 *
 * @param candles CLOSED candles only. Passing a forming bar understates the
 *   ratio badly — a half-elapsed 1h bar measured 64% of average — which fakes a
 *   "volume drying up" reading and suppresses genuine breakout confirmation.
 * @returns Ratio rounded to 2dp. Returns 1.0 (neutral) when volume data is
 *   missing or unusable, so callers cannot mistake absent data for low volume.
 */
export function computeVolumeSurgeRatio(candles: CandleData[]): number {
  if (!Array.isArray(candles) || candles.length === 0) return 1.0;

  const slice = candles.slice(-VOLUME_BASELINE_BARS);
  if (slice.length === 0) return 1.0;

  let sum = 0;
  let counted = 0;
  for (const c of slice) {
    const v = Number(c?.volume);
    if (Number.isFinite(v) && v >= 0) {
      sum += v;
      counted++;
    }
  }

  if (counted === 0) return 1.0;
  const avg = sum / counted;
  if (avg <= 0) return 1.0;

  const latest = Number(candles[candles.length - 1]?.volume);
  if (!Number.isFinite(latest) || latest < 0) return 1.0;

  return Number((latest / avg).toFixed(2));
}
