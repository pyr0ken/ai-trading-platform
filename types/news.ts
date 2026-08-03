/**
 * Crypto News Types — Premium Intelligence Feed
 */

export type NewsCategory =
  | 'regulatory'
  | 'market'
  | 'protocol'
  | 'breaking'
  | 'macro'
  | 'general';

export const NEWS_CATEGORIES: Record<NewsCategory, {
  label: string;
  emoji: string;
  borderColor: string;
  badgeBg: string;
}> = {
  regulatory: {
    label: 'Regulatory',
    emoji: '🏛',
    borderColor: 'border-amber-500/40',
    badgeBg: 'bg-amber-500/10 text-amber-400',
  },
  market: {
    label: 'Market',
    emoji: '📈',
    borderColor: 'border-emerald-500/40',
    badgeBg: 'bg-emerald-500/10 text-emerald-400',
  },
  protocol: {
    label: 'Protocol',
    emoji: '🔧',
    borderColor: 'border-sky-500/40',
    badgeBg: 'bg-sky-500/10 text-sky-400',
  },
  breaking: {
    label: 'Breaking',
    emoji: '⚡',
    borderColor: 'border-rose-500/50',
    badgeBg: 'bg-rose-500/15 text-rose-400',
  },
  macro: {
    label: 'Macro',
    emoji: '🧠',
    borderColor: 'border-violet-500/40',
    badgeBg: 'bg-violet-500/10 text-violet-400',
  },
  general: {
    label: 'General',
    emoji: '📰',
    borderColor: 'border-[#1c1d22]',
    badgeBg: 'bg-[#121317] text-[#9194a1]',
  },
};

export interface NewsArticle {
  title: string;
  summary: string;
  published_at?: string;
  source: string;
  url?: string;
  sentimentScore?: number; // -1 to +1
  category?: NewsCategory;
  articleId?: string; // unique hash for bookmarking
}

export interface NewsPayload {
  summaryForPrompt: string;
  articles: NewsArticle[];
  newsSentimentIndex?: number; // average sentiment from -1 to +1
}

/**
 * Directional bias of the overall news regime.
 * RISK_ON  = capital rotating into risk assets
 * RISK_OFF = capital fleeing to safety
 */
export type RegimeBias = 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL';

/** Directional impact of a driver or event on an asset. */
export type ImpactDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

/** How quickly a news item is expected to affect price. */
export type TimeSensitivity = 'IMMEDIATE' | 'HOURS' | 'DAYS' | 'BACKGROUND';

/** A macro force currently acting on markets. */
export interface MacroDriver {
  /** Short name, e.g. "Fed rate path", "Treasury yields". */
  driver: string;
  direction: ImpactDirection;
  /** Relative importance in [0..100]. */
  weight: number;
  /** Rough time horizon over which this driver acts, e.g. "1d", "1w". */
  horizon: string;
}

/** Expected effect of the news regime on a specific asset. */
export interface AssetImpact {
  /** Base asset ticker, e.g. "BTC", "XAUT". */
  asset: string;
  impact: ImpactDirection;
  /** Strength of the expected effect in [0..100]. */
  magnitude: number;
  /** One-line justification grounded in the supplied articles. */
  rationale: string;
}

/** A scheduled or pending event that could reprice the market. */
export interface EventRisk {
  event: string;
  /** ISO timestamp or a descriptive window when unknown. */
  whenUtc: string;
  /** Expected market reaction if the event resolves positively. */
  ifPassed: string;
  /** Expected market reaction if the event resolves negatively. */
  ifFailed: string;
}

/** Per-article verdict produced by the intelligence layer. */
export interface ArticleImpact {
  /** Matches NewsArticle.articleId so results can be joined back. */
  articleId: string;
  /** Corrected sentiment in [-1..1] after reading the full context. */
  trueSentiment: number;
  /** Market impact strength in [0..100], independent of direction. */
  impactScore: number;
  /** Base assets this article materially affects. */
  affectedAssets: string[];
  timeSensitivity: TimeSensitivity;
}

/**
 * Structured, pre-analysed news brief shared across all symbols in a cache window.
 *
 * Produced either by the LLM intelligence pass or by the deterministic
 * fallback. `isFallback` tells the prompt builder which one it got so the
 * model can weight it appropriately — we never disguise fallback output as
 * LLM-grade analysis.
 */
export interface NewsIntelligenceBrief {
  aggregateBias: RegimeBias;
  /** Confidence in the aggregate bias, [0..100]. */
  biasConfidence: number;
  macroDrivers: MacroDriver[];
  assetImpacts: AssetImpact[];
  eventRisks: EventRisk[];
  articleImpacts: ArticleImpact[];
  /** ISO timestamp when this brief was generated. */
  generatedAt: string;
  /** True when the LLM pass failed and deterministic output was used instead. */
  isFallback: boolean;
  /** Number of articles the brief was derived from. */
  sourceArticleCount: number;
}

/**
 * An article ranked for a specific traded symbol, with the evidence that
 * justified its inclusion. Rendered directly into the LLM prompt.
 */
export interface SymbolRankedArticle {
  title: string;
  source: string;
  publishedAt?: string;
  category?: NewsCategory;
  /** Deterministic lexicon sentiment in [-1..1]. */
  lexiconSentiment: number;
  /** LLM-corrected sentiment when available, else null. */
  llmSentiment: number | null;
  /** Relevance to the traded symbol, [0..100]. */
  relevance: number;
  /** Relevance after freshness decay, [0..100]. */
  effectiveWeight: number;
  timeSensitivity: TimeSensitivity;
  /** Why this article was considered relevant — surfaced for auditability. */
  relevanceReason: string;
}

/**
 * Everything the prompt builder needs about news for ONE traded symbol.
 * This is the object injected into the institutional prompt.
 */
export interface SymbolNewsContext {
  symbol: string;
  brief: NewsIntelligenceBrief;
  /** Articles that cleared the relevance threshold, best first. */
  rankedArticles: SymbolRankedArticle[];
  /** Impact entry matching this symbol's base asset, when the brief has one. */
  directImpact: AssetImpact | null;
  /**
   * Correlation-adjusted verdict for BTC-driven news, or null when the traded
   * asset IS Bitcoin (in which case no adjustment applies).
   */
  correlationAdjustedBtcImpact: {
    correlation: number;
    adjustedMagnitude: number;
    verdict: string;
  } | null;
  /** Weighted sentiment across the ranked articles, [-1..1]. */
  weightedSentiment: number;
  /**
   * How many of the surfaced articles carried a non-zero directional signal.
   * Lets the model judge breadth: one bearish headline among six is weaker
   * evidence than four agreeing bearish headlines.
   */
  directionalArticleCount: number;
  /** How many articles were examined before filtering. */
  totalArticlesConsidered: number;
}
