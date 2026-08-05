/**
 * Social Intel — orchestrates the intel pipeline for one symbol and renders
 * the prompt block.
 *
 * PIPELINE
 * --------
 *   loadTweetFeed()  ──┐
 *                      ├── aggregateIntel()  → deterministic, cannot fail
 *   news articles   ──┘         │
 *                               ▼
 *                     enrichIntel()          → optional LLM, failure = no-op
 *                               │
 *                               ▼
 *                     renderSocialIntelBlock() → prompt text
 *
 * The rendered block is separate from the RSS news brief on purpose: tweets
 * from primary movers are the ORIGIN of shocks (pre-publication), while news
 * articles are coverage (post-publication). The model is told which is which.
 */

import { NewsArticle } from '@/types/news';
import {
  aggregateIntel,
  loadTweetFeed,
  RawTweet,
} from './intel-aggregator';
import { enrichIntel, EnrichedIntelItem } from './intel-enricher';
import { isPrimaryMover } from './source-registry';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** What gets attached to FullMarketContextPayload.socialIntel. */
export interface SocialIntelContext {
  symbol: string;
  items: EnrichedIntelItem[];
  /** LLM synthesis; empty string when enrichment did not run. */
  narrative: string;
  /** True when the optional LLM layer contributed. */
  enriched: boolean;
  /** Aggregation stats for provenance reporting. */
  counts: { tweets: number; articles: number; considered: number; kept: number };
  generatedAt: string;
}

export interface BuildSocialIntelOptions {
  /** Path to tweets_ai_feed.json; defaults to X_FEED_PATH env. */
  feedPath?: string;
  /** Skip the LLM layer entirely (deterministic-only mode). */
  skipEnrichment?: boolean;
  /** Forwarded to enrichIntel. */
  timeoutMs?: number;
  /** Injectable for tests. */
  tweetsOverride?: RawTweet[];
}

/* ------------------------------------------------------------------ *
 * Builder
 * ------------------------------------------------------------------ */

/**
 * Build the social intelligence context for a symbol.
 *
 * NEVER throws. Worst case is a context with zero items, which renders as an
 * honest "no relevant social signal" line rather than disappearing silently.
 */
export async function buildSocialIntel(
  symbol: string,
  articles: NewsArticle[] | null | undefined,
  options: BuildSocialIntelOptions = {}
): Promise<SocialIntelContext> {
  const generatedAt = new Date().toISOString();

  let tweets: RawTweet[] = [];
  try {
    tweets = options.tweetsOverride ?? (await loadTweetFeed(options.feedPath));
  } catch {
    tweets = [];
  }

  // Deterministic core: rank and filter. This is the part that cannot fail.
  const aggregate = aggregateIntel(tweets, articles ?? null, symbol);

  let items: EnrichedIntelItem[] = aggregate.items;
  let narrative = '';
  let enriched = false;

  // Optional LLM interpretation on top. Failure leaves the ranking untouched.
  if (!options.skipEnrichment && aggregate.items.length > 0) {
    const enrichment = await enrichIntel(aggregate.items, symbol, {
      timeoutMs: options.timeoutMs,
    });
    items = enrichment.items;
    narrative = enrichment.narrative;
    enriched = enrichment.enriched;
  }

  const context: SocialIntelContext = {
    symbol,
    items,
    narrative,
    enriched,
    counts: aggregate.counts,
    generatedAt,
  };

  // Log execution run to logs/x-intel/
  if (typeof window === 'undefined') {
    try {
      const fs = await import('node:fs/promises');
      const pathModule = await import('node:path');
      const logDir = pathModule.resolve(process.cwd(), 'logs', 'x-intel');
      await fs.mkdir(logDir, { recursive: true });
      const sanitizeSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '_');
      const logPath = pathModule.join(logDir, `intel_run_${sanitizeSymbol}.json`);
      await fs.writeFile(logPath, JSON.stringify(context, null, 2), 'utf-8');
    } catch {}
  }

  return context;
}

/* ------------------------------------------------------------------ *
 * Prompt rendering
 * ------------------------------------------------------------------ */

function formatAge(publishedAt: string | undefined, nowMs: number): string {
  if (!publishedAt) return 'age unknown';

  const ts = Date.parse(publishedAt);
  if (!Number.isFinite(ts)) return 'age unknown';

  const minutes = Math.max(0, Math.round((nowMs - ts) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

function formatEngagement(item: EnrichedIntelItem): string {
  const e = item.engagement;
  if (!e || (e.likes === 0 && e.retweets === 0)) return '';

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  return ` | ${fmt(e.likes)} likes, ${fmt(e.retweets)} RT`;
}

/**
 * Render the social intel block for the institutional prompt.
 *
 * Kept deliberately compact: at the default cap of 8 items this stays under
 * ~1.5K tokens, a fraction of the candle payload. Provenance is stated on
 * every line so the model can weigh a head-of-state post against an
 * aggregator repost.
 */
export function renderSocialIntelBlock(
  intel: SocialIntelContext | null | undefined,
  nowMs: number = Date.now()
): string {
  if (!intel) {
    return 'SOCIAL/X INTELLIGENCE: N/A (feed not configured)';
  }

  if (intel.items.length === 0) {
    const scanned = intel.counts.tweets + intel.counts.articles;
    return (
      `SOCIAL/X INTELLIGENCE: no relevant signal for ${intel.symbol} ` +
      `(${scanned} items scanned, none crossed the relevance threshold — ` +
      'absence of chatter is itself mild evidence of a quiet tape)'
    );
  }

  const lines: string[] = [];

  lines.push(
    `SOCIAL/X INTELLIGENCE (deterministic relevance ranking${intel.enriched ? ' + LLM interpretation' : ''}; ` +
      `${intel.counts.kept} of ${intel.counts.considered} items kept for ${intel.symbol}):`
  );

  if (intel.narrative) {
    lines.push(`- Synthesis: ${intel.narrative}`);
  }

  for (const item of intel.items) {
    const mover = isPrimaryMover(item.source) ? ' [PRIMARY MOVER — origin of shocks, not coverage]' : '';
    const rel = item.relevance !== undefined ? ` (relevance ${item.relevance.toFixed(2)})` : '';
    const age = formatAge(item.publishedAt, nowMs);
    const direction = item.directionHint ? ` | direction: ${item.directionHint}` : '';

    lines.push(
      `- [${item.kind === 'tweet' ? 'X' : 'NEWS'}] @${item.source}${mover}${rel} | ${age}${formatEngagement(item)}${direction}`
    );
    lines.push(`  "${item.text.slice(0, 220)}${item.text.length > 220 ? '…' : ''}"`);

    if (item.interpretation) {
      lines.push(`  → ${item.interpretation}`);
    }
  }

  lines.push(
    '- Guidance: social items are context, not signals. A PRIMARY MOVER post may front-run price; ' +
      'media coverage usually trails it. Never override structure or the no-trade gate on social chatter alone.'
  );

  return lines.join('\n');
}

export { loadTweetFeed } from './intel-aggregator';
