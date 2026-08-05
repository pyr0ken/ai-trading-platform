import { describe, it, expect } from 'vitest';
import { computeConvictionScore } from '@/lib/analysis/conviction-scorer';
import { FullMarketContextPayload } from '@/types/analysis';
import { StructuredLLMOutput } from '@/types/terminal';

/** Payload where every dimension is favourable except the ones a test varies. */
function payload(over: Record<string, unknown> = {}): FullMarketContextPayload {
  return {
    marketRegime: {
      type: 'TRENDING_UP',
      dominantDirection: 'BULLISH',
      alignmentScore: 80,
      votes: [{ timeframe: '4h', vote: 'BULLISH' }],
    },
    decisionZones: {
      activeZoneId: 'S1',
      resistanceZones: [],
      supportZones: [],
      nextDecisionZoneId: null,
    },
    technicalFacts: {
      rsiCondition: 'NEUTRAL',
      volumeSurgeRatio: 1.6,
    },
    microstructure: { orderBookDepth: { orderBookPressure: 'BUY_PRESSURE' } },
    ...over,
  } as unknown as FullMarketContextPayload;
}

function longSetup(rr = 2.6): StructuredLLMOutput {
  return {
    signal: 'BUY',
    playbook: {
      bias: 'BULLISH',
      actionable: {
        status: 'READY',
        setup: {
          position: 'LONG',
          entry_range: [100, 101],
          stop_loss: 98,
          take_profit_1: 106,
          risk_reward_ratio: rr,
        },
      },
    },
    trade_setup: null,
  } as unknown as StructuredLLMOutput;
}

describe('no double-penalisation', () => {
  it('charges HTF conflict exactly once', () => {
    const counterHtf = payload({
      marketRegime: {
        type: 'TRENDING_DOWN',
        dominantDirection: 'BEARISH',
        alignmentScore: 40,
        votes: [{ timeframe: '4h', vote: 'BEARISH' }],
      },
    });

    const score = computeConvictionScore(counterHtf, longSetup());

    // The filter records the conflict...
    const htf = score.filters.find((f) => f.name === 'Higher-TF Agreement');
    expect(htf?.score).toBe(0);
    expect(htf?.penalising).toBe(true);

    // ...and no veto charges for the same thing again.
    expect(score.vetoes.some((v) => v.rule === 'COUNTER_HTF_TREND')).toBe(false);
  });

  it('charges weak R:R exactly once', () => {
    const score = computeConvictionScore(payload(), longSetup(1.1));
    const rr = score.filters.find((f) => f.name === 'R:R Quality');
    expect(rr?.score).toBe(0);
    expect(score.vetoes.some((v) => v.rule === 'SUBOPTIMAL_RISK_REWARD')).toBe(false);
  });

  it('charges chasing momentum exactly once', () => {
    const overbought = payload({
      technicalFacts: { rsiCondition: 'OVERBOUGHT', volumeSurgeRatio: 1.2 },
    });
    const score = computeConvictionScore(overbought, longSetup());
    const mom = score.filters.find((f) => f.name === 'Momentum Confirmation');
    expect(mom?.score).toBe(0);
    expect(score.vetoes.some((v) => v.rule === 'CHASING_OVERBOUGHT')).toBe(false);
  });

  it('THE REGRESSION: a clean early reversal is no longer suppressed', () => {
    // Counter-4h long, but inside a support zone, oversold, volume surging,
    // excellent R:R. Previously 48/LOW through double counting.
    const reversal = payload({
      marketRegime: {
        type: 'TRENDING_DOWN',
        dominantDirection: 'BEARISH',
        alignmentScore: 45,
        votes: [{ timeframe: '4h', vote: 'BEARISH' }],
      },
      technicalFacts: { rsiCondition: 'OVERSOLD', volumeSurgeRatio: 1.8 },
    });

    const score = computeConvictionScore(reversal, longSetup(2.6));

    expect(score.veto_penalty).toBe(0);
    expect(score.final_score).toBeGreaterThanOrEqual(55);
    expect(['MEDIUM', 'HIGH']).toContain(score.grade);
  });

  it('a genuinely bad setup still scores poorly', () => {
    const bad = payload({
      marketRegime: {
        type: 'VOLATILE_EXPANSION',
        dominantDirection: 'BEARISH',
        alignmentScore: 20,
        votes: [{ timeframe: '4h', vote: 'BEARISH' }],
      },
      technicalFacts: { rsiCondition: 'OVERBOUGHT', volumeSurgeRatio: 0.5 },
      decisionZones: {
        activeZoneId: null,
        nextDecisionZoneId: null,
        resistanceZones: [],
        supportZones: [],
      },
      microstructure: { orderBookDepth: { orderBookPressure: 'SELL_PRESSURE' } },
    });

    const score = computeConvictionScore(bad, longSetup(1.0));
    expect(score.final_score).toBeLessThan(35);
    expect(score.grade).toBe('REJECTED');
  });

  it('score stays within 0-100 and raw equals the filter sum', () => {
    const score = computeConvictionScore(payload(), longSetup());
    const sum = score.filters.reduce((a, f) => a + f.score, 0);
    expect(score.raw_score).toBeCloseTo(sum, 1);
    expect(score.final_score).toBeGreaterThanOrEqual(0);
    expect(score.final_score).toBeLessThanOrEqual(100);
  });
});
