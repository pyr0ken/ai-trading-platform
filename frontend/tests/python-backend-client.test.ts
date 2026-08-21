import { describe, it, expect } from 'vitest';
import { PythonBackendClient } from '../lib/python/python-client';

describe('PythonBackendClient Microservice Integration', () => {
  it('should connect to Python FastAPI health check endpoint', async () => {
    const isAlive = await PythonBackendClient.isAlive();
    expect(isAlive).toBe(true);
  });

  it('should analyze text sentiment using Python VADER + Crypto Lexicon', async () => {
    const result = await PythonBackendClient.analyzeSentimentBatch([
      { id: '1', text: 'BTC is pumping hard and breakout ATH!' },
      { id: '2', text: 'Market crashed, massive liquidation event rekt.' },
    ]);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    if (result) {
      expect(result[0].label).toBe('BULLISH');
      expect(result[1].label).toBe('BEARISH');
    }
  });

  it('should cluster Support & Resistance zones using DBSCAN', async () => {
    const result = await PythonBackendClient.clusterSR({
      prices: [64000, 64050, 64100, 68000, 68050, 68100],
      spot_price: 66000,
      atr: 500,
    });

    expect(result).not.toBeNull();
    if (result) {
      expect(result.resistanceZones.length).toBeGreaterThan(0);
      expect(result.supportZones.length).toBeGreaterThan(0);
      expect(result.resistanceZones[0].kind).toBe('RESISTANCE');
      expect(result.supportZones[0].kind).toBe('SUPPORT');
    }
  });

  it('should run vectorized backtest over OHLCV candles', async () => {
    // Generate 30 dummy candles
    const candles = Array.from({ length: 30 }, (_, i) => ({
      timestamp: 1700000000 + i * 3600,
      open: 50000 + i * 10,
      high: 50200 + i * 10,
      low: 49800 + i * 10,
      close: 50100 + (i % 2 === 0 ? 50 : -50),
      volume: 100 + i,
    }));

    const result = await PythonBackendClient.runBacktest({
      candles,
      initial_balance: 10000,
      rsi_period: 14,
    });

    expect(result).not.toBeNull();
    if (result) {
      expect(result.initialBalance).toBe(10000);
      expect(result.equityCurve.length).toBeGreaterThan(0);
    }
  });
});
