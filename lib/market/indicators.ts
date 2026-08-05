import { CalculatedIndicators, CandleData, SupportResistanceLevels, MarketTechnicalFacts } from '@/types/market';
import { computeVolumeSurgeRatio } from './volume-surge';
import { smoothWilders } from './wilder-smoothing';

/**
 * Technical Indicator Calculation Engine (Pure TypeScript)
 */
export class TechnicalIndicatorEngine {
  /**
   * Calculate Simple Moving Average (SMA) — sliding window, no per-iteration slice
   */
  public static calculateSMA(data: number[], period: number): number[] {
    const sma: number[] = new Array(data.length);
    let windowSum = 0;

    for (let i = 0; i < data.length; i++) {
      windowSum += data[i];
      if (i >= period) windowSum -= data[i - period];

      if (i < period - 1) {
        // Return raw price before window fills, matching test specification
        sma[i] = data[i];
      } else {
        sma[i] = Number((windowSum / period).toFixed(2));
      }
    }
    return sma;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  public static calculateEMA(data: number[], period: number): number[] {
    const ema: number[] = new Array(data.length);
    if (data.length === 0) return ema;

    const multiplier = 2 / (period + 1);

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        // Return raw price before the window fills
        ema[i] = data[i];
      } else if (i === period - 1) {
        // Seed value is the SMA of the first `period` elements
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[j];
        ema[i] = Number((sum / period).toFixed(2));
      } else {
        const prevEma = ema[i - 1];
        const currentEma = (data[i] - prevEma) * multiplier + prevEma;
        ema[i] = Number(currentEma.toFixed(2));
      }
    }
    return ema;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  public static calculateRSI(closes: number[], period = 14): number[] {
    const rsi: number[] = [];
    // Guard: not enough data to compute a meaningful RSI
    if (closes.length < period + 1) {
      return closes.map(() => 50);
    }

    let gains = 0;
    let losses = 0;

    // Seed average gain/loss over the first `period` price changes
    // Note: closes[i] - closes[i-1] for i in [1..period] uses indices 1..period
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = 0; i < closes.length; i++) {
      if (i < period) {
        rsi.push(50);
      } else if (i === period) {
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(Number((100 - 100 / (1 + rs)).toFixed(2)));
      } else {
        const diff = closes[i] - closes[i - 1];
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(Number((100 - 100 / (1 + rs)).toFixed(2)));
      }
    }
    return rsi;
  }

  /**
   * Calculate MACD (Line, Signal, Histogram)
   */
  public static calculateMACD(
    closes: number[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9
  ): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
    const emaFast = this.calculateEMA(closes, fastPeriod);
    const emaSlow = this.calculateEMA(closes, slowPeriod);

    const macdLineRaw = emaFast.map((fast, i) => fast - emaSlow[i]);
    const signalLineRaw = this.calculateEMA(macdLineRaw, signalPeriod);

    const macdLine = macdLineRaw.map((v) => Number(v.toFixed(2)));
    const signalLine = signalLineRaw.map((v) => Number(v.toFixed(2)));
    const histogram = macdLine.map((m, i) => Number((m - signalLine[i]).toFixed(2)));

    return { macdLine, signalLine, histogram };
  }

  /**
   * Calculate Bollinger Bands (Upper, Middle, Lower, Bandwidth) — sliding window variance
   */
  public static calculateBollingerBands(
    closes: number[],
    period = 20,
    multiplier = 2
  ): { upper: number[]; middle: number[]; lower: number[]; bandwidth: number[] } {
    const middle = this.calculateSMA(closes, period);
    const upper: number[] = new Array(closes.length);
    const lower: number[] = new Array(closes.length);
    const bandwidth: number[] = new Array(closes.length);

    let sumSq = 0;
    let sum = 0;

    for (let i = 0; i < closes.length; i++) {
      const val = closes[i];
      sum += val;
      sumSq += val * val;

      if (i >= period) {
        const oldVal = closes[i - period];
        sum -= oldVal;
        sumSq -= oldVal * oldVal;
      }

      if (i < period - 1) {
        upper[i] = middle[i];
        lower[i] = middle[i];
        bandwidth[i] = 0;
      } else {
        const mean = sum / period;
        const variance = Math.max(sumSq / period - mean * mean, 0);
        const stdDev = Math.sqrt(variance);

        const u = Number((mean + stdDev * multiplier).toFixed(2));
        const l = Number((mean - stdDev * multiplier).toFixed(2));
        const bw = Number((((u - l) / mean) * 100).toFixed(2));

        upper[i] = u;
        lower[i] = l;
        bandwidth[i] = bw;
      }
    }
    return { upper, middle, lower, bandwidth };
  }

  /**
   * Calculate Average True Range (ATR)
   *
   * Smoothed with Wilder's Method (alpha = 1/period), NOT EMA (alpha =
   * 2/(period+1)). This previously used calculateEMA, which reacts almost twice
   * as fast and made every ATR-derived number — decision zone widths, suggested
   * stops and targets, and the gate's ATR-distance reasoning — disagree with
   * every standard charting package.
   */
  public static calculateATR(candles: CandleData[], period = 14): number[] {
    const tr: number[] = [];

    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        tr.push(candles[0].high - candles[0].low);
      } else {
        const hl = candles[i].high - candles[i].low;
        const hcp = Math.abs(candles[i].high - candles[i - 1].close);
        const lcp = Math.abs(candles[i].low - candles[i - 1].close);
        tr.push(Math.max(hl, hcp, lcp));
      }
    }

    return smoothWilders(tr, period);
  }

  /**
   * Calculate Average Directional Index (ADX 14)
   */
  public static calculateADX(candles: CandleData[], period = 14): number[] {
    const adx: number[] = [];
    if (candles.length < period * 2) {
      // Not enough candles to reliably calculate Wilder's smoothed ADX — return 0s
      return Array(candles.length).fill(0);
    }

    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    // 1. Calculate TR, +DM, -DM
    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        tr.push(candles[0].high - candles[0].low);
        plusDM.push(0);
        minusDM.push(0);
      } else {
        const hDiff = candles[i].high - candles[i - 1].high;
        const lDiff = candles[i - 1].low - candles[i].low;

        const currentTR = Math.max(
          candles[i].high - candles[i].low,
          Math.abs(candles[i].high - candles[i - 1].close),
          Math.abs(candles[i].low - candles[i - 1].close)
        );
        tr.push(currentTR);

        let pDM = 0;
        let mDM = 0;

        if (hDiff > lDiff && hDiff > 0) {
          pDM = hDiff;
        }
        if (lDiff > hDiff && lDiff > 0) {
          mDM = lDiff;
        }

        plusDM.push(pDM);
        minusDM.push(mDM);
      }
    }

    // 2. Wilder's Smoothing
    const smoothedTR: number[] = [];
    const smoothedPlusDM: number[] = [];
    const smoothedMinusDM: number[] = [];

    let sumTR = 0;
    let sumPlusDM = 0;
    let sumMinusDM = 0;

    for (let i = 0; i < candles.length; i++) {
      if (i < period) {
        sumTR += tr[i];
        sumPlusDM += plusDM[i];
        sumMinusDM += minusDM[i];
        smoothedTR.push(sumTR);
        smoothedPlusDM.push(sumPlusDM);
        smoothedMinusDM.push(sumMinusDM);
      } else if (i === period) {
        smoothedTR.push(sumTR);
        smoothedPlusDM.push(sumPlusDM);
        smoothedMinusDM.push(sumMinusDM);
      } else {
        const prevTR = smoothedTR[i - 1];
        const prevPlus = smoothedPlusDM[i - 1];
        const prevMinus = smoothedMinusDM[i - 1];

        smoothedTR.push(prevTR - prevTR / period + tr[i]);
        smoothedPlusDM.push(prevPlus - prevPlus / period + plusDM[i]);
        smoothedMinusDM.push(prevMinus - prevMinus / period + minusDM[i]);
      }
    }

    // 3. Calculate +DI, -DI, DX
    const dx: number[] = [];
    for (let i = 0; i < candles.length; i++) {
      const trVal = smoothedTR[i];
      if (trVal === 0) {
        dx.push(0);
        continue;
      }
      const plusDI = (smoothedPlusDM[i] / trVal) * 100;
      const minusDI = (smoothedMinusDM[i] / trVal) * 100;
      const diDiff = Math.abs(plusDI - minusDI);
      const diSum = plusDI + minusDI;
      const dxVal = diSum === 0 ? 0 : (diDiff / diSum) * 100;
      dx.push(dxVal);
    }

    // 4. Smooth DX to get ADX
    let sumDX = 0;
    for (let i = 0; i < candles.length; i++) {
      if (i < period * 2 - 1) {
        if (i >= period && i < period * 2 - 1) {
          sumDX += dx[i];
        }
        adx.push(20);
      } else if (i === period * 2 - 1) {
        sumDX += dx[i];
        adx.push(Number((sumDX / period).toFixed(2)));
      } else {
        const prevADX = adx[i - 1];
        const currentADX = (prevADX * (period - 1) + dx[i]) / period;
        adx.push(Number(currentADX.toFixed(2)));
      }
    }

    return adx;
  }

  /**
   * Calculate Volume Weighted Average Price (VWAP)
   */
  public static calculateVWAP(candles: CandleData[]): number[] {
    const vwap: number[] = [];
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    for (const c of candles) {
      const typicalPrice = (c.high + c.low + c.close) / 3;
      cumulativeTPV += typicalPrice * c.volume;
      cumulativeVolume += c.volume;

      const currentVwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : c.close;
      vwap.push(Number(currentVwap.toFixed(2)));
    }
    return vwap;
  }

  /**
   * Auto-extract Support and Resistance Levels from swing highs and lows using dynamic clustering
   */
  public static extractSupportResistance(
    candles: CandleData[],
    window = 5
  ): SupportResistanceLevels {
    if (candles.length < window * 2 + 1) {
      return { resistanceLevels: [], supportLevels: [] };
    }

    const currentPrice = candles[candles.length - 1].close;
    const rawResistances: number[] = [];
    const rawSupports: number[] = [];

    // 1. Identify raw swing highs and lows
    for (let i = window; i < candles.length - window; i++) {
      const currentHigh = candles[i].high;
      const currentLow = candles[i].low;

      let isHigh = true;
      let isLow = true;

      for (let j = 1; j <= window; j++) {
        if (candles[i - j].high > currentHigh || candles[i + j].high > currentHigh) {
          isHigh = false;
        }
        if (candles[i - j].low < currentLow || candles[i + j].low < currentLow) {
          isLow = false;
        }
      }

      if (isHigh) rawResistances.push(currentHigh);
      if (isLow) rawSupports.push(currentLow);
    }

    // Only keep support levels AT OR BELOW current price and resistance levels AT OR ABOVE current price.
    // Levels on the wrong side are invalidated (price has already broken them) and must not be used as S/R.
    const validSupports = rawSupports.filter((level) => level <= currentPrice);
    const validResistances = rawResistances.filter((level) => level >= currentPrice);

    // 2. Clustering Helper Function (grouping levels within a tighter threshold for precision)
    const averagePrice = currentPrice;
    const threshold = averagePrice * 0.008;

    const clusterLevels = (levels: number[], isSupport: boolean): number[] => {
      if (levels.length === 0) return [];
      
      const sorted = [...levels].sort((a, b) => isSupport ? b - a : a - b);
      const clusters: { sum: number; count: number; values: number[] }[] = [];

      for (const val of sorted) {
        let placed = false;
        for (const cluster of clusters) {
          const clusterAvg = cluster.sum / cluster.count;
          if (Math.abs(val - clusterAvg) <= threshold) {
            cluster.values.push(val);
            cluster.sum += val;
            cluster.count += 1;
            placed = true;
            break;
          }
        }
        if (!placed) {
          clusters.push({ sum: val, count: 1, values: [val] });
        }
      }

      // Prioritize clusters by touch count (strength)
      const topClusters = clusters
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return topClusters
        .map((c) => Number((c.sum / c.count).toFixed(2)))
        .sort((a, b) => a - b);
    };

    const clusteredResistances = clusterLevels(validResistances, false);
    const clusteredSupports = clusterLevels(validSupports, true);

    return {
      resistanceLevels: clusteredResistances,
      supportLevels: clusteredSupports,
    };
  }

  /**
   * Support/Resistance extraction that PRESERVES cluster metadata.
   *
   * `extractSupportResistance` collapses each cluster to a bare average and
   * throws away how many swings formed it. That touch count is the single best
   * proxy for how much a level actually matters: a price rejected five times is
   * a wall, a price touched once is a coincidence. Decision-zone construction
   * needs that distinction, so this variant returns it.
   *
   * Deliberately additive — the original method is untouched so every existing
   * caller keeps its exact behaviour.
   *
   * @param candles    Mature candles (warm-up already filtered by the caller).
   * @param window     Swing pivot half-width.
   * @param maxLevels  Max clusters per side (3 support + 3 resistance by default).
   */
  public static extractSupportResistanceDetailed(
    candles: CandleData[],
    window = 5,
    maxLevels = 3,
    atr?: number
  ): {
    resistances: Array<{ price: number; touchCount: number; lastTouchIndex: number; spread: number }>;
    supports: Array<{ price: number; touchCount: number; lastTouchIndex: number; spread: number }>;
  } {
    if (candles.length < window * 2 + 1) {
      return { resistances: [], supports: [] };
    }

    const currentPrice = candles[candles.length - 1].close;
    const rawResistances: Array<{ price: number; index: number }> = [];
    const rawSupports: Array<{ price: number; index: number }> = [];

    // 1. Identify raw swing highs and lows, keeping their bar index so we know
    //    how recently the level was actually respected.
    for (let i = window; i < candles.length - window; i++) {
      const currentHigh = candles[i].high;
      const currentLow = candles[i].low;

      let isHigh = true;
      let isLow = true;

      for (let j = 1; j <= window; j++) {
        if (candles[i - j].high > currentHigh || candles[i + j].high > currentHigh) {
          isHigh = false;
        }
        if (candles[i - j].low < currentLow || candles[i + j].low < currentLow) {
          isLow = false;
        }
      }

      if (isHigh) rawResistances.push({ price: currentHigh, index: i });
      if (isLow) rawSupports.push({ price: currentLow, index: i });
    }

    // Levels on the wrong side of price have already been broken and are no
    // longer support/resistance — they become targets, not barriers.
    const validSupports = rawSupports.filter((l) => l.price <= currentPrice);
    const validResistances = rawResistances.filter((l) => l.price >= currentPrice);

    /**
     * Clustering threshold, volatility-scaled.
     *
     * A flat 0.8%-of-price threshold is wrong in both directions: on a quiet
     * instrument it fuses genuinely distinct levels into one blob (inflating
     * touch counts and inventing "20-touch walls" spanning 5 ATR), and on a
     * violent one it splits a single real level into three.
     *
     * Tying the threshold to ATR makes "same level" mean the same thing in
     * every market: within half a typical bar's range. The 0.8% form is kept as
     * an upper bound so a freak ATR spike cannot fuse the whole book.
     */
    const atrBased = Number.isFinite(atr) && (atr as number) > 0 ? (atr as number) * 0.5 : null;
    const pctBased = currentPrice * 0.008;
    const threshold = atrBased !== null ? Math.min(atrBased, pctBased) : pctBased;

    const clusterLevels = (
      levels: Array<{ price: number; index: number }>,
      isSupport: boolean
    ): Array<{ price: number; touchCount: number; lastTouchIndex: number; spread: number }> => {
      if (levels.length === 0) return [];

      // Sort nearest-to-price first so the closest levels seed the clusters.
      const sorted = [...levels].sort((a, b) =>
        isSupport ? b.price - a.price : a.price - b.price
      );

      const clusters: Array<{ prices: number[]; indices: number[] }> = [];

      for (const lvl of sorted) {
        let placed = false;
        for (const cluster of clusters) {
          const avg = cluster.prices.reduce((s, p) => s + p, 0) / cluster.prices.length;
          if (Math.abs(lvl.price - avg) <= threshold) {
            cluster.prices.push(lvl.price);
            cluster.indices.push(lvl.index);
            placed = true;
            break;
          }
        }
        if (!placed) {
          clusters.push({ prices: [lvl.price], indices: [lvl.index] });
        }
      }

      return clusters
        .map((c) => {
          const price = c.prices.reduce((s, p) => s + p, 0) / c.prices.length;
          const min = Math.min(...c.prices);
          const max = Math.max(...c.prices);

          // Magnitude-aware precision. A flat toFixed(2) collapses sub-dollar
          // assets (DOGE at 0.10234 -> 0.10) and destroys the level entirely.
          const mag = Math.abs(currentPrice);
          const decimals = mag >= 1000 ? 2 : mag >= 100 ? 3 : mag >= 1 ? 4 : mag >= 0.01 ? 6 : 8;

          return {
            price: Number(price.toFixed(decimals)),
            touchCount: c.prices.length,
            lastTouchIndex: Math.max(...c.indices),
            // Real dispersion of the swings that formed this cluster. A tight
            // cluster is a precise line; a wide one is a fuzzy area, and the
            // zone width should reflect that instead of assuming.
            spread: Number((max - min).toFixed(decimals)),
          };
        })
        // Strongest first (most touches), recency breaks ties.
        .sort((a, b) => b.touchCount - a.touchCount || b.lastTouchIndex - a.lastTouchIndex)
        .slice(0, maxLevels)
        // Then present in price order, nearest to price first.
        .sort((a, b) =>
          isSupport ? b.price - a.price : a.price - b.price
        );
    };

    return {
      resistances: clusterLevels(validResistances, false),
      supports: clusterLevels(validSupports, true),
    };
  }

  /**
   * Master Function: Calculate all quantitative indicators for a set of candles
   */
  public static processCandleIndicators(candles: CandleData[]): Array<CandleData & { indicators: CalculatedIndicators }> {
    if (candles.length === 0) return [];

    const closes = candles.map((c) => c.close);

    const sma10 = this.calculateSMA(closes, 10);
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);

    const ema7 = this.calculateEMA(closes, 7);
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);

    const rsi14 = this.calculateRSI(closes, 14);
    const macd = this.calculateMACD(closes);
    const bb = this.calculateBollingerBands(closes);
    const atr14 = this.calculateATR(candles, 14);
    const vwap = this.calculateVWAP(candles);
    const adx14 = this.calculateADX(candles, 14);

    return candles.map((candle, idx) => {
      const rsiVal = rsi14[idx];
      const rsiCondition = rsiVal >= 70 ? 'OVERBOUGHT' : rsiVal <= 30 ? 'OVERSOLD' : 'NEUTRAL';

      const macdHist = macd.histogram[idx];
      const macdLine = macd.macdLine[idx];
      const macdSignal = macd.signalLine[idx];
      const macdCondition =
        macdHist > 0 && macdLine > macdSignal
          ? 'BULLISH_CROSSOVER'
          : macdHist < 0 && macdLine < macdSignal
          ? 'BEARISH_CROSSOVER'
          : 'NEUTRAL';

      const indicators: CalculatedIndicators = {
        sma_10: sma10[idx],
        sma_20: sma20[idx],
        sma_50: sma50[idx],
        ema_7: ema7[idx],
        ema_20: ema20[idx],
        ema_50: ema50[idx],
        rsi_14: rsiVal,
        rsi_condition: rsiCondition,
        macd_line: macdLine,
        macd_signal: macdSignal,
        macd_hist: macdHist,
        macd_condition: macdCondition,
        bb_upper: bb.upper[idx],
        bb_middle: bb.middle[idx],
        bb_lower: bb.lower[idx],
        bb_bandwidth: bb.bandwidth[idx],
        atr_14: atr14[idx],
        vwap: vwap[idx],
        adx_14: adx14[idx],
      };

      return {
        ...candle,
        indicators,
      };
    });
  }

  /**
   * Determine whether a candle has moved past its indicator warm-up phase.
   * Warm-up signatures:
   *  - rsi_14 === 50 && macd_hist === 0 && adx_14 === 20 (placeholder values before windows fill)
   *  - any SMA is NaN (its window has not yet accumulated enough data)
   */
  public static isMatureCandle(candle: CandleData & { indicators: CalculatedIndicators }): boolean {
    const ind = candle.indicators;
    const placeholderSignature =
      ind.rsi_14 === 50 &&
      ind.macd_hist === 0 &&
      typeof ind.adx_14 === 'number' &&
      ind.adx_14 === 20;
    const hasNaNIndicator =
      Number.isNaN(ind.sma_10) ||
      Number.isNaN(ind.sma_20) ||
      Number.isNaN(ind.sma_50);
    return !placeholderSignature && !hasNaNIndicator;
  }

  /**
   * Extract key deterministic technical facts to pass to the LLM
   * Accepts optional pre-computed indicators to avoid redundant calculations.
   */
  public static extractTechnicalFacts(
    candles: CandleData[],
    precomputed?: CalculatedIndicators
  ): MarketTechnicalFacts {
    // Require at least 30 candles to compute meaningful indicators.
    // Previously required 50, but the API only fetches ~40-60 candles,
    // so 50 caused technicalFacts to always fall back to all-NEUTRAL.
    if (candles.length < 30) {
      return {
        trend: 'NEUTRAL',
        supportLevels: [],
        resistanceLevels: [],
        atrVolatility: 0,
        rsiCondition: 'NEUTRAL',
        macdCrossover: 'NONE',
      };
    }

    const closes = candles.map((c) => c.close);
    const currentPrice = closes[closes.length - 1];

    let trend: 'BULLISH' | 'BEARISH';
    let latestRsi: number;
    let rsiCondition: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
    let prevHist: number;
    let currHist: number;
    let latestAtr: number;
    let latestAdx: number;
    let adxTrend: 'STRONG' | 'WEAK' | 'RANGING' | 'UNKNOWN';

    if (precomputed && typeof precomputed.ema_20 === 'number' && typeof precomputed.ema_50 === 'number') {
      // Use pre-computed values from processCandleIndicators with fallback validation
      trend = precomputed.ema_20 > precomputed.ema_50 ? 'BULLISH' : 'BEARISH';
      latestRsi = typeof precomputed.rsi_14 === 'number' ? precomputed.rsi_14 : 50;
      rsiCondition = (precomputed.rsi_condition as 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL') || 'NEUTRAL';
      prevHist = 0; // Will be recalculated below from MACD arrays
      currHist = precomputed.macd_hist;
      // We need MACD hist for cross detection — recompute from full set
      // but only the MACD cross (cheap: just the last 3 values vs full indicator calc)
      const emaFast = this.calculateEMA(closes, 12);
      const emaSlow = this.calculateEMA(closes, 26);
      const macdLineRaw = emaFast.map((fast, i) => fast - emaSlow[i]);
      const signalLineRaw = this.calculateEMA(macdLineRaw, 9);
      const hist = macdLineRaw.map((m, i) => Number((m - signalLineRaw[i]).toFixed(2)));
      prevHist = hist.length >= 2 ? hist[hist.length - 2] : 0;
      latestAtr = precomputed.atr_14 ?? 0;
      latestAdx = precomputed.adx_14 ?? 0;
      adxTrend = latestAdx >= 25 ? 'STRONG' : latestAdx >= 20 ? 'WEAK' : 'RANGING';
    } else {
      const ema20 = this.calculateEMA(closes, 20);
      const ema50 = this.calculateEMA(closes, 50);
      trend = ema20[ema20.length - 1] > ema50[ema50.length - 1] ? 'BULLISH' : 'BEARISH';

      const rsi = this.calculateRSI(closes, 14);
      latestRsi = rsi[rsi.length - 1];
      rsiCondition = latestRsi < 30 ? 'OVERSOLD' : latestRsi > 70 ? 'OVERBOUGHT' : 'NEUTRAL';

      const macd = this.calculateMACD(closes);
      const hist = macd.histogram;
      prevHist = hist.length >= 2 ? hist[hist.length - 2] : 0;
      currHist = hist.length >= 1 ? hist[hist.length - 1] : 0;

      const atr = this.calculateATR(candles, 14);
      latestAtr = atr[atr.length - 1];

      const adx = this.calculateADX(candles, 14);
      latestAdx = adx[adx.length - 1] || 0;
      adxTrend = latestAdx >= 25 ? 'STRONG' : latestAdx >= 20 ? 'WEAK' : latestAdx > 0 ? 'RANGING' : 'UNKNOWN';
    }

    let macdCrossover: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE' = 'NONE';
    if (prevHist <= 0 && currHist > 0) {
      macdCrossover = 'BULLISH_CROSS';
    } else if (prevHist >= 0 && currHist < 0) {
      macdCrossover = 'BEARISH_CROSS';
    }

    // Extract support & resistance using dynamic clustering
    const sr = this.extractSupportResistance(candles, 5);

    // Calculate ATR-Based Stop Loss and Take Profit targets
    const atrSuggestedStopLossLong = Number((currentPrice - 2.0 * latestAtr).toFixed(2));
    const atrSuggestedTakeProfitLong = Number((currentPrice + 2.0 * latestAtr).toFixed(2));
    const atrSuggestedStopLossShort = Number((currentPrice + 2.0 * latestAtr).toFixed(2));
    const atrSuggestedTakeProfitShort = Number((currentPrice - 2.0 * latestAtr).toFixed(2));

    // Calculate Real-Time Risk-to-Reward Ratio (R:R) based on VALID S/R levels only.
    // A support level above current price or a resistance level below current price is invalid
    // (price has already broken it), so it must not be used as a target or stop.
    const validResistances = sr.resistanceLevels.filter((r) => r > currentPrice);
    const validSupports = sr.supportLevels.filter((s) => s < currentPrice);

    const nearestResistance = validResistances.length > 0 ? Math.min(...validResistances) : null;
    const nearestSupport = validSupports.length > 0 ? Math.max(...validSupports) : null;

    const MIN_RR = 1.8;

    let riskRewardRatioLong: number;
    if (nearestResistance === null) {
      riskRewardRatioLong = 0;
    } else {
      const longRisk = Math.abs(currentPrice - atrSuggestedStopLossLong);
      const longReward = Math.abs(nearestResistance - currentPrice);
      const rawLongRR = longRisk > 0 ? longReward / longRisk : 0;
      riskRewardRatioLong = rawLongRR >= MIN_RR ? Number(rawLongRR.toFixed(2)) : 0;
    }

    let riskRewardRatioShort: number;
    if (nearestSupport === null) {
      riskRewardRatioShort = 0;
    } else {
      const shortRisk = Math.abs(atrSuggestedStopLossShort - currentPrice);
      const shortReward = Math.abs(currentPrice - nearestSupport);
      const rawShortRR = shortRisk > 0 ? shortReward / shortRisk : 0;
      riskRewardRatioShort = rawShortRR >= MIN_RR ? Number(rawShortRR.toFixed(2)) : 0;
    }

    // Detect Break of Structure / Breakout
    const breakout = this.detectBreakout(candles, sr);

    /**
     * Regime-independent volume surge.
     *
     * `breakoutVolumeRatio` is only meaningful when a BOS actually fired:
     * detectBreakout() returns { type: 'NONE', volumeRatio } and bails early
     * whenever the ratio is under 1.5, so in every non-breakout bar — the large
     * majority of them — it reports a value that says nothing about whether
     * volume is genuinely expanding or drying up.
     *
     * The conviction scorer was reading that field as "volume confirmation",
     * which silently neutered a whole filter outside breakout conditions.
     * This measure is computed on every bar from closed candles, mirroring the
     * VolSurge figure already shown to the model in institutional-prompt.ts so
     * the score and the prompt agree on one number.
     */
    const volumeSurgeRatio = computeVolumeSurgeRatio(candles);

    // Detect Divergences
    const divs = this.detectDivergences(candles);

    return {
      trend,
      supportLevels: sr.supportLevels,
      resistanceLevels: sr.resistanceLevels,
      atrVolatility: latestAtr,
      rsiCondition,
      macdCrossover,
      adxValue: latestAdx,
      adxTrend,
      atrSuggestedStopLossLong,
      atrSuggestedTakeProfitLong,
      atrSuggestedStopLossShort,
      atrSuggestedTakeProfitShort,
      riskRewardRatioLong,
      riskRewardRatioShort,
      breakoutType: breakout.type,
      breakoutLevel: breakout.brokenLevel,
      breakoutVolumeRatio: breakout.volumeRatio,
      volumeSurgeRatio,
      rsiDivergence: divs.rsiDivergence,
      macdDivergence: divs.macdDivergence,
    };
  }

  /**
   * Detect Break of Structure (BOS) or Breakout over VALID S&R Levels.
   * A breakout is only confirmed when price closes beyond a clustered S/R level
   * AND the candle volume is at least 1.5x the recent average.
   */
  public static detectBreakout(
    candles: CandleData[],
    srLevels: SupportResistanceLevels
  ): { type: 'BOS_BULLISH' | 'BOS_BEARISH' | 'NONE'; brokenLevel: number; volumeRatio: number } {
    if (candles.length < 3) return { type: 'NONE', brokenLevel: 0, volumeRatio: 1 };
    
    const lastCandle = candles[candles.length - 1];
    const currentPrice = lastCandle.close;

    // Average volume of last 10 candles
    const sliceCount = Math.min(candles.length, 10);
    const avgVol = candles.slice(-sliceCount).reduce((acc, c) => acc + c.volume, 0) / sliceCount;
    const volumeRatio = avgVol > 0 ? Number((lastCandle.volume / avgVol).toFixed(2)) : 1;

    // Require volume surge to validate a breakout — otherwise it's likely noise/inside candle.
    if (volumeRatio < 1.5) {
      return { type: 'NONE', brokenLevel: 0, volumeRatio };
    }

    // Bullish breakout: close above a clustered resistance level
    for (const res of srLevels.resistanceLevels) {
      if (currentPrice > res) {
        return { type: 'BOS_BULLISH', brokenLevel: res, volumeRatio };
      }
    }

    // Bearish breakout: close below a clustered support level
    for (const sup of srLevels.supportLevels) {
      if (currentPrice < sup) {
        return { type: 'BOS_BEARISH', brokenLevel: sup, volumeRatio };
      }
    }

    return { type: 'NONE', brokenLevel: 0, volumeRatio };
  }

  /**
   * Programmatic RSI & MACD Divergence Detection Engine
   */
  public static detectDivergences(
    candles: CandleData[]
  ): { rsiDivergence: 'BULLISH_DIV' | 'BEARISH_DIV' | 'NONE'; macdDivergence: 'BULLISH_DIV' | 'BEARISH_DIV' | 'NONE' } {
    const result: {
      rsiDivergence: 'BULLISH_DIV' | 'BEARISH_DIV' | 'NONE';
      macdDivergence: 'BULLISH_DIV' | 'BEARISH_DIV' | 'NONE';
    } = { rsiDivergence: 'NONE', macdDivergence: 'NONE' };
    
    // Adaptive candle length threshold — minimum 20 candles needed for divergence scanning
    if (candles.length < 20) return result;

    const closes = candles.map((c) => c.close);
    const rsi = this.calculateRSI(closes, 14);
    const macd = this.calculateMACD(closes);
    const macdHist = macd.histogram;

    const peaks: { index: number; price: number; rsiVal: number; macdHistVal: number }[] = [];
    const troughs: { index: number; price: number; rsiVal: number; macdHistVal: number }[] = [];

    // Adaptive pivot scan range based on available candles.
    // Start the scan only after RSI has a real value (period = 14) so warm-up
    // placeholder readings (rsi=50) do not generate false divergences.
    const windowSpan = candles.length < 40 ? 1 : 2;
    const startIdx = Math.max(windowSpan + 14, candles.length - 45);
    const endIdx = candles.length - (windowSpan + 1);

    for (let i = startIdx; i <= endIdx; i++) {
      let isPeak = true;
      let isTrough = true;

      for (let offset = 1; offset <= windowSpan; offset++) {
        if (candles[i].high < candles[i - offset].high || candles[i].high < candles[i + offset].high) {
          isPeak = false;
        }
        if (candles[i].low > candles[i - offset].low || candles[i].low > candles[i + offset].low) {
          isTrough = false;
        }
      }

      if (isPeak) {
        peaks.push({
          index: i,
          price: candles[i].high,
          rsiVal: rsi[i],
          macdHistVal: macdHist[i],
        });
      }
      if (isTrough) {
        troughs.push({
          index: i,
          price: candles[i].low,
          rsiVal: rsi[i],
          macdHistVal: macdHist[i],
        });
      }
    }

    // Compare the last two peaks for Bearish Divergence
    if (peaks.length >= 2) {
      const p1 = peaks[peaks.length - 2];
      const p2 = peaks[peaks.length - 1];
      
      if (p2.price > p1.price && p2.rsiVal < p1.rsiVal) {
        result.rsiDivergence = 'BEARISH_DIV';
      }
      if (p2.price > p1.price && p2.macdHistVal < p1.macdHistVal) {
        result.macdDivergence = 'BEARISH_DIV';
      }
    }

    // Compare the last two troughs for Bullish Divergence
    if (troughs.length >= 2) {
      const t1 = troughs[troughs.length - 2];
      const t2 = troughs[troughs.length - 1];

      if (t2.price < t1.price && t2.rsiVal > t1.rsiVal) {
        result.rsiDivergence = 'BULLISH_DIV';
      }
      if (t2.price < t1.price && t2.macdHistVal > t1.macdHistVal) {
        result.macdDivergence = 'BULLISH_DIV';
      }
    }

    return result;
  }

  /**
   * Calculate Pearson Correlation Coefficient between two series of numbers
   */
  public static calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return Number((numerator / denominator).toFixed(3));
  }
}
