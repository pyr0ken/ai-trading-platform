import { describe, it, expect } from 'vitest';
import {
  buildSocialIntel,
  renderSocialIntelBlock,
  SocialIntelContext,
} from '@/lib/intel/social-intel';
import { NewsArticle } from '@/types/news';

const now = () => new Date().toISOString();

// Helper: build an empty-but-valid SocialIntelContext for render tests.
function emptyContext(overrides: Partial<SocialIntelContext> = {}): SocialIntelContext {
  return {
    symbol: 'BTC/USDT',
    items: [],
    macroShockItems: [],
    narrative: '',
    enriched: false,
    counts: { tweets: 0, articles: 0, considered: 0, kept: 0, macroShock: 0 },
    generatedAt: now(),
    ...overrides,
  };
}

describe('buildSocialIntel', () => {
  it('routes MACRO_SHOCK accounts into macroShockItems, not items', async () => {
    const tweets = [
      {
        tweet_url: 'https://x.com/realDonaldTrump/status/111',
        text: 'Tariffs on steel effective next week',
        target_account: 'realDonaldTrump',
        timestamp: now(),
        like_count: 100_000,
        retweet_count: 20_000,
      },
    ];

    const context = await buildSocialIntel('XAUT/USDT', null, {
      tweetsOverride: tweets,
      skipEnrichment: true,
    });

    expect(context.symbol).toBe('XAUT/USDT');
    // Trump is MACRO_SHOCK — skips keyword filter, goes straight to macroShockItems.
    expect(context.macroShockItems.length).toBe(1);
    expect(context.macroShockItems[0].source).toBe('realDonaldTrump');
    // items only holds keyword-filtered non-MACRO_SHOCK results.
    expect(context.items.length).toBe(0);
    expect(context.enriched).toBe(false);
  });

  it('routes non-MACRO_SHOCK accounts through the relevance filter', async () => {
    const tweets = [
      {
        tweet_url: 'https://x.com/glassnode/status/222',
        text: 'BTC exchange outflow reaches 6-month high',
        target_account: 'glassnode',
        timestamp: now(),
        like_count: 5_000,
        retweet_count: 1_200,
      },
    ];

    const context = await buildSocialIntel('BTC/USDT', null, {
      tweetsOverride: tweets,
      skipEnrichment: true,
    });

    expect(context.macroShockItems.length).toBe(0);
    // glassnode passes the BTC keyword filter → lands in items.
    expect(context.items.length).toBe(1);
    expect(context.items[0].source).toBe('glassnode');
  });

  it('handles empty feeds gracefully', async () => {
    const context = await buildSocialIntel('BTC/USDT', null, {
      tweetsOverride: [],
      skipEnrichment: true,
    });

    expect(context.items).toEqual([]);
    expect(context.macroShockItems).toEqual([]);
    expect(context.counts.considered).toBe(0);
    expect(context.counts.macroShock).toBe(0);
  });
});

describe('renderSocialIntelBlock', () => {
  it('renders the MACRO SHOCK block when macroShockItems are present', () => {
    const ctx = emptyContext({
      symbol: 'XAUT/USDT',
      macroShockItems: [
        {
          id: 'ms1',
          kind: 'tweet',
          text: 'Tariffs on all imports starting monday',
          source: 'realDonaldTrump',
          publishedAt: now(),
          engagement: { likes: 100_000, retweets: 20_000, replies: 5_000 },
        },
      ],
      counts: { tweets: 1, articles: 0, considered: 0, kept: 0, macroShock: 1 },
    });

    const rendered = renderSocialIntelBlock(ctx);

    expect(rendered).toContain('MACRO SHOCK SIGNALS');
    expect(rendered).toContain('@realDonaldTrump');
    expect(rendered).toContain('Tariffs on all imports');
  });

  it('renders the ASSET-SPECIFIC block when items are present', () => {
    const ctx = emptyContext({
      symbol: 'XAUT/USDT',
      items: [
        {
          id: '1',
          kind: 'tweet',
          text: 'Gold ETF inflows at record high this week',
          source: 'glassnode',
          publishedAt: now(),
          relevance: 0.82,
          engagement: { likes: 3_000, retweets: 800, replies: 200 },
        },
      ],
      counts: { tweets: 1, articles: 0, considered: 1, kept: 1, macroShock: 0 },
    });

    const rendered = renderSocialIntelBlock(ctx);

    expect(rendered).toContain('ASSET-SPECIFIC SIGNALS');
    expect(rendered).toContain('@glassnode');
    expect(rendered).toContain('Gold ETF inflows');
  });

  it('renders a quiet-tape notice when both item lists are empty', () => {
    const ctx = emptyContext({
      counts: { tweets: 10, articles: 5, considered: 15, kept: 0, macroShock: 0 },
    });

    const rendered = renderSocialIntelBlock(ctx);
    expect(rendered).toContain('no signal');
  });

  it('renders a fallback line when intel is null', () => {
    const rendered = renderSocialIntelBlock(null);
    expect(rendered).toContain('N/A (feed not configured)');
  });

  it('guidance line is always present when there is content', () => {
    const ctx = emptyContext({
      macroShockItems: [
        {
          id: 'g1',
          kind: 'tweet',
          text: 'Fed holds rates unchanged',
          source: 'federalreserve',
          publishedAt: now(),
        },
      ],
      counts: { tweets: 1, articles: 0, considered: 0, kept: 0, macroShock: 1 },
    });

    const rendered = renderSocialIntelBlock(ctx);
    expect(rendered).toContain('Guidance');
    expect(rendered).toContain('no-trade gate');
  });
});
