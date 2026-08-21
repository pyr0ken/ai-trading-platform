import { describe, it, expect, beforeEach } from 'vitest';
import {
  normaliseTweet,
  normaliseArticle,
  aggregateIntel,
  deduplicate,
  deriveAssetImpacts,
  IntelItem,
} from '@/lib/intel/intel-aggregator';
import { NewsArticle } from '@/types/news';

const now = () => new Date().toISOString();

describe('normaliseTweet', () => {
  it('converts a complete tweet', () => {
    const result = normaliseTweet({
      tweet_url: 'https://x.com/realDonaldTrump/status/123',
      text: 'Bitcoin is great',
      target_account: 'realDonaldTrump',
      timestamp: now(),
      like_count: 1000,
      retweet_count: 200,
      reply_count: 50,
    });
    expect(result).toBeTruthy();
    expect(result?.id).toContain('realDonaldTrump/status/123');
    expect(result?.engagement?.likes).toBe(1000);
  });

  it('returns null for a tweet without a URL', () => {
    expect(normaliseTweet({ text: 'No URL here' })).toBeNull();
  });

  it('returns null for a tweet without text', () => {
    expect(
      normaliseTweet({
        tweet_url: 'https://x.com/test/123',
        text: '',
        content_text: '',
      })
    ).toBeNull();
  });

  it('falls back to content_text when text is empty', () => {
    const result = normaliseTweet({
      tweet_url: 'https://x.com/test/123',
      text: '',
      content_text: 'Hello from content',
    });
    expect(result?.text).toBe('Hello from content');
  });

  it('handles missing or invalid engagement gracefully', () => {
    const result = normaliseTweet({
      tweet_url: 'https://x.com/test/123',
      text: 'No engagement data',
      like_count: -5,
      retweet_count: 'not a number',
    });
    expect(result?.engagement?.likes).toBe(0);
    expect(result?.engagement?.retweets).toBe(0);
  });
});

describe('normaliseArticle', () => {
  it('converts a complete article', () => {
    const result = normaliseArticle({
      title: 'Bitcoin ETF Approved',
      summary: 'The SEC gave the go-ahead',
      source: 'CoinDesk',
      url: 'https://coindesk.com/news/123',
      articleId: 'abc123',
      published_at: now(),
    });
    expect(result).toBeTruthy();
    expect(result?.text).toContain('Bitcoin ETF');
    expect(result?.text).toContain('SEC gave');
    expect(result?.source).toBe('CoinDesk');
  });

  it('returns null for an article without a title', () => {
    expect(normaliseArticle({ summary: 'No title' })).toBeNull();
  });

  it('uses the article ID as the dedup key when the URL is absent', () => {
    const result = normaliseArticle({
      title: 'Test',
      articleId: 'unique-id',
    });
    expect(result?.id).toBe('unique-id');
  });
});

describe('deduplicate', () => {
  it('removes near-identical stories', () => {
    // Two articles about the EXACT SAME story, just different wording.
    const items: IntelItem[] = [
      {
        id: '1',
        kind: 'article',
        text: 'Bitcoin hits a new record high reaching sixty thousand dollars today',
        source: 'CoinDesk',
        relevance: 0.9,
      },
      {
        id: '2',
        kind: 'article',
        text: 'Bitcoin hits a new record high as it reaches sixty thousand dollars',
        source: 'WatcherGuru',
        relevance: 0.85,
      },
      {
        id: '3',
        kind: 'article',
        text: 'Ethereum layer two Arbitrum updates its sequencer',
        source: 'TheBlock',
        relevance: 0.72,
      },
    ];

    const result = deduplicate(items, 0.6);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('1'); // Highest relevance survives
    expect(result[1].id).toBe('3'); // Unrelated item kept
  });

  it('keeps all items when nothing is similar', () => {
    const items: IntelItem[] = [
      { id: '1', kind: 'article', text: 'Bitcoin news', source: 'A', relevance: 0.8 },
      { id: '2', kind: 'article', text: 'Ethereum news', source: 'B', relevance: 0.7 },
      { id: '3', kind: 'article', text: 'Gold market analysis', source: 'C', relevance: 0.6 },
    ];

    const result = deduplicate(items);
    expect(result.length).toBe(3);
  });

  it('handles items with minimal text gracefully', () => {
    const items: IntelItem[] = [
      { id: '1', kind: 'tweet', text: '', source: 'A' },
      { id: '2', kind: 'article', text: 'Short', source: 'B', relevance: 0.5 },
    ];

    const result = deduplicate(items);
    expect(result.length).toBe(1);
  });
});

describe('deriveAssetImpacts', () => {
  it('creates an AssetImpact array with NEUTRAL when no sentiment is available', () => {
    const items: IntelItem[] = [
      {
        id: '1',
        kind: 'tweet',
        text: 'Bitcoin rallies past sixty thousand',
        source: 'lookonchain',
        relevance: 0.85,
      },
    ];

    const impacts = deriveAssetImpacts(items, 'BTC/USDT');
    expect(impacts.length).toBe(1);
    expect(impacts[0].asset).toBe('BTC');
    expect(impacts[0].impact).toBe('NEUTRAL');
    expect(impacts[0].magnitude).toBeGreaterThan(40);
  });

  it('derives BULLISH when articles have positive sentiment', () => {
    const items: IntelItem[] = [
      {
        id: '1',
        kind: 'article',
        text: 'Bitcoin ETF attracts massive inflows',
        source: 'CoinDesk',
        relevance: 0.92,
        sentiment: 0.7,
      },
    ];

    const impacts = deriveAssetImpacts(items, 'BTC/USDT');
    expect(impacts[0].impact).toBe('BULLISH');
  });

  it('derives BEARISH when sentiment is negative', () => {
    const items: IntelItem[] = [
      {
        id: '1',
        kind: 'article',
        text: 'Bitcoin under regulatory pressure',
        source: 'CoinDesk',
        relevance: 0.7,
        sentiment: -0.6,
      },
    ];

    const impacts = deriveAssetImpacts(items, 'BTC/USDT');
    expect(impacts[0].impact).toBe('BEARISH');
  });

  it('returns empty array when the symbol is unsupported', () => {
    const items: IntelItem[] = [
      {
        id: '1',
        kind: 'article',
        text: 'Some news',
        source: 'Any',
        relevance: 0.8,
      },
    ];

    const impacts = deriveAssetImpacts(items, 'FAKECOIN/USDT');
    expect(impacts).toEqual([]);
  });

  it('includes the source and matched text in the rationale', () => {
    const items: IntelItem[] = [
      {
        id: '1',
        kind: 'tweet',
        text: 'Bitcoin breaks technical resistance levels as institutions accumulate',
        source: 'CryptoHayes',
        relevance: 0.78,
      },
    ];

    const impacts = deriveAssetImpacts(items, 'BTC/USDT');
    expect(impacts[0].rationale).toContain('CryptoHayes');
    expect(impacts[0].rationale).toContain('Bitcoin breaks');
  });
});

describe('aggregateIntel', () => {
  it('scores and ranks items for a symbol', () => {
    const tweets = [
      {
        tweet_url: 'https://x.com/test/1',
        text: 'Bitcoin surges',
        target_account: 'lookonchain',
        timestamp: now(),
        like_count: 5000,
      },
    ];
    const articles = [
      {
        title: 'Gold prices spike',
        summary: 'Central banks accumulating bullion',
        source: 'Reuters',
        published_at: now(),
      } as NewsArticle,
    ];

    const result = aggregateIntel(tweets, articles, 'BTC/USDT');
    expect(result.symbol).toBe('BTC/USDT');
    expect(result.items.length).toBeGreaterThan(0);
    // The Bitcoin tweet should rank high; gold article should not appear.
    expect(result.items[0].text).toContain('Bitcoin');
  });

  it('filters items below the threshold', () => {
    const tweets = [
      {
        tweet_url: 'https://x.com/test/1',
        text: 'Random life update unrelated to assets',
        target_account: 'random',
        timestamp: now(),
      },
    ];

    const result = aggregateIntel(tweets, null, 'BTC/USDT', {
      threshold: 0.25,
    });
    expect(result.items.length).toBe(0);
  });

  it('respects the limit cap', () => {
    const tweets = Array.from({ length: 50 }, (_, i) => ({
      tweet_url: `https://x.com/test/${i}`,
      text: 'Bitcoin rallies',
      target_account: 'lookonchain',
      timestamp: now(),
    }));

    const result = aggregateIntel(tweets, null, 'BTC/USDT', { limit: 5 });
    expect(result.items.length).toBeLessThanOrEqual(5);
  });

  it('handles missing files gracefully', () => {
    const result = aggregateIntel(null, null, 'BTC/USDT');
    expect(result.items).toEqual([]);
    expect(result.assetImpacts).toEqual([]);
  });

  it('generates assetImpacts even when the LLM would return empty', () => {
    // This is the core bug fix: old deterministic fallback had empty assetImpacts.
    const tweets = [
      {
        tweet_url: 'https://x.com/test/1',
        text: 'Bitcoin hits new all-time high',
        target_account: 'CoinDesk',
        timestamp: now(),
      },
    ];

    const result = aggregateIntel(tweets, null, 'BTC/USDT');
    // Without Phase 3, assetImpacts would be [].
    expect(result.assetImpacts.length).toBeGreaterThan(0);
    expect(result.assetImpacts[0].asset).toBe('BTC');
  });

  it('deduplicates near-identical stories', () => {
    const tweets = [
      {
        tweet_url: 'https://x.com/test/1',
        text: 'Bitcoin hits new record high as institutions buy',
        target_account: 'lookonchain',
        timestamp: now(),
        like_count: 10000,
      },
    ];
    const articles = [
      {
        title: 'Bitcoin hits record high',
        summary: 'institutions accumulate aggressively',
        source: 'CoinDesk',
        published_at: now(),
      } as NewsArticle,
    ];

    const result = aggregateIntel(tweets, articles, 'BTC/USDT');
    // Should have only 1 item, not 2, because they report the same story.
    expect(result.items.length).toBeLessThanOrEqual(1);
  });

  it('tracks how many items were considered and kept', () => {
    const tweets = [
      {
        tweet_url: 'https://x.com/test/1',
        text: 'Bitcoin',
        target_account: 'a',
        timestamp: now(),
      },
      {
        tweet_url: 'https://x.com/test/2',
        text: 'Unrelated noise',
        target_account: 'b',
        timestamp: now(),
      },
    ];
    const articles = [
      {
        title: 'Gold rallies',
        source: 'Reuters',
      } as NewsArticle,
    ];

    const result = aggregateIntel(tweets, articles, 'BTC/USDT');
    expect(result.counts.tweets).toBe(2);
    expect(result.counts.articles).toBe(1);
    expect(result.counts.considered).toBeGreaterThan(0);
    expect(result.counts.kept).toBeLessThanOrEqual(result.counts.considered);
  });

  it('returns an empty result for an unsupported symbol', () => {
    const tweets = [
      {
        tweet_url: 'https://x.com/test/1',
        text: 'Any news',
        target_account: 'anyone',
      },
    ];

    const result = aggregateIntel(tweets, null, 'FAKECOIN/USDT');
    expect(result.items).toEqual([]);
    expect(result.assetImpacts).toEqual([]);
  });
});
