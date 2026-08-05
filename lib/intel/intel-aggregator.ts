/**
 * Intelligence Aggregator
 *
 * Merges two independent feeds — scraped X/Twitter posts and RSS articles —
 * into one relevance-ranked list per trading symbol.
 *
 * WHAT THIS FIXES
 * ---------------
 * `buildFallbackBrief` in lib/news/news-intelligence.ts hardcodes
 * `affectedAssets: []` (line 301) and `assetImpacts: []` (line 330). The
 * deterministic path had no asset-mapping capability at all, so on the 67% of
 * runs where the Stage-1 LLM failed, the model received a brief with zero
 * asset linkage.
 *
 * This module computes those asset impacts deterministically. It cannot fail,
 * has no network dependency, and runs in single-digit milliseconds.
 *
 * DESIGN CONTRACT
 * ---------------
 * Every function here is TOTAL: missing files, malformed rows, absent fields,
 * and unsupported symbols all produce empty-but-valid output rather than
 * throwing. The aggregator sits on the critical path of every analysis, so a
 * bad tweet file must never break a trade decision.
 */

import { NewsArticle, AssetImpact, ImpactDirection } from '@/types/news';
import { scoreRelevance, isSymbolSupported, extractBaseAsset } from './relevance-scorer';
import { getSourceProfile } from './source-registry';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type IntelKind = 'tweet' | 'article';

/** A tweet row as exported by x_feed_engine's export_tweets_for_ai(). */
export interface RawTweet {
  target_account?: string;
  user?: string;
  tweet_url?: string;
  text?: string;
  content_text?: string;
  quoted_text?: string | null;
  timestamp?: string;
  is_pinned?: number | boolean;
  like_count?: number;
  retweet_count?: number;
  reply_count?: number;
  fetched_at?: string;
}

/** Normalised item, shared shape for tweets and articles. */
export interface IntelItem {
  id: string;
  kind: IntelKind;
  text: string;
  source: string;
  url?: string;
  publishedAt?: string;
  engagement?: { likes: number; retweets: number; replies: number };
  /** Populated by the scorer during ranking. */
  relevance?: number;
  matchedTerms?: string[];
  reasons?: string[];
  /** Lexicon sentiment carried over from the news pipeline, when present. */
  sentiment?: number;
}

export interface AggregateOptions {
  /** Minimum relevance to survive filtering. */
  threshold?: number;
  /** Maximum items returned. */
  limit?: number;
  /** Overrides Date.now() for deterministic tests. */
  nowMs?: number;
}

export interface AggregateResult {
  symbol: string;
  items: IntelItem[];
  assetImpacts: AssetImpact[];
  counts: { tweets: number; articles: number; considered: number; kept: number };
}

const DEFAULT_THRESHOLD = 0.25;
const DEFAULT_LIMIT = 8;

/* ------------------------------------------------------------------ *
 * Normalisation
 * ------------------------------------------------------------------ */

function safeString(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function safeCount(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Convert a scraped tweet row into an IntelItem.
 *
 * Returns null for rows with no usable text or no URL — the URL doubles as the
 * dedup key, so a row without one cannot be tracked.
 */
export function normaliseTweet(raw: RawTweet | null | undefined): IntelItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const url = safeString(raw.tweet_url);
  const text = safeString(raw.text) || safeString(raw.content_text);
  if (!url || !text) return null;

  const source = safeString(raw.target_account) || safeString(raw.user) || 'unknown';

  return {
    id: url,
    kind: 'tweet',
    text,
    source,
    url,
    publishedAt: safeString(raw.timestamp) || undefined,
    engagement: {
      likes: safeCount(raw.like_count),
      retweets: safeCount(raw.retweet_count),
      replies: safeCount(raw.reply_count),
    },
  };
}

/** Convert an RSS article into an IntelItem. */
export function normaliseArticle(article: NewsArticle | null | undefined): IntelItem | null {
  if (!article || typeof article !== 'object') return null;

  const title = safeString(article.title);
  if (!title) return null;

  const summary = safeString(article.summary);
  // Headline and summary are scored together: the summary often carries the
  // asset name when the headline is vague ("Regulator acts again").
  const text = summary ? `${title}. ${summary}` : title;

  return {
    id: safeString(article.articleId) || safeString(article.url) || title,
    kind: 'article',
    text,
    source: safeString(article.source, 'unknown'),
    url: safeString(article.url) || undefined,
    publishedAt: safeString(article.published_at) || undefined,
    sentiment: Number.isFinite(article.sentimentScore) ? article.sentimentScore : undefined,
  };
}

/* ------------------------------------------------------------------ *
 * Deduplication
 * ------------------------------------------------------------------ */

/** Cheap normalisation for near-duplicate detection. */
function fingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Jaccard similarity over word sets. */
function similarity(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter((w) => w.length > 3));
  const setB = new Set(b.split(' ').filter((w) => w.length > 3));
  if (setA.size === 0 || setB.size === 0) return 0;

  let shared = 0;
  for (const w of setA) if (setB.has(w)) shared++;

  return shared / (setA.size + setB.size - shared);
}

/**
 * Drop near-identical items, keeping the highest-scoring copy.
 *
 * The same story reaches us from CoinTelegraph, CoinDesk, and a tweet quoting
 * both. Without this, one event consumes three prompt slots and looks like
 * three independent confirmations to the model — a real risk of false
 * confidence.
 *
 * Expects items pre-sorted by descending relevance so the survivor is the best
 * copy.
 */
export function deduplicate(items: IntelItem[], sameStoryThreshold = 0.6): IntelItem[] {
  const kept: IntelItem[] = [];
  const prints: string[] = [];

  for (const item of items) {
    const fp = fingerprint(item.text);
    if (!fp) continue;

    let duplicate = false;
    for (const existing of prints) {
      if (similarity(fp, existing) >= sameStoryThreshold) {
        duplicate = true;
        break;
      }
    }

    if (!duplicate) {
      kept.push(item);
      prints.push(fp);
    }
  }

  return kept;
}

/* ------------------------------------------------------------------ *
 * Asset impact derivation
 * ------------------------------------------------------------------ */

/**
 * Map ranked items onto AssetImpact entries — the array the deterministic
 * fallback previously left empty.
 *
 * Direction comes from lexicon sentiment where available. Where it is not
 * (tweets carry no precomputed sentiment), the impact is reported as NEUTRAL
 * with a real magnitude: we are stating "this matters to the asset" without
 * claiming a direction we cannot justify. That is the honest position, and it
 * still gives the model something the old `[]` did not.
 */
export function deriveAssetImpacts(items: IntelItem[], symbol: string): AssetImpact[] {
  // Guard independently of aggregateIntel: this function is exported and must
  // hold its own contract when called directly.
  if (!isSymbolSupported(symbol)) return [];

  const asset = extractBaseAsset(symbol);
  if (!asset || items.length === 0) return [];

  let weightedSentiment = 0;
  let sentimentWeight = 0;
  let topRelevance = 0;
  let topItem: IntelItem | null = null;

  for (const item of items) {
    const rel = item.relevance ?? 0;
    if (rel > topRelevance) {
      topRelevance = rel;
      topItem = item;
    }
    if (typeof item.sentiment === 'number' && Number.isFinite(item.sentiment)) {
      weightedSentiment += item.sentiment * rel;
      sentimentWeight += rel;
    }
  }

  if (!topItem) return [];

  const netSentiment = sentimentWeight > 0 ? weightedSentiment / sentimentWeight : 0;

  let impact: ImpactDirection = 'NEUTRAL';
  if (netSentiment > 0.15) impact = 'BULLISH';
  else if (netSentiment < -0.15) impact = 'BEARISH';

  // Magnitude reflects how strongly the feed concerns this asset, scaled by
  // corroboration: three relevant items are stronger evidence than one.
  const corroboration = Math.min(1, items.length / 3);
  const magnitude = Math.round(
    Math.max(0, Math.min(100, topRelevance * 100 * (0.7 + 0.3 * corroboration)))
  );

  const sourceNote = getSourceProfile(topItem.source).tier;
  const rationale =
    `${items.length} relevant item(s); strongest from ${topItem.source} ` +
    `(${sourceNote}, relevance ${topRelevance.toFixed(2)}): ` +
    `${topItem.text.slice(0, 110)}${topItem.text.length > 110 ? '…' : ''}`;

  return [{ asset, impact, magnitude, rationale }];
}

/* ------------------------------------------------------------------ *
 * Main entry point
 * ------------------------------------------------------------------ */

/**
 * Rank all available intelligence for one symbol.
 *
 * Pipeline: normalise → score → threshold → sort → dedup → cap → derive impacts.
 */
export function aggregateIntel(
  tweets: RawTweet[] | null | undefined,
  articles: NewsArticle[] | null | undefined,
  symbol: string,
  options: AggregateOptions = {}
): AggregateResult {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const limit = options.limit ?? DEFAULT_LIMIT;

  const tweetList = Array.isArray(tweets) ? tweets : [];
  const articleList = Array.isArray(articles) ? articles : [];

  const empty: AggregateResult = {
    symbol,
    items: [],
    assetImpacts: [],
    counts: {
      tweets: tweetList.length,
      articles: articleList.length,
      considered: 0,
      kept: 0,
    },
  };

  // An unsupported symbol yields nothing rather than a misleading partial
  // result built from macro terms alone.
  if (!isSymbolSupported(symbol)) return empty;

  const normalised: IntelItem[] = [];
  for (const t of tweetList) {
    const item = normaliseTweet(t);
    if (item) normalised.push(item);
  }
  for (const a of articleList) {
    const item = normaliseArticle(a);
    if (item) normalised.push(item);
  }

  const scored: IntelItem[] = [];
  for (const item of normalised) {
    const result = scoreRelevance(
      {
        text: item.text,
        source: item.source,
        publishedAt: item.publishedAt,
        engagement: item.engagement
          ? {
              likes: item.engagement.likes,
              retweets: item.engagement.retweets,
              replies: item.engagement.replies,
            }
          : null,
      },
      symbol
    );

    if (result.score < threshold) continue;

    scored.push({
      ...item,
      relevance: result.score,
      matchedTerms: result.matchedTerms,
      reasons: result.reasons,
    });
  }

  // Sort before dedup so the highest-scoring copy of a story survives.
  scored.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));

  const deduped = deduplicate(scored);
  const capped = deduped.slice(0, limit);

  return {
    symbol,
    items: capped,
    assetImpacts: deriveAssetImpacts(capped, symbol),
    counts: {
      tweets: tweetList.length,
      articles: articleList.length,
      considered: normalised.length,
      kept: capped.length,
    },
  };
}

/**
 * Load the tweet feed exported by x_feed_engine.
 *
 * Server-side only. A missing or malformed file is normal (the scraper may not
 * have run yet) and yields an empty array — never an exception.
 */
export async function loadTweetFeed(feedPath?: string): Promise<RawTweet[]> {
  if (typeof window !== 'undefined') return [];

  const path = feedPath || process.env.X_FEED_PATH;
  if (!path) return [];

  try {
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(path, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Absent file, bad JSON, permissions — all non-fatal by design.
    return [];
  }
}
