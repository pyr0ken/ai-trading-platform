import { MarketTicker, ProcessedTimeframeData, DerivativesMetrics, MicrostructureMetrics, MacroSentiment, MarketTechnicalFacts } from './market';
import { NewsPayload } from './news';

/**
 * Full Structured Market Context Payload sent to LLM
 */
export interface FullMarketContextPayload {
  metadata: {
    symbol: string;
    exchange: string;
    primaryTimeframe: string;
    timestampUtc: string;
  };
  ticker: MarketTicker;
  macroSentiment: MacroSentiment;
  derivatives: DerivativesMetrics;
  microstructure: MicrostructureMetrics;
  news: NewsPayload;
  timeframes: Record<string, ProcessedTimeframeData>;
  technicalFacts?: MarketTechnicalFacts;
  mode?: 'scalp' | 'swing';
}

export interface AnalysisRequestOptions {
  symbol: string;
  exchange: string;
  timeframe: string;
}

export interface AnalysisStreamChunk {
  content?: string;
  error?: string;
  done?: boolean;
}
