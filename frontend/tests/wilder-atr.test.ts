import { describe, it, expect } from 'vitest';
import { ATR } from 'technicalindicators';
import { smoothWilders } from '@/lib/market/wilder-smoothing';
import { TechnicalIndicatorEngine } from '@/lib/market/indicators';
import { CandleData } from '@/types/market';

/** Deterministic synthetic tape so the test never depends on the network. */
function syntheticCandles(n = 200): CandleData[] {
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const out: CandleData[] = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    price = Math.max(1, price + (rnd() - 0.48) * 2);
    out.push({
      timestamp: 1700000000000 + i * 3_600_000,
      open: price,
      high: price + rnd() * 1.5,
      low: price - rnd() * 1.5,
      close: price,
      volume: 100 + rnd() * 50,
    } as CandleData);
  }
  return out;
}

describe('smoothWilders', () => {
  it('preserves input length — callers index it positionally against candles', () => {
    const data = Array.from({ length: 50 }, (_, i) => i + 1);
    expect(smoothWilders(data, 14)).toHaveLength(50);
  });

  it('uses alpha = 1/period, not the EMA 2/(period+1)', () => {
    // Flat at 10, then a single jump to 20. One step of Wilder's from a seed of
    // 10 with period 10 gives 10 + 0.1 * (20 - 10) = 11.
    const data = [...Array(10).fill(10), 20];
    const out = smoothWilders(data, 10);
    expect(out[10]).toBeCloseTo(11, 6);

    // An EMA would move further: alpha 2/11 = 0.1818 -> ~11.82.
    expect(out[10]).toBeLessThan(11.5);
  });

  it('seeds the recursion with the simple average of the first window', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = smoothWilders(data, 10);
    expect(out[9]).toBeCloseTo(5.5, 6);
  });

  it('emits no NaN on empty or degenerate input', () => {
    expect(smoothWilders([], 14)).toEqual([]);
    const out = smoothWilders([5], 14);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });

  it('survives non-finite values without poisoning the series', () => {
    const data = [...Array(20).fill(10)];
    data[5] = NaN;
    const out = smoothWilders(data, 14);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });
});

describe('calculateATR matches the reference implementation', () => {
  const candles = syntheticCandles(200);

  it('returns one value per candle', () => {
    expect(TechnicalIndicatorEngine.calculateATR(candles, 14)).toHaveLength(candles.length);
  });

  it('converges to technicalindicators ATR once warmed up', () => {
    const ours = TechnicalIndicatorEngine.calculateATR(candles, 14);
    const ref = ATR.calculate({
      high: candles.map((c) => c.high),
      low: candles.map((c) => c.low),
      close: candles.map((c) => c.close),
      period: 14,
    });

    const tail = ours.slice(ours.length - ref.length);

    // Final value must agree to near machine precision.
    expect(tail[tail.length - 1]).toBeCloseTo(ref[ref.length - 1], 6);

    // And the whole warmed-up series must track within a tight tolerance.
    const maxPct = ref.reduce((worst, r, i) => {
      const pct = r !== 0 ? (Math.abs(tail[i] - r) / r) * 100 : 0;
      return Math.max(worst, pct);
    }, 0);
    expect(maxPct).toBeLessThan(2);
  });

  it('is less reactive than the old EMA-smoothed version on a volatility spike', () => {
    const spiked = syntheticCandles(100);
    const last = spiked[spiked.length - 1];
    spiked[spiked.length - 1] = { ...last, high: last.high + 30, low: last.low - 30 };

    const wilder = TechnicalIndicatorEngine.calculateATR(spiked, 14);
    const ema = TechnicalIndicatorEngine.calculateEMA(
      spiked.map((c, i) =>
        i === 0
          ? c.high - c.low
          : Math.max(
              c.high - c.low,
              Math.abs(c.high - spiked[i - 1].close),
              Math.abs(c.low - spiked[i - 1].close)
            )
      ),
      14
    );

    // Wilder's absorbs the spike more slowly — that is the whole point.
    expect(wilder[wilder.length - 1]).toBeLessThan(ema[ema.length - 1]);
  });
});
