import { describe, it, expect, vi } from 'vitest';
import { enrichIntel, mergeEnrichment } from '@/lib/intel/intel-enricher';
import { IntelItem } from '@/lib/intel/intel-aggregator';

/** Ranked items as the aggregator would emit them. */
function baseItems(): IntelItem[] {
  return [
    {
      id: 'https://x.com/realDonaldTrump/status/111',
      kind: 'tweet',
      text: 'Announcing sweeping new tariffs on all imports effective immediately',
      source: 'realDonaldTrump',
      relevance: 0.85,
      engagement: { likes: 200_000, retweets: 50_000, replies: 10_000 },
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'article-abc',
      kind: 'article',
      text: 'Gold climbs as investors seek safe havens',
      source: 'CoinDesk',
      relevance: 0.7,
      publishedAt: new Date().toISOString(),
    },
  ];
}

/** Build a fetch stub returning an OpenAI-shaped chat completion. */
function mockFetch(content: string, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => ({ choices: [{ message: { content } }] }),
  }) as unknown as typeof fetch;
}

const goodResponse = JSON.stringify({
  items: [
    {
      id: 'https://x.com/realDonaldTrump/status/111',
      interpretation: 'Tariff escalation drives safe-haven demand.',
      direction: 'BULLISH',
    },
    {
      id: 'article-abc',
      interpretation: 'Confirms the safe-haven bid is already underway.',
      direction: 'BULLISH',
    },
  ],
  narrative: 'Trade-war escalation is pushing capital into gold.',
});

describe('enrichIntel — happy path', () => {
  it('annotates items and returns a narrative', async () => {
    const result = await enrichIntel(baseItems(), 'XAUT/USDT', {
      fetchImpl: mockFetch(goodResponse),
    });

    expect(result.enriched).toBe(true);
    expect(result.skipReason).toBeNull();
    expect(result.narrative).toContain('gold');
    expect(result.items[0].interpretation).toContain('safe-haven');
    expect(result.items[0].directionHint).toBe('BULLISH');
  });

  it('parses a response wrapped in code fences', async () => {
    const fenced = '```json\n' + goodResponse + '\n```';
    const result = await enrichIntel(baseItems(), 'XAUT/USDT', {
      fetchImpl: mockFetch(fenced),
    });

    expect(result.enriched).toBe(true);
    expect(result.items[0].directionHint).toBe('BULLISH');
  });

  it('parses JSON surrounded by prose', async () => {
    const noisy = `Here is my analysis:\n${goodResponse}\nHope that helps!`;
    const result = await enrichIntel(baseItems(), 'XAUT/USDT', {
      fetchImpl: mockFetch(noisy),
    });

    expect(result.enriched).toBe(true);
  });

  it('sends only the top N items but returns all of them', async () => {
    const many: IntelItem[] = Array.from({ length: 12 }, (_, i) => ({
      id: `item-${i}`,
      kind: 'article' as const,
      text: `Story number ${i}`,
      source: 'CoinDesk',
      relevance: 0.9 - i * 0.05,
    }));

    const spy = mockFetch(JSON.stringify({ items: [], narrative: 'Summary.' }));
    const result = await enrichIntel(many, 'BTC/USDT', {
      fetchImpl: spy,
      maxItems: 3,
    });

    const body = JSON.parse((spy as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const userPrompt = body.messages[1].content;

    expect(userPrompt).toContain('item-0');
    expect(userPrompt).toContain('item-2');
    expect(userPrompt).not.toContain('item-9');
    // All 12 still come back, not just the 3 that were sent.
    expect(result.items.length).toBe(12);
  });
});

describe('enrichIntel — graceful degradation (the core contract)', () => {
  it('returns the input unchanged on HTTP error', async () => {
    const input = baseItems();
    const result = await enrichIntel(input, 'XAUT/USDT', {
      fetchImpl: mockFetch('', false, 500),
    });

    expect(result.enriched).toBe(false);
    expect(result.skipReason).toContain('500');
    expect(result.items).toEqual(input);
  });

  it('returns the input unchanged on a network throw', async () => {
    const input = baseItems();
    const failing = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await enrichIntel(input, 'XAUT/USDT', {
      fetchImpl: failing as unknown as typeof fetch,
    });

    expect(result.enriched).toBe(false);
    expect(result.items).toEqual(input);
    expect(result.narrative).toBe('');
  });

  it('returns the input unchanged on timeout', async () => {
    const input = baseItems();
    const hanging = vi.fn(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        })
    );

    const result = await enrichIntel(input, 'XAUT/USDT', {
      fetchImpl: hanging as unknown as typeof fetch,
      timeoutMs: 30,
    });

    expect(result.enriched).toBe(false);
    expect(result.skipReason).toContain('timed out');
    expect(result.items).toEqual(input);
  });

  it('returns the input unchanged on malformed JSON', async () => {
    const input = baseItems();
    const result = await enrichIntel(input, 'XAUT/USDT', {
      fetchImpl: mockFetch('this is not json at all'),
    });

    expect(result.enriched).toBe(false);
    expect(result.items).toEqual(input);
  });

  it('returns the input unchanged on truncated JSON', async () => {
    const input = baseItems();
    const result = await enrichIntel(input, 'XAUT/USDT', {
      fetchImpl: mockFetch('{"items": [{"id": "abc", "interp'),
    });

    expect(result.enriched).toBe(false);
    expect(result.items).toEqual(input);
  });

  it('returns the input unchanged on empty content', async () => {
    const input = baseItems();
    const result = await enrichIntel(input, 'XAUT/USDT', {
      fetchImpl: mockFetch(''),
    });

    expect(result.enriched).toBe(false);
    expect(result.items).toEqual(input);
  });

  it('handles an empty item list without calling the LLM', async () => {
    const spy = mockFetch(goodResponse);
    const result = await enrichIntel([], 'XAUT/USDT', { fetchImpl: spy });

    expect(result.enriched).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('never throws, whatever the response shape', async () => {
    const nasty = [
      'null',
      '[]',
      '{"items": "not an array"}',
      '{"items": [null, 42, "str"]}',
      '{}',
      '{"narrative": 12345}',
    ];

    for (const payload of nasty) {
      const result = await enrichIntel(baseItems(), 'XAUT/USDT', {
        fetchImpl: mockFetch(payload),
      });
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(2);
    }
  });
});

describe('mergeEnrichment — hallucination guard', () => {
  it('discards ids that were never sent', async () => {
    const input = baseItems();
    const hallucinated = JSON.stringify({
      items: [
        { id: 'INVENTED-ID-999', interpretation: 'Made up.', direction: 'BULLISH' },
        {
          id: 'article-abc',
          interpretation: 'This one is real.',
          direction: 'BEARISH',
        },
      ],
      narrative: 'Mixed.',
    });

    const result = await enrichIntel(input, 'XAUT/USDT', {
      fetchImpl: mockFetch(hallucinated),
    });

    expect(result.items.length).toBe(2);
    expect(result.items.some((i) => i.id === 'INVENTED-ID-999')).toBe(false);
    expect(result.items[1].interpretation).toBe('This one is real.');
    // The unmatched real item stays untouched.
    expect(result.items[0].interpretation).toBeUndefined();
  });

  it('treats a response with zero recognisable ids as a failure', async () => {
    const input = baseItems();
    const allWrong = JSON.stringify({
      items: [{ id: 'nope-1', interpretation: 'x', direction: 'BULLISH' }],
      narrative: '',
    });

    const result = await enrichIntel(input, 'XAUT/USDT', {
      fetchImpl: mockFetch(allWrong),
    });

    expect(result.enriched).toBe(false);
    expect(result.skipReason).toContain('recognisable');
  });

  it('rejects an invalid direction value', () => {
    const { items } = mergeEnrichment(baseItems(), {
      items: [
        {
          id: 'article-abc',
          interpretation: 'Valid text.',
          direction: 'VERY_BULLISH',
        },
      ],
    });

    const target = items.find((i) => i.id === 'article-abc');
    expect(target?.interpretation).toBe('Valid text.');
    expect(target?.directionHint).toBeUndefined();
  });

  it('preserves input order and length exactly', () => {
    const input = baseItems();
    const { items } = mergeEnrichment(input, {
      items: [{ id: 'article-abc', direction: 'BEARISH' }],
    });

    expect(items.length).toBe(input.length);
    expect(items.map((i) => i.id)).toEqual(input.map((i) => i.id));
  });

  it('returns the input untouched for a null parse', () => {
    const input = baseItems();
    const { items, narrative, matched } = mergeEnrichment(input, null);

    expect(items).toEqual(input);
    expect(narrative).toBe('');
    expect(matched).toBe(0);
  });

  it('caps an over-long interpretation and narrative', () => {
    const { items, narrative } = mergeEnrichment(baseItems(), {
      items: [{ id: 'article-abc', interpretation: 'x'.repeat(5000) }],
      narrative: 'y'.repeat(5000),
    });

    const target = items.find((i) => i.id === 'article-abc');
    expect(target!.interpretation!.length).toBeLessThanOrEqual(300);
    expect(narrative.length).toBeLessThanOrEqual(800);
  });
});
