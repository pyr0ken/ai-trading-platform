/**
 * Python Microservice HTTP Client
 * Connects Next.js to the FastAPI Python Backend (`http://127.0.0.1:8000`)
 *
 * Designed with strict zero-breakage fallback contract: if the Python service
 * is offline or fails, requests gracefully return null or fallback to TS logic.
 */

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

export interface PythonSentimentItem {
  id: string;
  text: string;
}

export interface PythonSentimentResult {
  id: string;
  score: number;
  label: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  pos: number;
  neg: number;
  neu: number;
}

export interface PythonClusteringRequest {
  prices: number[];
  spot_price: number;
  atr: number;
  eps_pct?: number;
  min_samples?: number;
}

export interface PythonSREntity {
  id: string;
  kind: 'SUPPORT' | 'RESISTANCE';
  priceLow: number;
  priceHigh: number;
  priceMid: number;
  distancePct: number;
  distanceInAtr: number;
  touchCount: number;
  strength: number;
}

export interface PythonClusteringResult {
  resistanceZones: PythonSREntity[];
  supportZones: PythonSREntity[];
  activeZoneId: string | null;
}

export interface PythonCandleInput {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PythonBacktestRequest {
  candles: PythonCandleInput[];
  initial_balance?: number;
  strategy_type?: string;
  rsi_period?: number;
  rsi_buy_level?: number;
  rsi_sell_level?: number;
  stop_loss_pct?: number;
  take_profit_pct?: number;
}

export interface PythonBacktestResult {
  initialBalance: number;
  finalBalance: number;
  totalProfitPct: number;
  totalTrades: number;
  winRate: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  trades: Array<{
    id: number;
    entryTime: number;
    exitTime: number;
    entryPrice: number;
    exitPrice: number;
    pnlPct: number;
    pnlAmount: number;
    reason: string;
    win: boolean;
  }>;
  equityCurve: Array<{
    timestamp: number;
    balance: number;
  }>;
  error?: string;
}

export class PythonBackendClient {
  /**
   * Check if Python FastAPI service is alive
   */
  public static async isAlive(timeoutMs = 2000): Promise<boolean> {
    try {
      const res = await fetch(`${PYTHON_BACKEND_URL}/health`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Batch analyze NLP sentiment using Python VADER + Crypto Lexicon
   */
  public static async analyzeSentimentBatch(
    items: PythonSentimentItem[],
    timeoutMs = 5000
  ): Promise<PythonSentimentResult[] | null> {
    try {
      const res = await fetch(`${PYTHON_BACKEND_URL}/api/v1/sentiment/analyze-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) return null;
      return (await res.json()) as PythonSentimentResult[];
    } catch (err) {
      console.warn('[PythonBackendClient] Sentiment batch call failed, returning null fallback:', err);
      return null;
    }
  }

  /**
   * Perform DBSCAN clustering on price levels to extract Support & Resistance zones
   */
  public static async clusterSR(
    payload: PythonClusteringRequest,
    timeoutMs = 4000
  ): Promise<PythonClusteringResult | null> {
    try {
      const res = await fetch(`${PYTHON_BACKEND_URL}/api/v1/clustering/sr-clusters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) return null;
      return (await res.json()) as PythonClusteringResult;
    } catch (err) {
      console.warn('[PythonBackendClient] Clustering call failed, returning null fallback:', err);
      return null;
    }
  }

  /**
   * Execute high-speed vectorized backtesting in Python
   */
  public static async runBacktest(
    payload: PythonBacktestRequest,
    timeoutMs = 10000
  ): Promise<PythonBacktestResult | null> {
    try {
      const res = await fetch(`${PYTHON_BACKEND_URL}/api/v1/backtest/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) return null;
      return (await res.json()) as PythonBacktestResult;
    } catch (err) {
      console.warn('[PythonBackendClient] Backtest run failed, returning null fallback:', err);
      return null;
    }
  }
}
