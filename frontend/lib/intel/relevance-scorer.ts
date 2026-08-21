/**
 * Relevance Scorer — the core of the intelligence layer.
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * A tweet about Bitcoin ETF inflows is critical context for BTC/USDT and noise
 * for XAUT/USDT. Feeding every item to every symbol's prompt buries the signal
 * and wastes the context window. This module answers one question:
 *
 *     How relevant is THIS item to THIS symbol, on a 0-1 scale?
 *
 * WHY DETERMINISTIC
 * -----------------
 * Measured from logs/news-intelligence/, the Stage-1 LLM fails 67% of the time
 * (14 of 21 runs) and the deterministic fallback hardcodes `assetImpacts: []`
 * (news-intelligence.ts:330). So two thirds of the time the model received a
 * brief with no asset linkage at all.
 *
 * This scorer has no network call and cannot fail. It is the floor: even with
 * every LLM offline, items still get ranked and mapped to assets. LLM
 * enrichment sits ON TOP of this, never underneath it.
 *
 * SCORE SEMANTICS
 * ---------------
 * Relevance is NOT direction. A score of 0.9 means "this concerns the symbol",
 * not "this is bullish". Direction is the reading model's job.
 */

import { getSourceWeight, isPrimaryMover } from './source-registry';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** Match strength tiers, strongest first. */
export type MatchTier = 'direct' | 'related' | 'macro';

export interface RelevanceInput {
  /** Full text of the tweet or article headline + summary. */
  text: string;
  /** Handle or outlet label; resolved through the source registry. */
  source?: string | null;
  /** ISO timestamp of publication. Missing means "unknown age", not "now". */
  publishedAt?: string | null;
  /** Engagement counts, when available (tweets only). */
  engagement?: {
    likes?: number;
    retweets?: number;
    replies?: number;
  } | null;
}

export interface RelevanceResult {
  /** Final relevance in [0, 1]. */
  score: number;
  /** Strongest tier matched, or null when nothing matched. */
  tier: MatchTier | null;
  /** Terms that actually matched, for prompt explanations and debugging. */
  matchedTerms: string[];
  /** Human-readable factors, ordered by contribution. */
  reasons: string[];
  /** Component breakdown — exposed so tests can assert on the model, not just the total. */
  components: {
    base: number;
    credibility: number;
    freshness: number;
    engagement: number;
    negationPenalty: number;
  };
}

interface SymbolTaxonomy {
  /** Unambiguous references to this asset. */
  direct: string[];
  /** Ecosystem terms that imply the asset without naming it. */
  related: string[];
  /**
   * Terms that move this asset via macro channels. Shared across symbols on
   * purpose — a Fed decision genuinely moves both BTC and gold.
   */
  macro: string[];
  /**
   * Terms that must NOT lift this symbol even though they are crypto-adjacent.
   * This is the cross-domain suppression mechanism.
   */
  excluded: string[];
}

/* ------------------------------------------------------------------ *
 * Shared term sets
 * ------------------------------------------------------------------ */

/**
 * Macro terms that propagate across asset classes.
 *
 * These are the genuine cross-domain channels: monetary policy, inflation, and
 * geopolitical risk reprice crypto, metals, and FX simultaneously. Everything
 * outside this set is asset-specific by default.
 */
const MACRO_UNIVERSAL = [
  'federal reserve', 'fed ', 'fomc', 'interest rate', 'rate cut', 'rate hike',
  'inflation', 'cpi', 'ppi', 'jobs report', 'nonfarm', 'unemployment',
  'recession', 'stagflation', 'quantitative easing', 'tapering',
  'dxy', 'dollar index', 'treasury yield', 'bond yield',
  'tariff', 'trade war', 'sanctions', 'geopolitical', 'war', 'conflict',
  'risk-on', 'risk off', 'risk-off', 'liquidity crisis', 'black swan',
];

/** Terms that move the entire crypto complex regardless of individual asset. */
const CRYPTO_BETA = [
  'crypto market', 'cryptocurrency', 'digital asset', 'blockchain',
  'sec approval', 'sec lawsuit', 'regulation', 'regulatory', 'ban crypto',
  'crypto ban', 'stablecoin', 'defi', 'exchange hack', 'exchange outage',
  'liquidation', 'market crash', 'altcoin season',
];

/** Terms specific to crypto that must never lift a metals symbol. */
const CRYPTO_ONLY_EXCLUSIONS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'altcoin', 'defi',
  'nft', 'memecoin', 'staking', 'airdrop', 'halving', 'hashrate', 'mining rig',
];

/* ------------------------------------------------------------------ *
 * Symbol taxonomy
 * ------------------------------------------------------------------ */

/**
 * Term sets per traded symbol.
 *
 * Symbol list derived from logs/llm-prompts/: AVAX, BTC, DOGE, ETH, HYPE, SOL,
 * SUI, XAUT, XRP — all USDT-quoted.
 */
const TAXONOMY: Record<string, SymbolTaxonomy> = {
  BTC: {
    direct: ['bitcoin', 'btc', '$btc', 'satoshi', 'xbt'],
    related: [
      'etf', 'spot etf', 'ibit', 'halving', 'hashrate', 'mining', 'miner',
      'microstrategy', 'strategy inc', 'saylor', 'lightning network',
      'digital gold', 'store of value', 'ordinals',
    ],
    macro: [...MACRO_UNIVERSAL, ...CRYPTO_BETA],
    excluded: [],
  },
  ETH: {
    direct: ['ethereum', 'eth', '$eth', 'ether '],
    related: [
      'vitalik', 'layer 2', 'l2', 'rollup', 'arbitrum', 'optimism', 'base chain',
      'staking', 'validator', 'gas fee', 'eip', 'dencun', 'pectra', 'erc-20',
      'smart contract', 'merge',
    ],
    macro: [...MACRO_UNIVERSAL, ...CRYPTO_BETA],
    excluded: [],
  },
  SOL: {
    direct: ['solana', 'sol ', '$sol'],
    related: [
      'firedancer', 'jito', 'saga phone', 'phantom wallet', 'jupiter exchange',
      'solana outage', 'network halt', 'anatoly', 'raydium',
    ],
    macro: [...MACRO_UNIVERSAL, ...CRYPTO_BETA],
    excluded: [],
  },
  XRP: {
    direct: ['xrp', '$xrp', 'ripple'],
    related: [
      'ripple labs', 'odl', 'on-demand liquidity', 'garlinghouse',
      'xrp ledger', 'xrpl', 'sec v. ripple', 'cross-border payment',
    ],
    macro: [...MACRO_UNIVERSAL, ...CRYPTO_BETA],
    excluded: [],
  },
  DOGE: {
    direct: ['dogecoin', 'doge', '$doge'],
    related: ['memecoin', 'meme coin', 'shiba', 'elon', 'musk', 'x payments', 'tesla'],
    macro: [...MACRO_UNIVERSAL, ...CRYPTO_BETA],
    excluded: [],
  },
  AVAX: {
    direct: ['avalanche', 'avax', '$avax'],
    related: ['subnet', 'c-chain', 'ava labs', 'snowtrace'],
    macro: [...MACRO_UNIVERSAL, ...CRYPTO_BETA],
    excluded: [],
  },
  SUI: {
    direct: ['sui ', '$sui', 'sui network'],
    related: ['mysten labs', 'move language', 'walrus protocol'],
    macro: [...MACRO_UNIVERSAL, ...CRYPTO_BETA],
    excluded: [],
  },
  HYPE: {
    direct: ['hyperliquid', 'hype ', '$hype'],
    related: ['perp dex', 'perpetual dex', 'hyperevm', 'onchain perp'],
    macro: [...MACRO_UNIVERSAL, ...CRYPTO_BETA],
    excluded: [],
  },
  XAUT: {
    // Tether Gold — tracks physical gold, NOT the crypto complex.
    direct: ['gold', 'xau', 'xaut', 'bullion', 'tether gold', 'precious metal'],
    related: [
      'safe haven', 'central bank', 'reserves', 'gold reserve', 'comex',
      'lbma', 'silver', 'physical delivery', 'flight to safety',
    ],
    macro: MACRO_UNIVERSAL,
    // Crypto-native news must not lift gold. This is the exact cross-domain
    // case the user raised: a Bitcoin tweet should not surface for XAUT.
    excluded: CRYPTO_ONLY_EXCLUSIONS,
  },
};

/** Base weight contributed by each match tier. */
const TIER_BASE: Record<MatchTier, number> = {
  direct: 1.0,
  related: 0.55,
  macro: 0.3,
};

/** Freshness half-life in hours, per tier. Breaking news decays fastest. */
const HALF_LIFE_HOURS: Record<MatchTier, number> = {
  direct: 6,
  related: 12,
  macro: 24,
};

/**
 * Phrases that negate or hypothesise a nearby term.
 *
 * "No plans to ban crypto" matches 'ban crypto' but means the opposite. We do
 * not attempt full negation parsing — we damp the score so a negated match
 * cannot masquerade as a strong signal.
 */
const NEGATION_MARKERS = [
  'no plans to', 'not going to', 'will not', 'won\'t', 'denies', 'denied',
  'rumor', 'rumour', 'unconfirmed', 'speculation', 'allegedly', 'if approved',
  'could potentially', 'may consider', 'no evidence', 'debunked', 'false claim',
];

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Extract the base asset from a trading pair.
 * 'BTC/USDT' -> 'BTC', 'XAUT_USDT' -> 'XAUT', 'btc' -> 'BTC'
 */
export function extractBaseAsset(symbol: string): string {
  if (!symbol || typeof symbol !== 'string') return '';
  return symbol
    .trim()
    .toUpperCase()
    .split(/[/\-_:]/)[0]
    .replace(/USDT$|USD$|PERP$/, '')
    .trim();
}

/**
 * Count matches of a term list inside normalised text.
 *
 * Terms containing a trailing space (e.g. 'sol ', 'eth ') are matched as
 * written to avoid firing on substrings like 'solana' inside 'sol' or
 * 'ethereum' inside 'eth'. Short tickers are the main false-positive risk, so
 * they carry an explicit word boundary.
 */
function findMatches(text: string, terms: string[]): string[] {
  const hits: string[] = [];
  for (const term of terms) {
    const needle = term.toLowerCase();
    if (needle.length <= 4 && !needle.includes(' ')) {
      // Short ticker: require word boundaries so 'eth' does not match 'ethics'.
      const re = new RegExp(`(^|[^a-z0-9$])\\$?${needle}([^a-z0-9]|$)`, 'i');
      if (re.test(text)) hits.push(term.trim());
    } else if (text.includes(needle)) {
      hits.push(term.trim());
    }
  }
  return hits;
}

/** Exponential freshness decay. Unknown age is treated as moderately stale. */
function computeFreshness(publishedAt: string | null | undefined, tier: MatchTier): number {
  if (!publishedAt) return 0.5;

  const ts = Date.parse(publishedAt);
  if (!Number.isFinite(ts)) return 0.5;

  const ageHours = (Date.now() - ts) / 3_600_000;
  if (ageHours < 0) return 1; // Clock skew; treat as brand new.

  return clamp01(Math.exp(-ageHours / HALF_LIFE_HOURS[tier]));
}

/**
 * Log-scaled engagement in [0, 1].
 *
 * Raw counts span six orders of magnitude, so a linear scale would let one
 * viral post dominate everything. log10 compresses that: ~100 interactions
 * scores 0.4, ~10k scores 0.8, ~1M saturates at 1.0.
 */
function computeEngagement(engagement: RelevanceInput['engagement']): number {
  if (!engagement) return 0;

  const likes = Math.max(0, engagement.likes ?? 0);
  const retweets = Math.max(0, engagement.retweets ?? 0);
  const replies = Math.max(0, engagement.replies ?? 0);

  // Retweets signal propagation intent more strongly than passive likes.
  const weighted = likes + retweets * 3 + replies * 2;
  if (weighted <= 0) return 0;

  return clamp01(Math.log10(weighted + 1) / 6);
}

/** Fraction of confidence removed when a negation marker sits near a match. */
function computeNegationPenalty(text: string): number {
  const hits = NEGATION_MARKERS.filter((m) => text.includes(m));
  if (hits.length === 0) return 0;
  // Cap at 0.5: a negated statement is still topically relevant.
  return Math.min(0.5, hits.length * 0.25);
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Score how relevant an intelligence item is to a trading symbol.
 *
 * The composite model:
 *
 *   score = base × (0.45 + 0.25·credibility + 0.20·freshness + 0.10·engagement)
 *                × (1 − negationPenalty)
 *
 * The 0.45 floor guarantees a direct hit from an unknown, stale, zero-
 * engagement source still lands around 0.45 — visible but low priority. The
 * remaining 0.55 is distributed across the quality signals.
 */
export function scoreRelevance(input: RelevanceInput, symbol: string): RelevanceResult {
  const empty: RelevanceResult = {
    score: 0,
    tier: null,
    matchedTerms: [],
    reasons: [],
    components: { base: 0, credibility: 0, freshness: 0, engagement: 0, negationPenalty: 0 },
  };

  const rawText = typeof input?.text === 'string' ? input.text : '';
  if (!rawText.trim()) return empty;

  const asset = extractBaseAsset(symbol);
  const taxonomy = TAXONOMY[asset];
  if (!taxonomy) return empty;

  const text = rawText.toLowerCase();

  // Cross-domain suppression: excluded terms veto the item for this symbol
  // unless it also carries a genuine macro driver. A Bitcoin ETF story is
  // irrelevant to gold; a Fed decision mentioning Bitcoin is not.
  const excludedHits = findMatches(text, taxonomy.excluded);
  const macroHits = findMatches(text, taxonomy.macro);
  if (excludedHits.length > 0 && macroHits.length === 0) {
    return {
      ...empty,
      reasons: [`Excluded for ${asset}: matched ${excludedHits.slice(0, 3).join(', ')} with no macro driver`],
    };
  }

  const directHits = findMatches(text, taxonomy.direct);
  const relatedHits = findMatches(text, taxonomy.related);

  // Strongest tier wins; weaker tiers still contribute their terms as evidence.
  let tier: MatchTier | null = null;
  let matchedTerms: string[] = [];

  if (directHits.length > 0) {
    tier = 'direct';
    matchedTerms = [...directHits, ...relatedHits];
  } else if (relatedHits.length > 0) {
    tier = 'related';
    matchedTerms = relatedHits;
  } else if (macroHits.length > 0) {
    tier = 'macro';
    matchedTerms = macroHits;
  }

  if (!tier) return empty;

  let base = TIER_BASE[tier];

  /**
   * A macro statement from a market-moving account is not commentary ABOUT a
   * macro event — it IS the macro event. "Announcing new tariffs" from a head
   * of state reprices gold and risk assets directly, while the same words from
   * a news outlet merely report it. Upgrade the base to related-tier strength
   * so the origin of the shock ranks above coverage of the shock.
   */
  if (tier === 'macro' && isPrimaryMover(input.source)) {
    base = TIER_BASE.related;
  }

  // Multiple independent direct references raise confidence, with diminishing
  // returns so a keyword-stuffed post cannot game the ranking.
  if (tier === 'direct' && directHits.length > 1) {
    base = Math.min(1, base + (directHits.length - 1) * 0.05);
  }

  // An excluded term surviving to here means the item matched macro AND
  // carries off-domain content. Damp it: relevant, but diluted.
  if (excludedHits.length > 0) {
    base *= 0.6;
  }

  const credibility = getSourceWeight(input.source);
  const freshness = computeFreshness(input.publishedAt, tier);
  const engagement = computeEngagement(input.engagement);
  const negationPenalty = computeNegationPenalty(text);

  const quality =
    0.45 + 0.25 * credibility + 0.2 * freshness + 0.1 * engagement;

  let score = clamp01(base * quality * (1 - negationPenalty));

  // A market-moving account saying something directly on-topic is the highest
  // value signal available; make sure it clears the aggregator threshold even
  // when the post is a few hours old.
  if (tier === 'direct' && isPrimaryMover(input.source)) {
    score = Math.max(score, 0.6);
  }

  const reasons: string[] = [];
  reasons.push(`${tier} match: ${matchedTerms.slice(0, 4).join(', ')}`);
  if (credibility >= 0.8) reasons.push('high-credibility source');
  else if (credibility <= 0.4) reasons.push('unverified source');
  if (freshness >= 0.8) reasons.push('very recent');
  else if (freshness <= 0.25) reasons.push('stale');
  if (engagement >= 0.6) reasons.push('high engagement');
  if (negationPenalty > 0) reasons.push('hedged or negated phrasing');
  if (excludedHits.length > 0) reasons.push('partially off-domain');

  return {
    score: Number(score.toFixed(4)),
    tier,
    matchedTerms: Array.from(new Set(matchedTerms)),
    reasons,
    components: { base, credibility, freshness, engagement, negationPenalty },
  };
}

/** Symbols with a defined taxonomy. Used by the aggregator and by tests. */
export function listSupportedAssets(): string[] {
  return Object.keys(TAXONOMY);
}

/** True when the scorer knows how to handle this symbol. */
export function isSymbolSupported(symbol: string): boolean {
  return Boolean(TAXONOMY[extractBaseAsset(symbol)]);
}
