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
  normaliseTweet,
  RawTweet,
  IntelItem,
} from './intel-aggregator';
import { enrichIntel, EnrichedIntelItem } from './intel-enricher';
import { getSourceProfile, isPrimaryMover } from './source-registry';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** What gets attached to FullMarketContextPayload.socialIntel. */
export interface SocialIntelContext {
  symbol: string;
  /**
   * Asset-specific items: passed through the keyword relevance filter.
   * These are directly about the traded symbol.
   */
  items: EnrichedIntelItem[];
  /**
   * Macro shock items: from MACRO_SHOCK tier sources, bypassed keyword filter.
   * A war declaration, Fed rate decision, or sanctions order belongs here
   * even if it has zero asset-specific keywords.
   */
  macroShockItems: IntelItem[];
  /** LLM synthesis; empty string when enrichment did not run. */
  narrative: string;
  /** True when the optional LLM layer contributed. */
  enriched: boolean;
  /** Aggregation stats for provenance reporting. */
  counts: { tweets: number; articles: number; considered: number; kept: number; macroShock: number };
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

  // ── Layer 1: MACRO_SHOCK bypass ─────────────────────────────────────────
  // Tweets from MACRO_SHOCK tier sources skip the keyword relevance filter.
  // A Fed rate decision or war declaration has no crypto keywords but reprices
  // every asset. We keep all recent tweets (up to 48h) from these accounts and
  // put them in a dedicated context block so the model knows they are
  // unconditionally relevant.
  const macroShockItems: IntelItem[] = tweets
    .map(normaliseTweet)
    .filter((item): item is IntelItem => {
      if (!item) return false;
      const profile = getSourceProfile(item.source);
      return profile.tier === 'MACRO_SHOCK';
    });

  // ── Layer 2: Asset-specific pipeline ────────────────────────────────────
  // Non-MACRO_SHOCK tweets go through the full relevance filter. Only items
  // that score above the threshold (keyword + semantic match) reach the prompt.
  const nonMacroTweets = tweets.filter((raw) => {
    const source = (raw?.target_account || raw?.user || '').toLowerCase();
    return getSourceProfile(source).tier !== 'MACRO_SHOCK';
  });

  const aggregate = aggregateIntel(nonMacroTweets, articles ?? null, symbol);

  let items: EnrichedIntelItem[] = aggregate.items;
  let narrative = '';
  let enriched = false;

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
    macroShockItems,
    narrative,
    enriched,
    counts: {
      ...aggregate.counts,
      macroShock: macroShockItems.length,
    },
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
 * TWO-LAYER STRUCTURE
 * -------------------
 * Block 1 — MACRO SHOCK SIGNALS: tweets from MACRO_SHOCK tier sources.
 *   These bypass keyword filtering entirely. A Fed rate decision, war
 *   declaration, or sanctions order reprices all assets regardless of whether
 *   it contains the symbol name. The model MUST consider these before anything
 *   else, even if the content seems unrelated to the traded pair.
 *
 * Block 2 — ASSET-SPECIFIC SIGNALS: items that passed the keyword/semantic
 *   relevance filter for the specific symbol. These are directly about the
 *   traded asset.
 */
export function renderSocialIntelBlock(
  intel: SocialIntelContext | null | undefined,
  nowMs: number = Date.now()
): string {
  if (!intel) {
    return 'SOCIAL/X INTELLIGENCE: N/A (feed not configured)';
  }

  const hasMacro = intel.macroShockItems.length > 0;
  const hasAsset = intel.items.length > 0;

  if (!hasMacro && !hasAsset) {
    const scanned = intel.counts.tweets + intel.counts.articles;
    return (
      `SOCIAL/X INTELLIGENCE: no signal for ${intel.symbol} ` +
      `(${scanned} items scanned, none crossed the relevance threshold — ` +
      'absence of chatter is itself mild evidence of a quiet tape)'
    );
  }

  const lines: string[] = [];

  // ── Block 1: Macro Shock ────────────────────────────────────────────────
  if (hasMacro) {
    lines.push(
      `[MACRO SHOCK SIGNALS — ${intel.macroShockItems.length} item(s) from heads of state, ` +
      `central banks, and regulators; read regardless of keyword match; ` +
      `these are origin events, not coverage — they front-run price moves]`
    );
    for (const item of intel.macroShockItems) {
      const age = formatAge(item.publishedAt, nowMs);
      const e = item.engagement;
      const engStr = e && (e.likes > 0 || e.retweets > 0)
        ? ` | ${fmtN(e.likes)} likes, ${fmtN(e.retweets)} RT`
        : '';
      lines.push(`- @${item.source} | ${age}${engStr}`);
      lines.push(`  "${item.text.slice(0, 240)}${item.text.length > 240 ? '…' : ''}"`);
    }
    lines.push('');
  }

  // ── Block 2: Asset-specific ─────────────────────────────────────────────
  if (hasAsset) {
    lines.push(
      `[ASSET-SPECIFIC SIGNALS — ${intel.counts.kept} of ${intel.counts.considered} ` +
      `items passed relevance filter for ${intel.symbol}` +
      `${intel.enriched ? ' (LLM-interpreted)' : ''}]`
    );

    if (intel.narrative) {
      lines.push(`- Synthesis: ${intel.narrative}`);
    }

    for (const item of intel.items) {
      const mover = isPrimaryMover(item.source) ? ' [PRIMARY MOVER]' : '';
      const rel = item.relevance !== undefined ? ` (rel ${item.relevance.toFixed(2)})` : '';
      const age = formatAge(item.publishedAt, nowMs);
      const direction = item.directionHint ? ` | direction: ${item.directionHint}` : '';
      const e = item.engagement;
      const engStr = e && (e.likes > 0 || e.retweets > 0)
        ? ` | ${fmtN(e.likes)} likes, ${fmtN(e.retweets)} RT`
        : '';

      lines.push(
        `- [${item.kind === 'tweet' ? 'X' : 'NEWS'}] @${item.source}${mover}${rel} | ${age}${engStr}${direction}`
      );
      lines.push(`  "${item.text.slice(0, 220)}${item.text.length > 220 ? '…' : ''}"`);

      if (item.interpretation) {
        lines.push(`  → ${item.interpretation}`);
      }
    }
    lines.push('');
  }

  lines.push(
    '- Guidance: MACRO SHOCK items may reprice assets before any crypto keyword appears. ' +
    'ASSET-SPECIFIC items are directly relevant to the traded pair. ' +
    'Neither overrides technical structure or the no-trade gate on their own.'
  );

  return lines.join('\n');
}

function fmtN(n: number): string {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : String(n);
}

export { loadTweetFeed } from './intel-aggregator';
