import { describe, it, expect } from 'vitest';
import {
  buildSocialIntel,
  renderSocialIntelBlock,
  SocialIntelContext,
} from '@/lib/intel/social-intel';
import { NewsArticle } from '@/types/news';

const now = () => new Date().toISOString();

describe('buildSocialIntel', () => {
  it('builds context from raw tweets and articles without LLM enrichment', async () => {
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
    expect(context.items.length).toBe(1);
    expect(context.enriched).toBe(false);
    expect(context.items[0].source).toBe('realDonaldTrump');
  });

  it('handles empty feeds gracefully', async () => {
    const context = await buildSocialIntel('BTC/USDT', null, {
      tweetsOverride: [],
      skipEnrichment: true,
    });

    expect(context.items).toEqual([]);
    expect(context.counts.considered).toBe(0);
  });
});

describe('renderSocialIntelBlock', () => {
  it('renders a full prompt block with primary mover tags', () => {
    const mockContext: SocialIntelContext = {
      symbol: 'XAUT/USDT',
      items: [
        {
          id: '1',
          kind: 'tweet',
          text: 'Tariffs on all imports starting monday',
          source: 'realDonaldTrump',
          publishedAt: now(),
          relevance: 0.85,
          engagement: { likes: 100_000, retweets: 20_000, replies: 5000 },
        },
      ],
      narrative: '',
      enriched: false,
      counts: { tweets: 1, articles: 0, considered: 1, kept: 1 },
      generatedAt: now(),
    };

    const rendered = renderSocialIntelBlock(mockContext);

    expect(rendered).toContain('SOCIAL/X INTELLIGENCE');
    expect(rendered).toContain('PRIMARY MOVER');
    expect(rendered).toContain('@realDonaldTrump');
    expect(rendered).toContain('Tariffs on all imports');
  });

  it('renders a quiet-tape notice when no items clear the threshold', () => {
    const mockContext: SocialIntelContext = {
      symbol: 'BTC/USDT',
      items: [],
      narrative: '',
      enriched: false,
      counts: { tweets: 10, articles: 5, considered: 15, kept: 0 },
      generatedAt: now(),
    };

    const rendered = renderSocialIntelBlock(mockContext);
    expect(rendered).toContain('no relevant signal');
    expect(rendered).toContain('15 items scanned');
  });

  it('renders a fallback line when intel is null', () => {
    const rendered = renderSocialIntelBlock(null);
    expect(rendered).toContain('N/A (feed not configured)');
  });
});
