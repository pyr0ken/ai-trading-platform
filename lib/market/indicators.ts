import { CalculatedIndicators, CandleData, SupportResistanceLevels, MarketTechnicalFacts } from '@/types/market';

/**
 * Technical Indicator Calculation Engine (Pure TypeScript)
 */
export class TechnicalIndicatorEngine {
  /**
   * Calculate Simple Moving Average (SMA)
   */
  public static calculateSMA(data: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(data[i]);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
        sma.push(Number((sum / period).toFixed(2)));
      }
    }
    return sma;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  public static calculateEMA(data: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        ema.push(data[0]);
      } else {
        const prevEma = ema[i - 1];
        const currentEma = (data[i] - prevEma) * multiplier + prevEma;
        ema.push(Number(currentEma.toFixed(2)));
      }
    }
    return ema;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  public static calculateRSI(closes: number[], period = 14): number[] {
    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;

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
   * Calculate Bollinger Bands (Upper, Middle, Lower, Bandwidth)
   */
  public static calculateBollingerBands(
    closes: number[],
    period = 20,
    multiplier = 2
  ): { upper: number[]; middle: number[]; lower: number[]; bandwidth: number[] } {
    const middle = this.calculateSMA(closes, period);
    const upper: number[] = [];
    const lower: number[] = [];
    const bandwidth: number[] = [];

    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        upper.push(middle[i]);
        lower.push(middle[i]);
        bandwidth.push(0);
      } else {
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = middle[i];
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);

        const u = Number((mean + stdDev * multiplier).toFixed(2));
        const l = Number((mean - stdDev * multiplier).toFixed(2));
        const bw = Number((((u - l) / mean) * 100).toFixed(2));

        upper.push(u);
        lower.push(l);
        bandwidth.push(bw);
      }
    }
    return { upper, middle, lower, bandwidth };
  }

  /**
   * Calculate Average True Range (ATR)
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

    return this.calculateEMA(tr, period);
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
   * Auto-extract Support and Resistance Levels from swing highs and lows
   */
  public static extractSupportResistance(
    candles: CandleData[],
    window = 5
  ): SupportResistanceLevels {
    if (candles.length < window * 2 + 1) {
      return { resistanceLevels: [], supportLevels: [] };
    }

    const resistances: number[] = [];
    const supports: number[] = [];

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

      if (isHigh) resistances.push(Number(currentHigh.toFixed(2)));
      if (isLow) supports.push(Number(currentLow.toFixed(2)));
    }

    const uniqueResistances = Array.from(new Set(resistances)).sort((a, b) => a - b).slice(-3);
    const uniqueSupports = Array.from(new Set(supports)).sort((a, b) => a - b).slice(0, 3);

    return {
      resistanceLevels: uniqueResistances,
      supportLevels: uniqueSupports,
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
    const sma200 = this.calculateSMA(closes, 200);

    const ema7 = this.calculateEMA(closes, 7);
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const ema200 = this.calculateEMA(closes, 200);

    const rsi14 = this.calculateRSI(closes, 14);
    const macd = this.calculateMACD(closes);
    const bb = this.calculateBollingerBands(closes);
    const atr14 = this.calculateATR(candles, 14);
    const vwap = this.calculateVWAP(candles);

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
        sma_200: sma200[idx],
        ema_7: ema7[idx],
        ema_20: ema20[idx],
        ema_50: ema50[idx],
        ema_200: ema200[idx],
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
      };

      return {
        ...candle,
        indicators,
      };
    });
  }

  /**
   * Extract key deterministic technical facts to pass to the LLM
   */
  public static extractTechnicalFacts(candles: CandleData[]): MarketTechnicalFacts {
    if (candles.length < 50) {
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
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);

    const trend = ema20[ema20.length - 1] > ema50[ema50.length - 1] ? 'BULLISH' : 'BEARISH';

    const rsi = this.calculateRSI(closes, 14);
    const latestRsi = rsi[rsi.length - 1];
    const rsiCondition = latestRsi < 30 ? 'OVERSOLD' : latestRsi > 70 ? 'OVERBOUGHT' : 'NEUTRAL';

    const macd = this.calculateMACD(closes);
    const hist = macd.histogram;
    const prevHist = hist[hist.length - 2];
    const currHist = hist[hist.length - 1];

    let macdCrossover: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE' = 'NONE';
    if (prevHist <= 0 && currHist > 0) {
      macdCrossover = 'BULLISH_CROSS';
    } else if (prevHist >= 0 && currHist < 0) {
      macdCrossover = 'BEARISH_CROSS';
    }

    const atr = this.calculateATR(candles, 14);

    // Extract support & resistance
    const sr = this.extractSupportResistance(candles, 5);

    return {
      trend,
      supportLevels: sr.supportLevels,
      resistanceLevels: sr.resistanceLevels,
      atrVolatility: atr[atr.length - 1],
      rsiCondition,
      macdCrossover,
    };
  }
}
