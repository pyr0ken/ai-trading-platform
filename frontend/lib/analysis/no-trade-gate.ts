/**
 * No-Trade Gate (Deterministic Refusal Layer)
 *
 * WHY THIS EXISTS
 * ---------------
 * Every analysis previously produced a tradeable signal. A professional trader
 * is out of the market most of the time; a system that is always in it pays the
 * round-trip cost over and over on marginal setups. At 0.30% per round trip, six
 * marginal trades a day burn 1.8% daily in pure friction — an edge no win rate
 * recovers from.
 *
 * This gate is the platform's ability to say "no". It runs AFTER the model
 * responds and AFTER cost economics are known, and it can downgrade a setup to
 * WAIT_FOR_ZONE or NO_TRADE regardless of how confident the model sounded.
 *
 * DESIGN NOTE ON SEVERITY
 * -----------------------
 * Per the user's explicit product decision, soft signals reduce conviction
 * rather than hard-killing a trade, so that a genuine news catalyst can still
 * justify a position. This gate therefore separates two tiers:
 *
 *   BLOCKING  - arithmetic or structural impossibilities. No amount of narrative
 *               conviction fixes a target that cannot clear fees, so these do
 *               force NO_TRADE.
 *   DEGRADING - unfavourable but survivable conditions. These push toward
 *               WAIT_FOR_ZONE and cut conviction, leaving the final call to the
 *               trader.
 */

import { FullMarketContextPayload } from '@/types/analysis';
import { StructuredLLMOutput, TradeSetup } from '@/types/terminal';
import { resolveTradeSetup } from './setup-resolver';
import {
  TradingCostModel,
  computeNetEconomics,
  minimumViableMovePct,
  NetTradeEconomics,
} from './trading-costs';

export interface GateFinding {
  rule: string;
  tier: 'BLOCKING' | 'DEGRADING';
  detail: string;
  /** Conviction points to subtract when this fires. */
  penalty: number;
}

export interface NoTradeGateResult {
  /** Final decision after all rules. */
  decision: 'ALLOW' | 'WAIT_FOR_ZONE' | 'NO_TRADE';
  findings: GateFinding[];
  /** Sum of penalties, for the conviction scorer to apply. */
  totalPenalty: number;
  /** Net economics of the proposed setup, when one was present. */
  economics: NetTradeEconomics | null;
  /** Plain-language summary for the UI. */
  summary: string;
}

/**
 * Net risk-to-reward thresholds, expressed as two tiers.
 *
 * Calibration reasoning — the number that actually matters is the break-even
 * win rate the setup implies, because that is what the system must beat:
 *
 *   netRR 1.00 -> break-even 50.0%   symmetric payoff, no margin for error
 *   netRR 1.30 -> break-even 43.5%   achievable for a competent system
 *   netRR 1.50 -> break-even 40.0%   comfortable
 *   netRR 2.00 -> break-even 33.3%   excellent
 *
 * An earlier revision blocked anything under 1.5 net. That was wrong: after a
 * 0.30% round trip, a perfectly healthy 1:2 gross setup nets 1:1.31, so the
 * rule refused essentially every trade. A gate that never lets a trade through
 * does not protect capital, it just guarantees zero return.
 *
 * So: below 1.0 net is a genuine structural reject (you would need to win more
 * than half your trades merely to break even, while risking as much as you
 * stand to make). Between 1.0 and 1.5 the trade is viable but thin, which is a
 * conviction problem rather than an arithmetic one.
 */
const MIN_NET_RR_HARD = 1.0;
const MIN_NET_RR_PREFERRED = 1.5;

/** Maximum spread tolerated before execution quality is considered too poor. */
const MAX_SPREAD_PCT_SCALP = 0.15;
const MAX_SPREAD_PCT_SWING = 0.35;

/** ADX below this means there is no trend to follow. */
const ADX_DEAD_ZONE = 18;

export function evaluateNoTradeGate(
  payload: FullMarketContextPayload,
  output: StructuredLLMOutput,
  cost: TradingCostModel
): NoTradeGateResult {
  const findings: GateFinding[] = [];

  const mode = payload.mode || 'swing';
  const regime = payload.marketRegime;
  const zones = payload.decisionZones;
  const facts = payload.technicalFacts;

  const playbookStatus = output.playbook?.actionable?.status;
  const setup: TradeSetup | null | undefined =
    resolveTradeSetup(output);

  const bias = output.playbook?.bias
    ?? (output.signal === 'BUY' ? 'BULLISH' : output.signal === 'SELL' ? 'BEARISH' : 'NEUTRAL');
  const isLong = bias === 'BULLISH';

  // ── Economics of the proposed setup ─────────────────────────────────────
  let economics: NetTradeEconomics | null = null;

  if (setup && setup.position !== 'NEUTRAL') {
    const entry = Array.isArray(setup.entry_range) && setup.entry_range.length === 2
      ? (setup.entry_range[0] + setup.entry_range[1]) / 2
      : payload.ticker?.price ?? 0;

    economics = computeNetEconomics(
      entry,
      setup.stop_loss,
      setup.take_profit_1,
      setup.position === 'LONG',
      cost
    );

    if (economics === null) {
      findings.push({
        rule: 'MALFORMED_SETUP',
        tier: 'BLOCKING',
        detail:
          'Stop loss or target is on the wrong side of entry, or a price is non-positive. ' +
          'The setup is arithmetically invalid and cannot be executed.',
        penalty: 40,
      });
    } else {
      // Rule 1: costs exceed the entire target move.
      if (economics.unwinnable) {
        findings.push({
          rule: 'COSTS_EXCEED_TARGET',
          tier: 'BLOCKING',
          detail:
            `Target move is ${economics.rewardPct.toFixed(3)}% but round-trip cost is ` +
            `${cost.roundTripCostPct}%. Net result on a PERFECT take-profit hit is ` +
            `${economics.netWinPct.toFixed(3)}% — the trade loses money even when it wins.`,
          penalty: 45,
        });
      }
      // Rule 2: net R:R below the structural floor.
      // Below 1.0 the payoff is worse than symmetric after costs — a reject.
      // Between 1.0 and the preferred floor it is thin but tradeable, so it
      // degrades conviction instead of killing the setup outright.
      else if (economics.netRR < MIN_NET_RR_HARD) {
        findings.push({
          rule: 'NET_RR_BELOW_PARITY',
          tier: 'BLOCKING',
          detail:
            `Gross R:R is 1:${economics.grossRR.toFixed(2)} but NET R:R after costs is ` +
            `1:${economics.netRR.toFixed(2)} — below parity. You would need to win ` +
            `${economics.breakEvenWinRatePct}% of trades just to break even while risking ` +
            `more than you stand to gain.`,
          penalty: 30,
        });
      } else if (economics.netRR < MIN_NET_RR_PREFERRED) {
        findings.push({
          rule: 'NET_RR_THIN',
          tier: 'DEGRADING',
          detail:
            `Net R:R is 1:${economics.netRR.toFixed(2)} after ${cost.roundTripCostPct}% costs ` +
            `(gross 1:${economics.grossRR.toFixed(2)}). Viable but thin — implies a ` +
            `${economics.breakEvenWinRatePct}% break-even win rate. Costs consume ` +
            `${economics.costDragPct}% of the gross win.`,
          penalty: 12,
        });
      }

      // Rule 3: target too close to be worth the friction.
      const minMove = minimumViableMovePct(cost);
      if (!economics.unwinnable && economics.rewardPct < minMove) {
        findings.push({
          rule: 'TARGET_BELOW_MINIMUM_MOVE',
          tier: 'BLOCKING',
          detail:
            `Target is ${economics.rewardPct.toFixed(3)}% away; minimum viable move is ` +
            `${minMove}% (2.5x round-trip cost). Costs consume ${economics.costDragPct}% of the gross win.`,
          penalty: 25,
        });
      }
    }
  }

  // ── Execution quality ───────────────────────────────────────────────────
  const maxSpread = mode === 'scalp' ? MAX_SPREAD_PCT_SCALP : MAX_SPREAD_PCT_SWING;
  if (cost.spreadIsLive && cost.spreadPct > maxSpread) {
    findings.push({
      rule: 'SPREAD_TOO_WIDE',
      tier: 'BLOCKING',
      detail:
        `Live spread is ${cost.spreadPct}%, above the ${maxSpread}% ceiling for ${mode} mode. ` +
        'Execution quality is too poor; the spread alone would consume the edge.',
      penalty: 30,
    });
  }

  // ── Structural conditions (degrading) ───────────────────────────────────

  // Rule 4: no trend to trade in a trend-following context.
  const primaryAdx = facts?.adxValue ?? null;
  if (
    typeof primaryAdx === 'number' &&
    primaryAdx < ADX_DEAD_ZONE &&
    (regime?.type === 'TRENDING_UP' || regime?.type === 'TRENDING_DOWN')
  ) {
    findings.push({
      rule: 'ADX_DEAD_ZONE',
      tier: 'DEGRADING',
      detail:
        `ADX is ${primaryAdx.toFixed(1)} (below ${ADX_DEAD_ZONE}) yet the regime reads as trending. ` +
        'Directional follow-through is unreliable; expect chop that pays fees without delivering the move.',
      penalty: 15,
    });
  }

  // Rule 5: timeframes cannot agree.
  if (regime && regime.directionalParticipation < 35 && regime.dominantDirection === 'NEUTRAL') {
    findings.push({
      rule: 'NO_DIRECTIONAL_CONSENSUS',
      tier: 'DEGRADING',
      detail:
        `Only ${regime.directionalParticipation}% of weighted timeframes express any direction. ` +
        'There is no structural agreement to trade with.',
      penalty: 18,
    });
  }

  // Rule 6: price is nowhere near a decision point.
  if (zones && !zones.activeZoneId && zones.nextDecisionZoneId) {
    const next = [...zones.resistanceZones, ...zones.supportZones].find(
      (z) => z.id === zones.nextDecisionZoneId
    );
    if (next && Math.abs(next.distanceInAtr) > 2.0) {
      findings.push({
        rule: 'PRICE_MID_STRUCTURE',
        tier: 'DEGRADING',
        detail:
          `Nearest decision zone ${next.id} is ${Math.abs(next.distanceInAtr).toFixed(2)} ATR away ` +
          `(${Math.abs(next.distancePct).toFixed(2)}%). Price is mid-structure with no level to react from.`,
        penalty: 20,
      });
    }
  }

  // Rule 7: entering against both higher timeframes.
  if (regime && bias !== 'NEUTRAL') {
    const opposing = regime.votes.filter(
      (v) =>
        (v.timeframe === '4h' || v.timeframe === '1d' || v.timeframe === '1w') &&
        v.vote !== 'NEUTRAL' &&
        ((isLong && v.vote === 'BEARISH') || (!isLong && v.vote === 'BULLISH'))
    );
    if (opposing.length >= 2) {
      findings.push({
        rule: 'AGAINST_MULTIPLE_HTF',
        tier: 'DEGRADING',
        detail:
          `${bias} bias opposes ${opposing.length} higher timeframes ` +
          `(${opposing.map((o) => `${o.timeframe}:${o.vote}`).join(', ')}). ` +
          'Counter-trend entries need exceptional justification.',
        penalty: 22,
      });
    }
  }

  // ── Resolve decision ────────────────────────────────────────────────────
  const blocking = findings.filter((f) => f.tier === 'BLOCKING');
  const degrading = findings.filter((f) => f.tier === 'DEGRADING');
  const totalPenalty = findings.reduce((s, f) => s + f.penalty, 0);

  let decision: NoTradeGateResult['decision'];
  let summary: string;

  if (blocking.length > 0) {
    // Arithmetic impossibility is not a matter of opinion.
    decision = 'NO_TRADE';
    summary =
      `Trade refused: ${blocking.length} blocking condition${blocking.length > 1 ? 's' : ''} ` +
      `(${blocking.map((b) => b.rule).join(', ')}). ` +
      'The setup cannot produce positive expected value after execution costs.';
  } else if (degrading.length >= 2) {
    decision = 'WAIT_FOR_ZONE';
    summary =
      `Standing aside: ${degrading.length} unfavourable conditions ` +
      `(${degrading.map((d) => d.rule).join(', ')}). ` +
      'Conditions may improve — wait for price to reach a decision zone with clearer structure.';
  } else if (degrading.length === 1) {
    // One soft issue: allow, but the conviction hit is recorded.
    decision = playbookStatus === 'READY' ? 'ALLOW' : 'WAIT_FOR_ZONE';
    summary = `Proceeding with reduced conviction: ${degrading[0].rule}. ${degrading[0].detail}`;
  } else {
    decision = 'ALLOW';
    summary = economics
      ? `Setup clears all gates. Net R:R 1:${economics.netRR.toFixed(2)} after ${cost.roundTripCostPct}% costs; ` +
        `break-even win rate ${economics.breakEvenWinRatePct}%.`
      : 'No blocking or degrading conditions detected.';
  }

  return { decision, findings, totalPenalty, economics, summary };
}

/** Render gate constraints for prompt injection (pre-emptive guidance). */
export function renderGateRulesForPrompt(cost: TradingCostModel, mode: 'scalp' | 'swing'): string {
  const minMove = minimumViableMovePct(cost);
  const maxSpread = mode === 'scalp' ? MAX_SPREAD_PCT_SCALP : MAX_SPREAD_PCT_SWING;

  return [
    'HARD EXECUTION CONSTRAINTS (a deterministic gate enforces these AFTER you respond):',
    `- NET R:R after costs must exceed 1:${MIN_NET_RR_HARD} or the trade is rejected outright.`,
    `  Aim for 1:${MIN_NET_RR_PREFERRED} net or better; between the two the setup is accepted`,
    '  but its conviction score is cut, so a thin payoff must earn its place.',
    `  Because costs are ${cost.roundTripCostPct}% round trip, a gross 1:2 becomes roughly`,
    `  1:${(((2 - cost.roundTripCostPct) / (1 + cost.roundTripCostPct))).toFixed(2)} net on a 1% risk trade — size your targets accordingly.`,
    `- Take-profit-1 must be at least ${minMove}% away from entry. Closer targets are auto-rejected.`,
    `- Spread ceiling for ${mode} mode is ${maxSpread}%.`,
    `- Round-trip cost of ${cost.roundTripCostPct}% is subtracted from every target and added to every stop.`,
    '- If no setup can satisfy these, return actionable.status = "NO_TRADE" with setup = null.',
    '  Returning an unviable trade is strictly worse than returning nothing: the gate will',
    '  reject it anyway, and a rejected signal wastes the analysis.',
  ].join('\n');
}
