import { describe, it, expect } from 'vitest';
import { buildInstitutionalUserPrompt } from '@/lib/llm/institutional-prompt';
import { FullMarketContextPayload } from '@/types/analysis';

/** Minimal payload with safe defaults for technicalFacts. */
function payloadWith(signals: Array<Record<string, unknown>>): FullMarketContextPayload {
  return {
    metadata: { symbol: 'BTC/USDT', exchange: 'kucoin', primaryTimeframe: '1h' },
    ticker: { price: 63000 },
    timeframes: {},
    technicalFacts: {
      supportLevels: [],
      resistanceLevels: [],
    },
    recentHistoricalSignals: signals,
  } as unknown as FullMarketContextPayload;
}

function sig(status: string, pnl = 0) {
  return {
    signal: 'BUY',
    confidence: 70,
    price: 63000,
    created_at: new Date().toISOString(),
    status,
    pnl_percentage: pnl,
  };
}

/** Call the real prompt builder with its actual signature. */
function buildPrompt(signals: Array<Record<string, unknown>>): string {
  return buildInstitutionalUserPrompt('BTC/USDT', 'kucoin', '1h', payloadWith(signals));
}

describe('fill-rate feedback in the prompt', () => {
  it('excludes NOT_FILLED from the win rate denominator', () => {
    // 2 wins, 1 loss, 3 never filled. Win rate must be 2/3 = 67%, not 2/6 = 33%.
    const prompt = buildPrompt([
      sig('WIN', 1.2),
      sig('WIN', 0.9),
      sig('LOSS', -0.8),
      sig('NOT_FILLED'),
      sig('NOT_FILLED'),
      sig('NOT_FILLED'),
    ]);

    expect(prompt).toContain('2/3 Wins');
    expect(prompt).toContain('67% Win Rate');
    expect(prompt).not.toContain('2/6');
  });

  it('reports the fill rate separately', () => {
    const prompt = buildPrompt([sig('WIN'), sig('LOSS'), sig('NOT_FILLED'), sig('NOT_FILLED')]);
    expect(prompt).toContain('Entry Fill Rate');
    expect(prompt).toContain('2/4');
    expect(prompt).toContain('50%');
  });

  it('warns the model when most entries are never reached', () => {
    const prompt = buildPrompt([sig('WIN'), sig('NOT_FILLED'), sig('NOT_FILLED'), sig('NOT_FILLED')]);
    expect(prompt).toMatch(/entry bands are too far from price/i);
  });

  it('does NOT warn when fills are healthy', () => {
    const prompt = buildPrompt([sig('WIN'), sig('WIN'), sig('LOSS'), sig('NOT_FILLED')]);
    expect(prompt).toContain('Entry Fill Rate');
    expect(prompt).not.toMatch(/entry bands are too far from price/i);
  });

  it('surfaces the section even when every setup missed', () => {
    // Previously this produced no feedback block at all, so a model that never
    // got filled received no signal that anything was wrong.
    const prompt = buildPrompt([sig('NOT_FILLED'), sig('NOT_FILLED'), sig('NOT_FILLED')]);
    expect(prompt).toContain('HISTORICAL ACCURACY CONTEXT');
    expect(prompt).toContain('0/3');
  });

  it('omits the fill-rate line when the sample is too small to mean anything', () => {
    const prompt = buildPrompt([sig('WIN'), sig('LOSS')]);
    expect(prompt).not.toContain('Entry Fill Rate');
  });

  it('ignores PENDING signals entirely', () => {
    const prompt = buildPrompt([sig('WIN'), sig('LOSS'), sig('PENDING'), sig('PENDING')]);
    expect(prompt).toContain('1/2 Wins');
  });
});
