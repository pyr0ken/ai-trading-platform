/**
 * Signal coherence — reconciles the two independent directional fields the
 * model emits.
 *
 * THE BUG THIS FIXES
 * ------------------
 * The schema accepts `signal` (BUY/SELL/HOLD/NEUTRAL) and
 * `trade_setup.position` (LONG/SHORT/NEUTRAL) as unrelated fields. Nothing
 * forced them to agree, so the UI could render "BUY" in the Executive Signal
 * Beacon while the Trade Setup card below it showed
 * "MARKET WATCH — NO ACTIVE TRADE / HOLD-NEUTRAL". Two panels, one payload,
 * opposite instructions.
 *
 * RESOLUTION RULE
 * ---------------
 * Executability wins. A direction is only real if it comes with levels you
 * could actually trade: an entry range, a stop, and at least one target, with
 * the stop on the correct side of entry. So:
 *
 *   1. If `position` is directional AND its levels are coherent, that is the
 *      truth. `signal` is corrected to match.
 *   2. If `signal` is directional but `position` is NEUTRAL or its levels are
 *      unusable, the trade is downgraded to HOLD/NEUTRAL. We never invent
 *      levels to justify a direction.
 *   3. If both are neutral, nothing changes.
 *
 * Rule 2 is deliberately conservative: it is the direction that matches the
 * project's capital-preservation mandate, and it is the side that cannot lose
 * money on a fabricated setup.
 *
 * Every correction is recorded so the mismatch is visible rather than silently
 * papered over.
 */

import { StructuredLLMOutput } from '@/types/terminal';

export type SignalDirection = 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';
export type PositionDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface CoherenceResult {
  output: StructuredLLMOutput;
  /** True when signal and position disagreed and had to be reconciled. */
  corrected: boolean;
  /** Human-readable explanation, empty when nothing was corrected. */
  reason: string;
  /** What the model originally emitted, for logging and audit. */
  original: { signal: SignalDirection; position: PositionDirection } | null;
}

const SIGNAL_FOR_POSITION: Record<PositionDirection, SignalDirection> = {
  LONG: 'BUY',
  SHORT: 'SELL',
  NEUTRAL: 'HOLD',
};

function isDirectionalSignal(s: string | undefined): boolean {
  return s === 'BUY' || s === 'SELL';
}

function isDirectionalPosition(p: string | undefined): boolean {
  return p === 'LONG' || p === 'SHORT';
}

function finite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/**
 * Are the setup's levels actually tradeable?
 *
 * Requires an entry range, a stop, and at least one target, with the stop
 * below entry for longs and above entry for shorts. A stop on the wrong side
 * means the model produced nonsense, not a trade.
 */
export function hasTradeableLevels(
  setup: StructuredLLMOutput['trade_setup'] | undefined,
  position: PositionDirection
): boolean {
  if (!setup || !isDirectionalPosition(position)) return false;

  const range = setup.entry_range;
  if (!Array.isArray(range) || range.length !== 2) return false;
  if (!finite(range[0]) || !finite(range[1])) return false;
  if (!finite(setup.stop_loss)) return false;
  if (!finite(setup.take_profit_1)) return false;

  const entryLow = Math.min(range[0], range[1]);
  const entryHigh = Math.max(range[0], range[1]);

  if (position === 'LONG') {
    return setup.stop_loss < entryLow && setup.take_profit_1 > entryHigh;
  }
  return setup.stop_loss > entryHigh && setup.take_profit_1 < entryLow;
}

/**
 * Force `signal` and `trade_setup.position` to tell the same story.
 *
 * Returns a new object; the input is never mutated.
 */
export function enforceSignalCoherence(output: StructuredLLMOutput, reportText?: string): CoherenceResult {
  const signal = output?.signal as SignalDirection | undefined;
  const setup = output?.trade_setup;
  const position = setup?.position as PositionDirection | undefined;

  if (!signal || !position) {
    return { output, corrected: false, reason: '', original: null };
  }

  const original = { signal, position };
  const expectedSignal = SIGNAL_FOR_POSITION[position];

  // GUARD 1: Override directional signal if report text contains WAIT or NO ACTIONABLE ZONE
  if (reportText) {
    const textUpper = reportText.toUpperCase();
    if (
      textUpper.includes('WAIT FOR A PULLBACK') ||
      textUpper.includes('NO ACTIONABLE ZONE') ||
      textUpper.includes('NO ACTIONABLE SETUP') ||
      textUpper.includes('STAND DOWN')
    ) {
      if (isDirectionalSignal(signal) || isDirectionalPosition(position)) {
        const neutralSetup = { ...(setup as NonNullable<typeof setup>), position: 'NEUTRAL' as const };
        return {
          output: {
            ...output,
            signal: 'HOLD',
            trade_setup: neutralSetup,
          },
          corrected: true,
          reason:
            `Report text explicit recommendation is WAIT / NO ACTIONABLE ZONE. ` +
            `Signal override enforced: downgraded from "${signal}/${position}" to "HOLD/NEUTRAL".`,
          original,
        };
      }
    }
  }

  const tradeable = hasTradeableLevels(setup, position);

  // Case 1: position is directional and executable — it defines the truth.
  if (isDirectionalPosition(position) && tradeable) {
    if (signal === expectedSignal) {
      return { output, corrected: false, reason: '', original };
    }
    return {
      output: { ...output, signal: expectedSignal },
      corrected: true,
      reason:
        `Signal "${signal}" contradicted trade setup position "${position}" with valid levels. ` +
        `Signal corrected to "${expectedSignal}".`,
      original,
    };
  }

  // Case 2: signal claims a direction the setup cannot support — stand down.
  if (isDirectionalSignal(signal)) {
    const why = isDirectionalPosition(position)
      ? `position "${position}" had incoherent levels (stop/target on the wrong side of entry)`
      : `trade setup position was "${position}"`;

    // `setup` is non-null here: `position` was read off it above.
    const neutralSetup = { ...(setup as NonNullable<typeof setup>), position: 'NEUTRAL' as const };

    return {
      output: {
        ...output,
        signal: 'HOLD',
        trade_setup: neutralSetup,
      },
      corrected: true,
      reason:
        `Signal "${signal}" was not backed by an executable setup: ${why}. ` +
        `Downgraded to HOLD/NEUTRAL — no trade is shown rather than one that cannot be executed.`,
      original,
    };
  }

  // Case 3: both neutral, or a neutral signal with a neutral position.
  return { output, corrected: false, reason: '', original };
}
