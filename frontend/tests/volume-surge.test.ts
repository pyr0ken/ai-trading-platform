import { describe, it, expect } from 'vitest';
import { computeVolumeSurgeRatio } from '@/lib/market/volume-surge';
import { TechnicalIndicatorEngine } from '@/lib/market/indicators';
import { CandleData } from '@/types/market';

/** Build candles with a controlled volume profile. */
function candlesWithVolumes(volumes: number[]): CandleData[] {
  return volumes.map((v, i) => ({
    timestamp: 1700000000000 + i * 3_600_000,
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: v,
  })) as CandleData[];
}

describe('computeVolumeSurgeRatio', () => {
  it('reports 1.0 when the latest bar matches the average', () => {
    expect(computeVolumeSurgeRatio(candlesWithVolumes(Array(20).fill(100)))).toBe(1);
  });

  it('detects a genuine surge', () => {
    const vols = Array(19).fill(100).concat([300]);
    // avg over the 20-bar window = (19*100 + 300)/20 = 110
    expect(computeVolumeSurgeRatio(candlesWithVolumes(vols))).toBeCloseTo(300 / 110, 2);
  });

  it('detects volume drying up', () => {
    const vols = Array(19).fill(100).concat([20]);
    const ratio = computeVolumeSurgeRatio(candlesWithVolumes(vols));
    expect(ratio).toBeLessThan(0.8);
  });

  it('uses only the trailing 20 bars as baseline', () => {
    // Ancient huge volume must not drag the baseline.
    const vols = Array(50).fill(10_000).concat(Array(19).fill(100)).concat([200]);
    const ratio = computeVolumeSurgeRatio(candlesWithVolumes(vols));
    expect(ratio).toBeGreaterThan(1.5);
  });

  it('returns neutral 1.0 rather than 0 when data is missing', () => {
    expect(computeVolumeSurgeRatio([])).toBe(1.0);
    expect(computeVolumeSurgeRatio(candlesWithVolumes([0, 0, 0]))).toBe(1.0);
  });

  it('ignores non-finite volumes instead of producing NaN', () => {
    const bad = candlesWithVolumes(Array(20).fill(100));
    (bad[3] as { volume: number }).volume = NaN;
    const ratio = computeVolumeSurgeRatio(bad);
    expect(Number.isFinite(ratio)).toBe(true);
  });
});

describe('THE BUG: breakoutVolumeRatio vs volumeSurgeRatio', () => {
  /**
   * Build a quiet, non-breakout tape whose latest bar has clearly collapsed
   * volume. detectBreakout() will not fire, so breakoutVolumeRatio carries no
   * usable information — but volume IS meaningfully drying up and the scorer
   * must be able to see that.
   */
  function quietTapeWithVolumeCollapse(): CandleData[] {
    const out: CandleData[] = [];
    for (let i = 0; i < 60; i++) {
      const base = 100 + Math.sin(i / 6) * 0.4; // tight range, no structure break
      out.push({
        timestamp: 1700000000000 + i * 3_600_000,
        open: base,
        high: base + 0.3,
        low: base - 0.3,
        close: base,
        volume: i === 59 ? 15 : 100, // last bar collapses
      } as CandleData);
    }
    return out;
  }

  it('surfaces the volume collapse the breakout field cannot', () => {
    const candles = quietTapeWithVolumeCollapse();
    const facts = TechnicalIndicatorEngine.extractTechnicalFacts(candles);

    // No break of structure on this tape.
    expect(facts.breakoutType).toBe('NONE');

    // The new field sees the collapse...
    expect(facts.volumeSurgeRatio).toBeDefined();
    expect(facts.volumeSurgeRatio!).toBeLessThan(0.8);
  });

  /**
   * The decisive case: a REAL volume surge on a tape with no structure break.
   *
   * detectBreakout() only reports a ratio it considers actionable when price
   * also clears an S/R level; on a rangebound tape it returns the NONE branch.
   * The scorer must still be able to see that participation is expanding.
   */
  it('sees a surge on a rangebound tape where no BOS fires', () => {
    const out: CandleData[] = [];
    for (let i = 0; i < 60; i++) {
      const base = 100 + Math.sin(i / 6) * 0.4;
      out.push({
        timestamp: 1700000000000 + i * 3_600_000,
        open: base,
        high: base + 0.3,
        low: base - 0.3,
        close: base,
        volume: i === 59 ? 400 : 100, // strong surge, still no break
      } as CandleData);
    }

    const facts = TechnicalIndicatorEngine.extractTechnicalFacts(out);

    // No break of structure: the breakout path declines to confirm anything.
    expect(facts.breakoutType).toBe('NONE');

    // But volume is unambiguously surging, and the scorer can now read it.
    expect(facts.volumeSurgeRatio!).toBeGreaterThan(1.5);
  });

  it('volumeSurgeRatio is populated on every bar, not just breakouts', () => {
    const flat = candlesWithVolumes(Array(60).fill(100));
    const facts = TechnicalIndicatorEngine.extractTechnicalFacts(flat);
    expect(facts.breakoutType).toBe('NONE');
    expect(typeof facts.volumeSurgeRatio).toBe('number');
    expect(Number.isFinite(facts.volumeSurgeRatio!)).toBe(true);
  });
});
