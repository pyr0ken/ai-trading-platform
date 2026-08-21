/**
 * Cross-validation test: compares our TechnicalIndicatorEngine against the
 * widely-used `technicalindicators` reference library, on REAL market data
 * fetched live from KuCoin via CCXT.
 *
 * Run: npx vitest run tests/cross-validate.test.ts
 */
import { describe, expect, it } from 'vitest';
import ccxt from 'ccxt';
import {
  SMA,
  EMA,
  RSI,
  MACD,
  BollingerBands,
  ATR,
} from 'technicalindicators';
import { TechnicalIndicatorEngine as T } from '../lib/market/indicators';
import { CandleData } from '../types/market';

async function fetchRealCandles(symbol = 'BTC/USDT', timeframe = '1h', limit = 100) {
  const exchange = new ccxt.kucoin({ enableRateLimit: true, timeout: 5000 });
  const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
  return ohlcv.map((c: number[]): CandleData => ({
    timestamp: Number(c[0]),
    gregorianDate: new Date(Number(c[0])).toISOString(),
    open: Number(c[1]),
    high: Number(c[2]),
    low: Number(c[3]),
    close: Number(c[4]),
    volume: Number(c[5]),
  }));
}

describe('Cross-validation vs technicalindicators (real KuCoin data)', () => {
  it('SMA, EMA, RSI, MACD, Bollinger, ATR all match the reference library', async () => {
    const candles = await fetchRealCandles();
    expect(candles.length).toBeGreaterThan(50);

    const closes = candles.map((c) => c.close);
    const last = candles.length - 1;
    // Our engine rounds to 2 decimals; reference lib doesn't -> tolerance 0.05
    const tol = 0.05;

    // SMA 20
    const refSMA = SMA.calculate({ period: 20, values: closes });
    const ourSMA = T.calculateSMA(closes, 20);
    expect(ourSMA[last]).toBeCloseTo(refSMA[refSMA.length - 1], 1);

    // EMA 20
    const refEMA = EMA.calculate({ period: 20, values: closes });
    const ourEMA = T.calculateEMA(closes, 20);
    expect(Math.abs(ourEMA[last] - refEMA[refEMA.length - 1])).toBeLessThanOrEqual(tol);

    // RSI 14
    const refRSI = RSI.calculate({ period: 14, values: closes });
    const ourRSI = T.calculateRSI(closes, 14);
    expect(Math.abs(ourRSI[last] - refRSI[refRSI.length - 1])).toBeLessThanOrEqual(tol);

    // MACD (12,26,9)
    const refMACD = MACD.calculate({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, values: closes });
    const ourMACD = T.calculateMACD(closes);
    const lastRef = refMACD[refMACD.length - 1];
    expect(Math.abs(ourMACD.macdLine[last] - lastRef.MACD)).toBeLessThanOrEqual(tol);
    expect(Math.abs(ourMACD.signalLine[last] - lastRef.signal)).toBeLessThanOrEqual(tol);
    expect(Math.abs(ourMACD.histogram[last] - lastRef.histogram)).toBeLessThanOrEqual(tol);

    // Bollinger Bands (20, 2)
    const refBB = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes });
    const ourBB = T.calculateBollingerBands(closes, 20, 2);
    const lastBB = refBB[refBB.length - 1];
    expect(Math.abs(ourBB.upper[last] - lastBB.upper)).toBeLessThanOrEqual(tol);
    expect(Math.abs(ourBB.middle[last] - lastBB.middle)).toBeLessThanOrEqual(tol);
    expect(Math.abs(ourBB.lower[last] - lastBB.lower)).toBeLessThanOrEqual(tol);

    // ATR 14 — reference is Wilder-smoothed (WEMA), aligned so ref[i] == ours[i+period-1]
    const refATR = ATR.calculate({
      period: 14,
      high: candles.map((c) => c.high),
      low: candles.map((c) => c.low),
      close: closes,
    });
    const ourATR = T.calculateATR(candles, 14);
    expect(Math.abs(ourATR[last] - refATR[refATR.length - 1])).toBeLessThanOrEqual(tol);
  }, 30000);
});
