import { describe, it, expect } from 'vitest';
import { enforceSignalCoherence, hasTradeableLevels } from '@/lib/llm/signal-coherence';
import { StructuredLLMOutput } from '@/types/terminal';

/**
 * Reproduces the reported bug: Executive Signal Beacon rendering BUY while the
 * Trade Setup card below it rendered "MARKET WATCH — NO ACTIVE TRADE".
 */

function build(
  signal: string,
  position: string,
  levels: Partial<StructuredLLMOutput['trade_setup']> = {}
): StructuredLLMOutput {
  return {
    signal,
    confidence: 70,
    risk_level: 'MEDIUM',
    market_phase: 'test',
    probabilities: { bullish: 50, bearish: 25, sideways: 25 },
    trade_setup: {
      position,
      entry_range: [100, 102],
      stop_loss: 95,
      take_profit_1: 110,
      take_profit_2: 115,
      take_profit_3: 120,
      risk_reward_ratio: 2.0,
      ...levels,
    },
  } as unknown as StructuredLLMOutput;
}

describe('enforceSignalCoherence — the reported bug', () => {
  it('downgrades BUY to HOLD when the setup position is NEUTRAL', () => {
    const { output, corrected, reason } = enforceSignalCoherence(build('BUY', 'NEUTRAL'));

    expect(corrected).toBe(true);
    expect(output.signal).toBe('HOLD');
    expect(output.trade_setup.position).toBe('NEUTRAL');
    expect(reason).toContain('not backed by an executable setup');
  });

  it('downgrades SELL to HOLD when the setup position is NEUTRAL', () => {
    const { output, corrected } = enforceSignalCoherence(build('SELL', 'NEUTRAL'));
    expect(corrected).toBe(true);
    expect(output.signal).toBe('HOLD');
  });

  it('leaves a coherent BUY/LONG untouched', () => {
    const { output, corrected } = enforceSignalCoherence(build('BUY', 'LONG'));
    expect(corrected).toBe(false);
    expect(output.signal).toBe('BUY');
    expect(output.trade_setup.position).toBe('LONG');
  });

  it('leaves a coherent SELL/SHORT untouched', () => {
    const short = build('SELL', 'SHORT', {
      entry_range: [100, 102],
      stop_loss: 108,
      take_profit_1: 90,
    });
    const { corrected, output } = enforceSignalCoherence(short);
    expect(corrected).toBe(false);
    expect(output.signal).toBe('SELL');
  });

  it('leaves HOLD/NEUTRAL untouched', () => {
    const { corrected } = enforceSignalCoherence(build('HOLD', 'NEUTRAL'));
    expect(corrected).toBe(false);
  });
});

describe('enforceSignalCoherence — position wins when levels are valid', () => {
  it('corrects HOLD to BUY when the setup is an executable LONG', () => {
    const { output, corrected, reason } = enforceSignalCoherence(build('HOLD', 'LONG'));

    expect(corrected).toBe(true);
    expect(output.signal).toBe('BUY');
    expect(output.trade_setup.position).toBe('LONG');
    expect(reason).toContain('corrected');
  });

  it('corrects a directly contradictory BUY/SHORT to SELL', () => {
    const contradiction = build('BUY', 'SHORT', {
      entry_range: [100, 102],
      stop_loss: 108,
      take_profit_1: 90,
    });
    const { output, corrected } = enforceSignalCoherence(contradiction);

    expect(corrected).toBe(true);
    expect(output.signal).toBe('SELL');
  });
});

describe('enforceSignalCoherence — incoherent levels never become a trade', () => {
  it('downgrades a LONG whose stop sits above entry', () => {
    const broken = build('BUY', 'LONG', { stop_loss: 120, take_profit_1: 130 });
    const { output, corrected, reason } = enforceSignalCoherence(broken);

    expect(corrected).toBe(true);
    expect(output.signal).toBe('HOLD');
    expect(output.trade_setup.position).toBe('NEUTRAL');
    expect(reason).toContain('wrong side of entry');
  });

  it('downgrades a SHORT whose target sits above entry', () => {
    const broken = build('SELL', 'SHORT', { stop_loss: 108, take_profit_1: 130 });
    const { output, corrected } = enforceSignalCoherence(broken);
    expect(corrected).toBe(true);
    expect(output.signal).toBe('HOLD');
  });

  it('downgrades when the stop loss is missing', () => {
    const broken = build('BUY', 'LONG', { stop_loss: 0 });
    const { output, corrected } = enforceSignalCoherence(broken);
    expect(corrected).toBe(true);
    expect(output.signal).toBe('HOLD');
  });
});

describe('enforceSignalCoherence — safety', () => {
  it('does not mutate the input object', () => {
    const input = build('BUY', 'NEUTRAL');
    enforceSignalCoherence(input);
    expect(input.signal).toBe('BUY');
    expect(input.trade_setup.position).toBe('NEUTRAL');
  });

  it('passes through payloads missing the fields entirely', () => {
    const partial = { confidence: 50 } as unknown as StructuredLLMOutput;
    const { corrected, output } = enforceSignalCoherence(partial);
    expect(corrected).toBe(false);
    expect(output).toBe(partial);
  });
});

describe('hasTradeableLevels', () => {
  it('accepts a well-formed long', () => {
    expect(
      hasTradeableLevels(build('BUY', 'LONG').trade_setup, 'LONG')
    ).toBe(true);
  });

  it('rejects a NEUTRAL position regardless of levels', () => {
    expect(
      hasTradeableLevels(build('HOLD', 'NEUTRAL').trade_setup, 'NEUTRAL')
    ).toBe(false);
  });

  it('rejects a malformed entry range', () => {
    const setup = build('BUY', 'LONG', {
      entry_range: [100] as unknown as [number, number],
    }).trade_setup;
    expect(hasTradeableLevels(setup, 'LONG')).toBe(false);
  });
});
