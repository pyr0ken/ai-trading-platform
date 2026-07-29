/**
 * Market Data & Technical Indicators Types
 */

import { NewsPayload } from './news';

export interface MarketTicker {
  symbol: string;
  exchange: string;

  price: number;
  change24h: number;
  change24hPercentage: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  bid: number;
  ask: number;
}

export interface CandleData {
  timestamp: number;
  gregorianDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CalculatedIndicators {
  sma_10: number;
  sma_20: number;
  sma_50: number;
  sma_200: number;
  ema_7: number;
  ema_20: number;
  ema_50: number;
  ema_200: number;
  rsi_14: number;
  rsi_condition: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
  macd_line: number;
  macd_signal: number;
  macd_hist: number;
  macd_condition: 'BULLISH_CROSSOVER' | 'BEARISH_CROSSOVER' | 'NEUTRAL';
  bb_upper: number;
  bb_middle: number;
  bb_lower: number;
  bb_bandwidth: number;
  atr_14: number;
  vwap?: number;
  adx_14?: number;
}

export interface SupportResistanceLevels {
  resistanceLevels: number[];
  supportLevels: number[];
}

export interface ProcessedTimeframeData {
  timeframe: string;
  candleCount: number;
  latestClose: number;
  indicators: CalculatedIndicators;
  keyLevels: SupportResistanceLevels;
  candles: Array<CandleData & { indicators: CalculatedIndicators }>;
}

export interface DerivativesMetrics {
  swapSymbol: string;
  fundingRate: number | null;
  openInterest: number | null;
  markPrice: number | null;
  indexPrice: number | null;
  basisPremiumPct: number | null;
}

export interface OrderBookDepth {
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadPercentage: number;
  bidDepthVolumeTop20: number;
  askDepthVolumeTop20: number;
  imbalanceRatio: number;
  orderBookPressure: 'BUY_PRESSURE' | 'SELL_PRESSURE' | 'NEUTRAL';
}

export interface VolumeDeltaCVD {
  sampleTradesCount: number;
  takerBuyVolume: number;
  takerSellVolume: number;
  volumeDelta: number;
  buySellRatio: number;
  cvdSignal: 'NET_BUYING_CVD' | 'NET_SELLING_CVD' | 'BALANCED';
}

export interface MicrostructureMetrics {
  orderBookDepth: OrderBookDepth | Record<string, never>;
  volumeDeltaCvd: VolumeDeltaCVD | Record<string, never>;
  liquidationsStatus?: string;
}

export interface MacroSentiment {
  fearAndGreed: {
    value: number | null;
    classification: string;
  };
  stablecoinLiquidity: {
    totalStablecoinMarketCapUsd: number | null;
    topStablecoins: Record<string, { name: string; circulatingUsd: number | null; price: number }>;
  };
}

export interface MarketTechnicalFacts {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  supportLevels: number[];
  resistanceLevels: number[];
  atrVolatility: number;
  rsiCondition: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  macdCrossover: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE';
  adxValue?: number;
  adxTrend?: 'STRONG' | 'WEAK' | 'RANGING';
  atrSuggestedStopLossLong?: number;
  atrSuggestedTakeProfitLong?: number;
  atrSuggestedStopLossShort?: number;
  atrSuggestedTakeProfitShort?: number;
  breakoutType?: 'BOS_BULLISH' | 'BOS_BEARISH' | 'NONE';
  breakoutLevel?: number;
  breakoutVolumeRatio?: number;
  rsiDivergence?: 'BULLISH_DIV' | 'BEARISH_DIV' | 'NONE';
  macdDivergence?: 'BULLISH_DIV' | 'BEARISH_DIV' | 'NONE';
  btcCorrelation?: number;
}

export interface MarketContextPayload {
  symbol: string;
  exchange: string;
  timeframe: string;
  fetchedAt: string;
  ticker: MarketTicker;
  timeframes: Record<string, ProcessedTimeframeData>;
  derivatives: DerivativesMetrics;
  microstructure: MicrostructureMetrics;
  macroSentiment: MacroSentiment;
  news: NewsPayload;
}
