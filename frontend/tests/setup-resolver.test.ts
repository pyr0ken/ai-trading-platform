import { describe, it, expect } from 'vitest';
import {
  resolveTradeSetup,
  isUsableSetup,
  normaliseSetupPaths,
} from '@/lib/analysis/setup-resolver';
import { StructuredLLMOutput, TradeSetup } from '@/types/terminal';

/** Minimal valid setup, matching what the model is asked to emit. */
function makeSetup(overrides: Partial<TradeSetup> = {}): TradeSetup {
  return {
    position: 'LONG',
    entry_range: [63200, 63400],
    stop_loss: 62800,
    take_profit_1: 64200,
    take_profit_2: 64800,
    take_profit_3: 65400,
    risk_reward_ratio: 2.0,
    recommended_leverage: '3x',
    invalidation_point: 62700,
    strategy_name: 'Support reclaim',
    ...overrides,
  } as TradeSetup;
}

/** Output shaped the way institutional-prompt.ts actually instructs the model. */
function modernOutput(setup: TradeSetup | null): StructuredLLMOutput {
  return {
    signal: 'BUY',
    confidence: 82,
    playbook: {
      bias: 'BULLISH',
      actionable: { status: 'READY', setup },
    },
    trade_setup: null,
  } as unknown as StructuredLLMOutput;
}

/** Legacy output from before the playbook schema existed. */
function legacyOutput(setup: TradeSetup | null): StructuredLLMOutput {
  return {
    signal: 'BUY',
    confidence: 82,
    trade_setup: setup,
  } as unknown as StructuredLLMOutput;
}

describe('isUsableSetup', () => {
  it('accepts a well-formed long setup', () => {
    expect(isUsableSetup(makeSetup())).toBe(true);
  });

  it('accepts a well-formed short setup', () => {
    expect(isUsableSetup(makeSetup({ position: 'SHORT' }))).toBe(true);
  });

  it('rejects null and undefined', () => {
    expect(isUsableSetup(null)).toBe(false);
    expect(isUsableSetup(undefined)).toBe(false);
  });

  it('rejects a NEUTRAL position — nothing to resolve into win or loss', () => {
    expect(isUsableSetup(makeSetup({ position: 'NEUTRAL' } as Partial<TradeSetup>))).toBe(false);
  });

  it('rejects a setup with no stop loss', () => {
    expect(isUsableSetup(makeSetup({ stop_loss: 0 }))).toBe(false);
  });

  it('rejects a setup with no target', () => {
    expect(isUsableSetup(makeSetup({ take_profit_1: 0 }))).toBe(false);
  });

  it('rejects non-finite prices', () => {
    expect(isUsableSetup(makeSetup({ stop_loss: NaN }))).toBe(false);
  });
});

describe('resolveTradeSetup', () => {
  it('THE BUG: finds a setup the legacy trade_setup path would miss', () => {
    const output = modernOutput(makeSetup());

    // What use-auto-resolver.ts used to do:
    expect(output.trade_setup).toBeNull();

    // What it does now:
    expect(resolveTradeSetup(output)).not.toBeNull();
    expect(resolveTradeSetup(output)?.stop_loss).toBe(62800);
  });

  it('still reads legacy records written before the playbook schema', () => {
    const resolved = resolveTradeSetup(legacyOutput(makeSetup()));
    expect(resolved?.take_profit_1).toBe(64200);
  });

  it('prefers the modern path when both are populated but differ', () => {
    const output = legacyOutput(makeSetup({ stop_loss: 111 }));
    (output as unknown as { playbook: unknown }).playbook = {
      bias: 'BULLISH',
      actionable: { status: 'READY', setup: makeSetup({ stop_loss: 999 }) },
    };
    // The gate and validator mutate the modern path, so it must win.
    expect(resolveTradeSetup(output)?.stop_loss).toBe(999);
  });

  it('returns null when the platform declined the trade', () => {
    expect(resolveTradeSetup(modernOutput(null))).toBeNull();
  });

  it('returns null for null/undefined output', () => {
    expect(resolveTradeSetup(null)).toBeNull();
    expect(resolveTradeSetup(undefined)).toBeNull();
  });

  it('falls back to legacy when the modern path holds an unusable shape', () => {
    const output = modernOutput(makeSetup({ position: 'NEUTRAL' } as Partial<TradeSetup>));
    output.trade_setup = makeSetup({ stop_loss: 555 });
    expect(resolveTradeSetup(output)?.stop_loss).toBe(555);
  });
});

describe('normaliseSetupPaths', () => {
  it('mirrors a modern setup into the legacy field the resolver reads', () => {
    const output = modernOutput(makeSetup());
    normaliseSetupPaths(output);

    expect(output.trade_setup).not.toBeNull();
    expect(output.trade_setup?.stop_loss).toBe(62800);
    // Both paths now point at the same object.
    expect(output.trade_setup).toBe(output.playbook?.actionable?.setup);
  });

  it('mirrors a legacy setup into the modern field', () => {
    const output = legacyOutput(makeSetup());
    (output as unknown as { playbook: unknown }).playbook = {
      bias: 'BULLISH',
      actionable: { status: 'READY', setup: null },
    };
    normaliseSetupPaths(output);
    expect(output.playbook?.actionable?.setup?.stop_loss).toBe(62800);
  });

  it('clears BOTH paths on a refusal so no stale setup gets resolved', () => {
    const output = modernOutput(makeSetup());
    // Simulate the gate refusing the trade.
    output.playbook!.actionable!.setup = null;
    output.playbook!.actionable!.status = 'NO_TRADE';

    normaliseSetupPaths(output);

    expect(output.trade_setup).toBeNull();
    expect(output.playbook?.actionable?.setup).toBeNull();
    expect(resolveTradeSetup(output)).toBeNull();
  });

  it('is safe on null output', () => {
    expect(normaliseSetupPaths(null)).toBeNull();
  });

  it('END TO END: analysed signal survives into the resolver', () => {
    // 1. Model emits the modern shape only.
    const output = modernOutput(makeSetup());
    // 2. Save-time normalisation runs (use-llm-analysis.ts).
    normaliseSetupPaths(output);
    // 3. Record is persisted, later read back by use-auto-resolver.ts.
    const persisted = JSON.parse(JSON.stringify(output)) as StructuredLLMOutput;
    const setupSeenByResolver = resolveTradeSetup(persisted);

    // Before the fix this was null -> INVALIDATED -> dropped from win rate.
    expect(setupSeenByResolver).not.toBeNull();
    expect(setupSeenByResolver?.position).toBe('LONG');
  });
});
