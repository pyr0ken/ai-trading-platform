import { describe, it, expect } from 'vitest';
import {
  getSourceProfile,
  getSourceWeight,
  normaliseSourceId,
  isPrimaryMover,
  listRegisteredSources,
  UNKNOWN_SOURCE_WEIGHT,
} from '@/lib/intel/source-registry';

/**
 * Every handle configured in x_feed_engine/config.json. If someone adds an
 * account to the scraper, this list should grow too — an unregistered account
 * silently collapses to the 0.35 default and loses ranking priority.
 */
const CONFIGURED_HANDLES = [
  'elonmusk', 'realDonaldTrump', 'saylor', 'cz_binance', 'VitalikButerin',
  'CryptoHayes', 'brian_armstrong', 'CoinDesk', 'Cointelegraph', 'WuBlockchain',
  'TheBlock__', 'WatcherGuru', 'db_news', 'lookonchain', 'spotonchain',
  'glassnode', 'ArkhamIntel', 'nansen_ai', 'SECGov', 'CFTC', 'BlackRock',
  'fidelity', 'Grayscale', 'PeckShieldAlert', 'CertiKAlert', 'zachxbt',
  'binance', 'coinbase', 'krakenfx', 'Bybit_Official',
];

/** RSS labels emitted by lib/news/news-service.ts. */
const RSS_LABELS = [
  'CoinTelegraph', 'CoinDesk', 'CryptoSlate', 'The Block', 'Bitcoin Magazine',
];

describe('normaliseSourceId', () => {
  it('strips a leading @', () => {
    expect(normaliseSourceId('@elonmusk')).toBe('elonmusk');
  });

  it('extracts the handle from an x.com status URL', () => {
    expect(
      normaliseSourceId('https://x.com/realDonaldTrump/status/1234567890')
    ).toBe('realdonaldtrump');
  });

  it('extracts the handle from a legacy twitter.com URL', () => {
    expect(normaliseSourceId('https://twitter.com/saylor')).toBe('saylor');
  });

  it('reduces a bare domain to its registrable name', () => {
    expect(normaliseSourceId('www.coindesk.com')).toBe('coindesk');
    expect(normaliseSourceId('cointelegraph.com')).toBe('cointelegraph');
  });

  it('lowercases and trims', () => {
    expect(normaliseSourceId('  CoinDesk  ')).toBe('coindesk');
  });

  it('returns empty string for junk input without throwing', () => {
    expect(normaliseSourceId(null)).toBe('');
    expect(normaliseSourceId(undefined)).toBe('');
    expect(normaliseSourceId('')).toBe('');
    expect(normaliseSourceId('   ')).toBe('');
  });
});

describe('registry coverage', () => {
  it('resolves every handle configured in the scraper', () => {
    const unresolved = CONFIGURED_HANDLES.filter(
      (h) => getSourceProfile(h).tier === 'UNKNOWN'
    );
    expect(unresolved).toEqual([]);
  });

  it('resolves every RSS feed label used by the news service', () => {
    const unresolved = RSS_LABELS.filter(
      (l) => getSourceProfile(l).tier === 'UNKNOWN'
    );
    expect(unresolved).toEqual([]);
  });

  it('gives unknown sources exactly the default weight', () => {
    expect(getSourceWeight('some_random_account_12345')).toBe(UNKNOWN_SOURCE_WEIGHT);
    expect(getSourceProfile('some_random_account_12345').tier).toBe('UNKNOWN');
  });

  it('never returns null, even for garbage', () => {
    for (const junk of [null, undefined, '', '!!!', '@@@@']) {
      const p = getSourceProfile(junk as string);
      expect(p).toBeTruthy();
      expect(Number.isFinite(p.weight)).toBe(true);
    }
  });
});

describe('weight sanity', () => {
  it('keeps every weight inside [0, 1]', () => {
    for (const p of listRegisteredSources()) {
      expect(p.weight).toBeGreaterThan(0);
      expect(p.weight).toBeLessThanOrEqual(1);
    }
  });

  it('has no duplicate ids', () => {
    const ids = listRegisteredSources().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('documents every entry with a note', () => {
    for (const p of listRegisteredSources()) {
      expect(p.note.length).toBeGreaterThan(10);
    }
  });

  it('ranks a head of state above an aggregator', () => {
    expect(getSourceWeight('realDonaldTrump')).toBeGreaterThan(
      getSourceWeight('WatcherGuru')
    );
  });

  it('ranks a regulator above commentary', () => {
    expect(getSourceWeight('SECGov')).toBeGreaterThan(getSourceWeight('saylor'));
  });

  it('ranks verifiable on-chain analytics above headline aggregators', () => {
    expect(getSourceWeight('lookonchain')).toBeGreaterThan(
      getSourceWeight('db_news')
    );
  });

  it('discounts a permanently-biased source below neutral reporting', () => {
    // Saylor is structurally bullish by mandate; treat as sentiment not fact.
    expect(getSourceWeight('saylor')).toBeLessThan(getSourceWeight('CoinDesk'));
  });

  it('keeps every registered source above the unknown default', () => {
    for (const p of listRegisteredSources()) {
      expect(p.weight).toBeGreaterThan(UNKNOWN_SOURCE_WEIGHT);
    }
  });
});

describe('isPrimaryMover', () => {
  it('flags accounts that reprice assets directly', () => {
    expect(isPrimaryMover('realDonaldTrump')).toBe(true);
    expect(isPrimaryMover('@elonmusk')).toBe(true);
  });

  it('does not flag reporting outlets', () => {
    expect(isPrimaryMover('CoinDesk')).toBe(false);
    expect(isPrimaryMover('lookonchain')).toBe(false);
    expect(isPrimaryMover('unknown_person')).toBe(false);
  });
});
