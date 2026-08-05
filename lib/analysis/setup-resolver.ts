/**
 * Single Source of Truth for Trade Setup Resolution
 *
 * THE BUG THIS FIXES
 * ------------------
 * Three consumers read the executable setup from three DIFFERENT paths:
 *
 *   no-trade-gate.ts:103    playbook.actionable.setup ?? trade_setup
 *   conviction-scorer.ts:34 trade_setup || playbook.actionable.setup
 *   use-auto-resolver.ts:113 trade_setup            <-- ONLY the legacy path
 *
 * Meanwhile institutional-prompt.ts:99-115 instructs the model to place the
 * executable setup in `playbook.actionable.setup`. Nothing tells it to also
 * populate the legacy `trade_setup`.
 *
 * Measured consequence (reproduced against the real object shape):
 *
 *   GATE     sees setup: YES
 *   SCORER   sees setup: YES
 *   RESOLVER sees setup: NO   -> record marked INVALIDATED
 *   Counts toward win rate?   NO - silently dropped
 *
 * So a trade is analysed, scored, gated and displayed, then vanishes from the
 * statistics. Two compounding failures follow:
 *
 *   1. The reported win rate is computed over a BIASED SUBSAMPLE - only the
 *      signals where the model happened to fill the legacy field survive.
 *   2. `recentHistoricalSignals` feeds that same biased subsample back into the
 *      prompt, so the model calibrates on data that does not represent its own
 *      behaviour.
 *
 * A win rate you cannot trust makes every other improvement unmeasurable,
 * which is why this is fixed first.
 *
 * THE FIX
 * -------
 * One resolver used by every consumer, plus normalisation at save time so both
 * fields carry the same object. Old IndexedDB records keep working because the
 * legacy path is still read.
 */

import { StructuredLLMOutput, TradeSetup } from '@/types/terminal';

/**
 * Resolve the executable trade setup from any LLM output shape.
 *
 * Precedence is deliberate: `playbook.actionable.setup` is the CURRENT schema
 * the prompt asks for and the one the gate/validator mutate in place, so it
 * must win. `trade_setup` is the legacy fallback for records written before the
 * playbook schema existed.
 *
 * Returns null when neither path holds a usable setup, so callers can
 * distinguish "no trade proposed" from "setup lost in transit".
 */
export function resolveTradeSetup(
  output: StructuredLLMOutput | null | undefined
): TradeSetup | null {
  if (!output) return null;

  const modern = output.playbook?.actionable?.setup;
  if (isUsableSetup(modern)) return modern;

  const legacy = output.trade_setup;
  if (isUsableSetup(legacy)) return legacy;

  return null;
}

/**
 * A setup is only usable if it can actually be traded and measured.
 *
 * A NEUTRAL position or a missing stop means there is nothing to resolve into
 * a win or a loss; treating such an object as a real setup is how placeholder
 * shapes end up scored as trades.
 */
export function isUsableSetup(
  setup: TradeSetup | null | undefined
): setup is TradeSetup {
  if (!setup || typeof setup !== 'object') return false;
  if (setup.position !== 'LONG' && setup.position !== 'SHORT') return false;

  const sl = Number(setup.stop_loss);
  const tp = Number(setup.take_profit_1);
  return Number.isFinite(sl) && sl > 0 && Number.isFinite(tp) && tp > 0;
}

/**
 * Write the resolved setup into BOTH schema paths before persistence.
 *
 * Called once at save time. After this, every downstream consumer - including
 * the auto-resolver that only knows the legacy path - sees the same object,
 * and no signal can silently drop out of the win-rate statistics.
 *
 * Mutates and returns the same object; callers already treat parsedJson as
 * mutable through the validator and gate stages.
 */
export function normaliseSetupPaths(
  output: StructuredLLMOutput | null | undefined
): StructuredLLMOutput | null | undefined {
  if (!output) return output;

  const resolved = resolveTradeSetup(output);

  // A refusal is a legitimate outcome: keep both paths explicitly empty so the
  // resolver records NO_TRADE rather than falling back to a stale setup.
  if (!resolved) {
    if (output.trade_setup) output.trade_setup = null;
    if (output.playbook?.actionable) output.playbook.actionable.setup = null;
    return output;
  }

  output.trade_setup = resolved;
  if (output.playbook?.actionable) {
    output.playbook.actionable.setup = resolved;
  }

  return output;
}
