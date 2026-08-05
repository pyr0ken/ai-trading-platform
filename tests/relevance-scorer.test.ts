import { describe, it, expect } from 'vitest';
import {
  scoreRelevance,
  extractBaseAsset,
  isSymbolSupported,
  listSupportedAssets,
  RelevanceInput,
} from '@/lib/intel/relevance-scorer';

/** Fresh timestamp so freshness decay does not skew assertions. */
const now = () => new Date().toISOString();

function item(text: string, over: Partial<RelevanceInput> = {}): RelevanceInput {
  return { text, source: 'CoinDesk', publishedAt: now(), ...over };
}

describe('extractBaseAsset', () => {
  it('handles the pair shapes used across the codebase', () => {
    expect(extractBaseAsset('BTC/USDT')).toBe('BTC');
    expect(extractBaseAsset('XAUT_USDT')).toBe('XAUT');
    expect(extractBaseAsset('sol-usdt')).toBe('SOL');
    expect(extractBaseAsset('ETH')).toBe('ETH');
  });

  it('returns empty string for junk instead of throwing', () => {
    expect(extractBaseAsset('')).toBe('');
    expect(extractBaseAsset(null as unknown as string)).toBe('');
  });
});

describe('cross-domain suppression — the core requirement', () => {
  /**
   * The scenario the user raised: a Bitcoin tweet must not surface as context
   * for a gold position. Previously every item reached every symbol.
   */
  it('keeps a pure Bitcoin story away from gold', () => {
    const tweet = item('Bitcoin ETF inflows hit a record high this week as BTC rallies', {
      source: 'CoinDesk',
    });

    const btc = scoreRelevance(tweet, 'BTC/USDT');
    const xaut = scoreRelevance(tweet, 'XAUT/USDT');

    expect(btc.score).toBeGreaterThan(0.6);
    expect(xaut.score).toBeLessThan(0.2);
    expect(btc.score).toBeGreaterThan(xaut.score * 3);
  });

  it('lets a genuine macro driver reach BOTH crypto and metals', () => {
    // Tariffs move gold (safe haven) and crypto (risk asset) simultaneously.
    const tweet = item(
      'Announcing sweeping new tariffs on all imports effective immediately',
      { source: 'realDonaldTrump', engagement: { likes: 220_000, retweets: 55_000 } }
    );

    const xaut = scoreRelevance(tweet, 'XAUT/USDT');
    const btc = scoreRelevance(tweet, 'BTC/USDT');

    expect(xaut.score).toBeGreaterThan(0.35);
    expect(btc.score).toBeGreaterThan(0.35);
  });

  it('scores a Solana outage high for SOL and low for BTC', () => {
    const tweet = item('Solana network halt confirmed, validators coordinating restart', {
      source: 'lookonchain',
    });

    const sol = scoreRelevance(tweet, 'SOL/USDT');
    const btc = scoreRelevance(tweet, 'BTC/USDT');

    expect(sol.score).toBeGreaterThan(0.6);
    expect(sol.score).toBeGreaterThan(btc.score);
  });

  it('ignores genuinely unrelated content for every symbol', () => {
    const tweet = item('Starship completed its static fire test at Starbase today', {
      source: 'elonmusk',
    });

    for (const sym of ['BTC/USDT', 'XAUT/USDT', 'SOL/USDT', 'ETH/USDT']) {
      expect(scoreRelevance(tweet, sym).score).toBeLessThan(0.2);
    }
  });
});

describe('match tiers', () => {
  it('rates a direct mention above an ecosystem mention', () => {
    const direct = scoreRelevance(item('Bitcoin breaks above resistance'), 'BTC/USDT');
    const related = scoreRelevance(item('Hashrate reaches a new all-time high'), 'BTC/USDT');

    expect(direct.tier).toBe('direct');
    expect(related.tier).toBe('related');
    expect(direct.score).toBeGreaterThan(related.score);
  });

  it('rates an ecosystem mention above a macro-only mention', () => {
    const related = scoreRelevance(item('Hashrate reaches a new all-time high'), 'BTC/USDT');
    const macro = scoreRelevance(item('Fed holds interest rate steady'), 'BTC/USDT');

    expect(macro.tier).toBe('macro');
    expect(related.score).toBeGreaterThan(macro.score);
  });

  it('reports which terms matched', () => {
    const r = scoreRelevance(item('Ethereum staking withdrawals hit a new high'), 'ETH/USDT');
    expect(r.matchedTerms.length).toBeGreaterThan(0);
    expect(r.matchedTerms.join(' ').toLowerCase()).toContain('ethereum');
  });
});

describe('short-ticker false positives', () => {
  it('does not match ETH inside an unrelated word', () => {
    const r = scoreRelevance(item('The committee published new ethics guidelines'), 'ETH/USDT');
    expect(r.tier).not.toBe('direct');
  });

  it('does not match SOL inside "solar"', () => {
    const r = scoreRelevance(item('Solar panel installations grew 40% this year'), 'SOL/USDT');
    expect(r.tier).not.toBe('direct');
  });

  it('still matches a cashtag', () => {
    const r = scoreRelevance(item('Loading up on $BTC here'), 'BTC/USDT');
    expect(r.tier).toBe('direct');
  });
});

describe('source credibility', () => {
  it('ranks the same text higher from a market-moving account', () => {
    const text = 'New tariffs on Chinese imports starting next month';
    const trump = scoreRelevance(item(text, { source: 'realDonaldTrump' }), 'XAUT/USDT');
    const unknown = scoreRelevance(item(text, { source: 'random_account_9912' }), 'XAUT/USDT');

    expect(trump.score).toBeGreaterThan(unknown.score);
  });

  it('floors a primary mover with a direct hit above the aggregator threshold', () => {
    const r = scoreRelevance(
      item('Bitcoin is a scam and should be banned', {
        source: 'realDonaldTrump',
        publishedAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
      }),
      'BTC/USDT'
    );
    expect(r.score).toBeGreaterThanOrEqual(0.6);
  });
});

describe('freshness', () => {
  it('decays an older item below a fresh one', () => {
    const text = 'Bitcoin surges past key resistance';
    const fresh = scoreRelevance(item(text, { publishedAt: now() }), 'BTC/USDT');
    const old = scoreRelevance(
      item(text, { publishedAt: new Date(Date.now() - 48 * 3_600_000).toISOString() }),
      'BTC/USDT'
    );

    expect(fresh.score).toBeGreaterThan(old.score);
  });

  it('treats an unknown timestamp as moderately stale, not fresh', () => {
    const text = 'Bitcoin surges past key resistance';
    const fresh = scoreRelevance(item(text, { publishedAt: now() }), 'BTC/USDT');
    const unknown = scoreRelevance(item(text, { publishedAt: null }), 'BTC/USDT');

    expect(unknown.score).toBeLessThan(fresh.score);
    expect(unknown.score).toBeGreaterThan(0);
  });
});

describe('engagement', () => {
  it('lifts a viral post above an ignored one', () => {
    const text = 'Bitcoin will change everything';
    const viral = scoreRelevance(
      item(text, { engagement: { likes: 500_000, retweets: 120_000 } }),
      'BTC/USDT'
    );
    const quiet = scoreRelevance(
      item(text, { engagement: { likes: 2, retweets: 0 } }),
      'BTC/USDT'
    );

    expect(viral.score).toBeGreaterThan(quiet.score);
  });

  it('handles a missing engagement block', () => {
    const r = scoreRelevance(item('Bitcoin rallies', { engagement: null }), 'BTC/USDT');
    expect(r.score).toBeGreaterThan(0);
    expect(r.components.engagement).toBe(0);
  });
});

describe('negation and hedging', () => {
  it('damps a negated claim below the same claim stated plainly', () => {
    const plain = scoreRelevance(item('The SEC will ban crypto trading'), 'BTC/USDT');
    const negated = scoreRelevance(
      item('The SEC has no plans to ban crypto trading and denies the report'),
      'BTC/USDT'
    );

    expect(negated.score).toBeLessThan(plain.score);
    expect(negated.reasons.join(' ')).toContain('hedged');
  });

  it('keeps a hedged item relevant rather than dropping it', () => {
    const r = scoreRelevance(
      item('Rumor: Bitcoin ETF approval could potentially come next week'),
      'BTC/USDT'
    );
    expect(r.score).toBeGreaterThan(0.1);
  });
});

describe('robustness', () => {
  it('never returns NaN or out-of-range values for any input', () => {
    const inputs: RelevanceInput[] = [
      { text: '' },
      { text: '   ' },
      { text: '!!!@@@###' },
      { text: 'a'.repeat(10_000) },
      { text: 'Bitcoin', source: null, publishedAt: null, engagement: null },
      { text: 'Bitcoin', publishedAt: 'not-a-date' },
      { text: 'Bitcoin', engagement: { likes: -5, retweets: NaN } },
    ];

    for (const inp of inputs) {
      for (const sym of listSupportedAssets()) {
        const r = scoreRelevance(inp, sym);
        expect(Number.isFinite(r.score)).toBe(true);
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      }
    }
  });

  it('returns a zero score for an unsupported symbol instead of throwing', () => {
    const r = scoreRelevance(item('Bitcoin rallies hard'), 'NOTAREALCOIN/USDT');
    expect(r.score).toBe(0);
    expect(r.tier).toBeNull();
  });

  it('knows which symbols it supports', () => {
    expect(isSymbolSupported('BTC/USDT')).toBe(true);
    expect(isSymbolSupported('XAUT/USDT')).toBe(true);
    expect(isSymbolSupported('FAKE/USDT')).toBe(false);
    // Every symbol seen in logs/llm-prompts must be covered.
    for (const s of ['AVAX', 'BTC', 'DOGE', 'ETH', 'HYPE', 'SOL', 'SUI', 'XAUT', 'XRP']) {
      expect(isSymbolSupported(`${s}/USDT`)).toBe(true);
    }
  });

  it('scores 300 items in well under 50ms', () => {
    const items = Array.from({ length: 300 }, (_, i) =>
      item(`Bitcoin and Ethereum move as the Fed signals a rate cut #${i}`)
    );
    const t0 = performance.now();
    for (const it of items) scoreRelevance(it, 'BTC/USDT');
    expect(performance.now() - t0).toBeLessThan(50);
  });
});
