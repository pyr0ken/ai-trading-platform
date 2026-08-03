/**
 * News Relevance Engine
 *
 * Decides WHICH articles matter for a SPECIFIC traded symbol, and how much.
 *
 * The problem this solves (observed in a real prompt log): analysing XAUT/USDT
 * (tokenised gold, BTC correlation 0.173) the model received five Bitcoin/
 * exchange-IPO headlines and zero gold, DXY, Treasury-yield or Fed items.
 * That is 100% noise on the one input that is supposed to carry macro context.
 *
 * Scoring model (all deterministic, no LLM):
 *   relevance = directMatch + sectorMatch + macroBase + categoryBoost
 *   then scaled by correlationFactor when the article is about a *different*
 *   asset whose moves only matter to the traded symbol through correlation.
 *
 * ZERO-FABRICATION: when we cannot establish relevance we return a low score
 * and let the caller drop the article, rather than inventing a connection.
 */

import { NewsArticle, NewsCategory } from '@/types/news';

/**
 * Keyword profile for an asset family. `tickers` are matched with word
 * boundaries (so "SOL" does not match "solution"); `terms` are plain
 * substrings safe to match loosely.
 */
interface AssetProfile {
  /** Canonical family name, used for grouping and diagnostics. */
  family: string;
  /** Ticker-like tokens requiring word-boundary matching. */
  tickers: string[];
  /** Free-text terms safe for substring matching. */
  terms: string[];
  /**
   * Macro themes that move this asset. Used to decide whether a `macro`
   * article is relevant and in which direction it should be weighted.
   */
  macroThemes: string[];
  /**
   * How strongly generic "crypto market" news applies to this asset.
   * Gold-backed tokens barely care about crypto-native narratives.
   */
  cryptoBetaWeight: number;
}

const ASSET_PROFILES: AssetProfile[] = [
  {
    family: 'GOLD',
    tickers: ['XAUT', 'PAXG', 'XAU'],
    terms: ['gold', 'bullion', 'precious metal', 'tether gold', 'paxos gold'],
    macroThemes: [
      'treasury yield',
      'real yield',
      'bond yield',
      'dxy',
      'dollar index',
      'federal reserve',
      'fed ',
      'interest rate',
      'rate cut',
      'rate hike',
      'inflation',
      'cpi',
      'safe haven',
      'geopolitical',
      'central bank',
    ],
    cryptoBetaWeight: 0.25,
  },
  {
    family: 'BITCOIN',
    tickers: ['BTC', 'XBT'],
    terms: ['bitcoin', 'satoshi', 'halving', 'spot etf', 'bitcoin etf'],
    macroThemes: [
      'federal reserve',
      'fed ',
      'interest rate',
      'rate cut',
      'rate hike',
      'inflation',
      'cpi',
      'liquidity',
      'dxy',
      'dollar index',
      'risk asset',
      'nasdaq',
      's&p 500',
    ],
    cryptoBetaWeight: 1.0,
  },
  {
    family: 'ETHEREUM',
    tickers: ['ETH'],
    terms: ['ethereum', 'ether', 'erc-20', 'evm', 'layer 2', 'rollup', 'staking'],
    macroThemes: ['federal reserve', 'interest rate', 'inflation', 'liquidity', 'risk asset'],
    cryptoBetaWeight: 1.0,
  },
  {
    family: 'SOLANA',
    tickers: ['SOL'],
    terms: ['solana', 'phantom wallet', 'jito'],
    macroThemes: ['liquidity', 'risk asset', 'interest rate'],
    cryptoBetaWeight: 1.0,
  },
  {
    family: 'MEME',
    tickers: ['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK'],
    terms: ['dogecoin', 'shiba inu', 'meme coin', 'memecoin'],
    macroThemes: ['risk asset', 'liquidity', 'retail'],
    cryptoBetaWeight: 1.0,
  },
  {
    family: 'STABLECOIN',
    tickers: ['USDT', 'USDC', 'DAI'],
    terms: ['tether', 'circle', 'stablecoin', 'usdc', 'reserves attestation'],
    macroThemes: ['treasury yield', 'interest rate', 'regulation', 'banking'],
    cryptoBetaWeight: 0.6,
  },
];

/** Fallback profile for symbols we have no explicit mapping for. */
const GENERIC_ALTCOIN_PROFILE: AssetProfile = {
  family: 'GENERIC_ALT',
  tickers: [],
  terms: [],
  macroThemes: ['liquidity', 'risk asset', 'interest rate', 'federal reserve'],
  cryptoBetaWeight: 1.0,
};

/** Terms that indicate broad crypto-market news (not asset specific). */
const CRYPTO_MARKET_TERMS = [
  'crypto market',
  'cryptocurrency',
  'digital asset',
  'altcoin',
  'total market cap',
  'crypto etf',
  'exchange',
  'defi',
];

/**
 * Category-level relevance floor. `breaking` and `macro` are never dropped
 * outright — a market-wide shock matters to every symbol.
 */
const CATEGORY_BASE_RELEVANCE: Record<NewsCategory, number> = {
  breaking: 45,
  macro: 35,
  regulatory: 25,
  market: 20,
  protocol: 10,
  general: 5,
};

/**
 * Extract the base asset from a trading pair, e.g. "XAUT/USDT" -> "XAUT".
 * Handles both "/" and "-" separators and bare symbols.
 */
export function extractBaseAsset(symbol: string): string {
  if (!symbol) return '';
  const normalised = symbol.toUpperCase().replace('-', '/');
  const [base] = normalised.split('/');
  return (base || normalised).trim();
}

/**
 * Resolve the asset profile for a traded symbol.
 * Never returns null — unknown symbols get the generic altcoin profile so
 * macro/breaking news still reaches them.
 */
export function resolveAssetProfile(symbol: string): AssetProfile {
  const base = extractBaseAsset(symbol);
  if (!base) return GENERIC_ALTCOIN_PROFILE;

  for (const profile of ASSET_PROFILES) {
    if (profile.tickers.includes(base)) return profile;
  }
  return GENERIC_ALTCOIN_PROFILE;
}

/**
 * Word-boundary ticker match. Prevents "SOL" matching "solution" or
 * "ETH" matching "ethics".
 */
function containsTicker(text: string, ticker: string): boolean {
  if (!ticker) return false;
  const pattern = new RegExp(`\\b${ticker.toLowerCase()}\\b`);
  return pattern.test(text);
}

/** Count how many entries of `needles` appear as substrings in `text`. */
function countTermHits(text: string, needles: string[]): number {
  let hits = 0;
  for (const n of needles) {
    if (n && text.includes(n)) hits += 1;
  }
  return hits;
}

/** Detailed relevance breakdown for one (article, symbol) pair. */
export interface RelevanceResult {
  /** Final relevance score in [0..100]. */
  score: number;
  /** True when the article names the traded asset directly. */
  isDirectMatch: boolean;
  /** True when the article is macro/market-wide rather than asset specific. */
  isMacro: boolean;
  /** True when relevance flows only through BTC correlation. */
  isCorrelationDerived: boolean;
  /** Human-readable reason, surfaced in the prompt for auditability. */
  reason: string;
}

/**
 * Score how relevant a single article is to a specific traded symbol.
 *
 * @param article the news article
 * @param symbol traded pair, e.g. "XAUT/USDT"
 * @param btcCorrelation Pearson correlation of symbol vs BTC in [-1..1].
 *        Used to discount Bitcoin-specific news for weakly-correlated assets.
 *        Pass 1.0 when the traded symbol IS Bitcoin.
 */
export function scoreArticleRelevance(
  article: NewsArticle,
  symbol: string,
  btcCorrelation: number
): RelevanceResult {
  const text = `${article.title || ''} ${article.summary || ''}`.toLowerCase();
  if (!text.trim()) {
    return {
      score: 0,
      isDirectMatch: false,
      isMacro: false,
      isCorrelationDerived: false,
      reason: 'empty article text',
    };
  }

  const profile = resolveAssetProfile(symbol);
  const base = extractBaseAsset(symbol);
  const category = (article.category || 'general') as NewsCategory;

  const reasons: string[] = [];
  let score = CATEGORY_BASE_RELEVANCE[category] ?? CATEGORY_BASE_RELEVANCE.general;

  // Crypto-native regulatory/protocol news is only partially relevant to assets
  // whose price driver sits outside crypto (e.g. tokenised gold tracks real
  // yields, not the CLARITY Act). Scale the category floor by crypto beta.
  if ((category === 'regulatory' || category === 'protocol') && profile.cryptoBetaWeight < 1) {
    score *= profile.cryptoBetaWeight;
    reasons.push(`crypto-native category scaled by beta ${profile.cryptoBetaWeight}`);
  }

  // 1. Direct asset match — the article explicitly names this asset.
  const tickerHit =
    containsTicker(text, base) || profile.tickers.some((t) => containsTicker(text, t));
  const termHits = countTermHits(text, profile.terms);
  const isDirectMatch = tickerHit || termHits > 0;

  if (isDirectMatch) {
    score += 50 + Math.min(termHits, 3) * 5;
    reasons.push('direct asset mention');
  }

  // 2. Macro theme match — themes that provably move this asset family.
  const macroHits = countTermHits(text, profile.macroThemes);
  const isMacro = macroHits > 0 || category === 'macro';
  if (macroHits > 0) {
    score += Math.min(macroHits, 4) * 10;
    reasons.push(`${macroHits} macro theme${macroHits > 1 ? 's' : ''}`);
  }

  // 3. Broad crypto-market news, scaled by how much this asset tracks crypto beta.
  const cryptoMarketHits = countTermHits(text, CRYPTO_MARKET_TERMS);
  if (cryptoMarketHits > 0) {
    const contribution = Math.min(cryptoMarketHits, 3) * 8 * profile.cryptoBetaWeight;
    score += contribution;
    if (profile.cryptoBetaWeight < 0.5) {
      reasons.push(`crypto-market news discounted (beta ${profile.cryptoBetaWeight})`);
    } else {
      reasons.push('crypto-market relevance');
    }
  }

  // 4. Bitcoin-specific news reaching a non-Bitcoin asset only via correlation.
  let isCorrelationDerived = false;
  const mentionsBitcoin =
    containsTicker(text, 'btc') || text.includes('bitcoin');
  const tradedIsBitcoin = profile.family === 'BITCOIN';

  if (mentionsBitcoin && !tradedIsBitcoin && !isDirectMatch) {
    isCorrelationDerived = true;
    const absCorr = Math.min(1, Math.abs(btcCorrelation));
    const correlationContribution = 40 * absCorr;
    score += correlationContribution;
    reasons.push(`BTC-linked via correlation ${btcCorrelation.toFixed(2)}`);

    // Weak correlation actively suppresses: BTC noise must not dominate
    // a gold token's context just because it cleared the category floor.
    if (absCorr < 0.3) {
      score *= 0.5;
      reasons.push('suppressed: weak BTC correlation');
    }
  }

  // 5. Breaking news floor — a market-wide shock is always worth surfacing.
  if (category === 'breaking') {
    score = Math.max(score, 55);
    reasons.push('breaking floor applied');
  }

  return {
    score: Number(Math.max(0, Math.min(100, score)).toFixed(1)),
    isDirectMatch,
    isMacro,
    isCorrelationDerived,
    reason: reasons.join('; ') || 'category baseline only',
  };
}

/** An article enriched with its relevance and effective weight for a symbol. */
export interface RankedArticle {
  article: NewsArticle;
  relevance: RelevanceResult;
  /** Time-decay multiplier applied for this article's category. */
  timeDecay: number;
  /**
   * Final ranking weight combining relevance and freshness in [0..100].
   * This is what ordering and inclusion decisions are based on.
   */
  effectiveWeight: number;
}

/** Minimum effective weight for an article to reach the LLM prompt. */
export const MIN_EFFECTIVE_WEIGHT = 18;
