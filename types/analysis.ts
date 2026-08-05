import { MarketTicker, ProcessedTimeframeData, DerivativesMetrics, MicrostructureMetrics, MacroSentiment, MarketTechnicalFacts } from './market';
import { NewsPayload, SymbolNewsContext } from './news';
import type { SocialIntelContext } from '@/lib/intel/social-intel';
import type { MarketRegime } from '@/lib/analysis/market-regime';
import { DecisionZoneMap } from '@/lib/analysis/decision-zones';
import { TradingCostModel } from '@/lib/analysis/trading-costs';

/**
 * Full Structured Market Context Payload sent to LLM
 */
export interface HistoricalSignalFeedback {
  signal: string;
  confidence: number;
  price: number;
  created_at: string;
  status: string;
  pnl_percentage: number;
}

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
  /**
   * Pre-analysed, symbol-filtered news intelligence (Stage-1 output).
   * Optional so older payloads and forex paths remain valid; when absent the
   * prompt builder falls back to the raw `news` summary.
   */
  newsIntelligence?: SymbolNewsContext;
  /**
   * Social/X intelligence for this symbol from the deterministic intel layer
   * (lib/intel/). Optional: absent when the tweet feed has not been scraped or
   * contains nothing relevant. Rendered as its own prompt block, separate from
   * RSS news, because tweets are pre-publication signals (the origin of a
   * shock) while articles are post-publication coverage.
   */
  socialIntel?: SocialIntelContext;
  timeframes: Record<string, ProcessedTimeframeData>;
  technicalFacts?: MarketTechnicalFacts;
  mode?: 'scalp' | 'swing';
  /**
   * Deterministic regime read across all fetched timeframes.
   *
   * Computed in code rather than asked of the model: an LLM will answer
   * "trending or ranging?" confidently either way, and that guess then anchors
   * every downstream conclusion. Optional so older cached payloads stay valid.
   */
  marketRegime?: MarketRegime;
  /**
   * Conditional decision-zone map built from real swing pivots.
   *
   * This is what turns a bare directional call into a positional plan: the
   * prices where a decision actually gets made, with branch outcomes for hold
   * vs break. Optional for backward compatibility.
   */
  decisionZones?: DecisionZoneMap;
  /**
   * Deterministic execution cost model. Present so both the prompt and the
   * post-response gate reason about the same numbers.
   */
  costModel?: TradingCostModel;
  recentHistoricalSignals?: HistoricalSignalFeedback[];
  economicWarnings?: string[];
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
