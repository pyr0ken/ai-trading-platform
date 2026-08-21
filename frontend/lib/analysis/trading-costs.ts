/**
 * Trading Cost Model
 *
 * THE BUG THIS FIXES
 * ------------------
 * The platform previously modelled trades as if execution were free. It is not.
 * Measured round trip on a KuCoin taker fill:
 *
 *   taker fee   0.100% x 2 sides   = 0.200%
 *   spread      0.020% x 2 sides   = 0.040%
 *   slippage    0.030% x 2 sides   = 0.060%
 *                                   -------
 *   ROUND TRIP                       0.300%
 *
 * What that does to survival maths at the platform's own 1:1.8 R:R minimum:
 *
 *   ignoring costs      -> break-even win rate 35.7%
 *   risking 1.0%        -> break-even win rate 46.4%   (+10.7 points)
 *   risking 0.3% scalp  -> break-even win rate 71.4%   (effectively unreachable)
 *
 * A system that believes it needs 36% wins while actually needing 46% will bleed
 * capital indefinitely no matter how good the model is. Worse, on tight scalps
 * costs consume 60% of a 0.5% gross target.
 *
 * WHAT THIS MODULE DOES
 * ---------------------
 * Computes true round-trip cost using the LIVE spread from the order book where
 * available, converts a gross R:R into a NET R:R, and reports the real
 * break-even win rate so both the model and the gate can reason about whether a
 * trade is worth taking at all.
 */

import { MicrostructureMetrics } from '@/types/market';

/**
 * Venue taker fee per side, as a fraction (not percent).
 *
 * Taker is assumed rather than maker because a signal-driven entry that needs
 * to be in the market when a level breaks will cross the spread. Assuming maker
 * fees would understate cost precisely when it matters most.
 */
const VENUE_TAKER_FEE: Record<string, number> = {
  kucoin: 0.001,   // 0.10%
  binance: 0.001,  // 0.10%
  bybit: 0.00055,  // 0.055%
  okx: 0.001,      // 0.10%
  mexc: 0.0005,    // 0.05%
  gate: 0.002,     // 0.20%
  kraken: 0.0026,  // 0.26%
};

const DEFAULT_TAKER_FEE = 0.001;

/**
 * Slippage assumption per side when we cannot measure it.
 *
 * Deliberately conservative. Under-estimating slippage produces setups that
 * look viable on paper and lose in practice, which is the exact failure mode
 * this module exists to prevent.
 */
const BASE_SLIPPAGE_PER_SIDE = 0.0003; // 0.03%

/** Spread fallback when the order book is unavailable. */
const FALLBACK_SPREAD_PCT = 0.0004; // 0.04%

export interface TradingCostModel {
  /** Exchange the fees were resolved for. */
  exchange: string;
  /** Taker fee per side, as a percentage (0.1 = 0.1%). */
  takerFeePct: number;
  /** Live or fallback spread, as a percentage. */
  spreadPct: number;
  /** True when spreadPct came from a real order book rather than the fallback. */
  spreadIsLive: boolean;
  /** Assumed slippage per side, as a percentage. */
  slippagePctPerSide: number;
  /** Total cost to open AND close one position, as a percentage. */
  roundTripCostPct: number;
  /** Cost to enter only, as a percentage. */
  entryCostPct: number;
}

/**
 * Build the cost model for a symbol on a venue, using live spread when possible.
 */
export function buildCostModel(
  exchange: string,
  microstructure?: MicrostructureMetrics
): TradingCostModel {
  const venue = (exchange || '').toLowerCase();
  const takerFee = VENUE_TAKER_FEE[venue] ?? DEFAULT_TAKER_FEE;

  // Prefer the measured spread: it captures the actual liquidity conditions
  // right now, which is what the trade will actually pay.
  let spreadFraction = FALLBACK_SPREAD_PCT;
  let spreadIsLive = false;

  const depth = microstructure?.orderBookDepth as
    | { spreadPercentage?: number; bestBid?: number; bestAsk?: number }
    | undefined;

  if (depth && typeof depth.spreadPercentage === 'number' && Number.isFinite(depth.spreadPercentage)) {
    const live = depth.spreadPercentage / 100;
    // Guard against nonsense values from a thin or broken book.
    if (live > 0 && live < 0.05) {
      spreadFraction = live;
      spreadIsLive = true;
    }
  }

  // Each side pays half the spread on average.
  const entryCost = takerFee + spreadFraction / 2 + BASE_SLIPPAGE_PER_SIDE;
  const exitCost = takerFee + spreadFraction / 2 + BASE_SLIPPAGE_PER_SIDE;

  return {
    exchange: venue || 'unknown',
    takerFeePct: Number((takerFee * 100).toFixed(4)),
    spreadPct: Number((spreadFraction * 100).toFixed(4)),
    spreadIsLive,
    slippagePctPerSide: Number((BASE_SLIPPAGE_PER_SIDE * 100).toFixed(4)),
    roundTripCostPct: Number(((entryCost + exitCost) * 100).toFixed(4)),
    entryCostPct: Number((entryCost * 100).toFixed(4)),
  };
}

export interface NetTradeEconomics {
  /** Distance from entry to stop, as a percentage of entry. */
  riskPct: number;
  /** Distance from entry to first target, as a percentage of entry. */
  rewardPct: number;
  /** Reward divided by risk before costs. */
  grossRR: number;
  /** Reward divided by risk after costs are charged to both sides. */
  netRR: number;
  /** Percentage gain actually banked if TP1 hits. */
  netWinPct: number;
  /** Percentage loss actually taken if the stop hits. */
  netLossPct: number;
  /** Win rate required to break even, accounting for costs. */
  breakEvenWinRatePct: number;
  /** Fraction of the gross win consumed by costs. */
  costDragPct: number;
  /** True when costs make the trade unwinnable even on a perfect TP hit. */
  unwinnable: boolean;
}

/**
 * Convert a raw entry/stop/target into net economics after costs.
 *
 * All three prices must be positive and the stop must sit on the correct side
 * of entry for the position; otherwise the result is flagged unwinnable rather
 * than silently returning a flattering number.
 */
export function computeNetEconomics(
  entry: number,
  stopLoss: number,
  takeProfit: number,
  isLong: boolean,
  cost: TradingCostModel
): NetTradeEconomics | null {
  if (!(entry > 0) || !(stopLoss > 0) || !(takeProfit > 0)) return null;

  const riskAbs = isLong ? entry - stopLoss : stopLoss - entry;
  const rewardAbs = isLong ? takeProfit - entry : entry - takeProfit;

  // A stop on the wrong side, or a target behind the entry, is a malformed
  // setup. Returning null lets the caller reject it explicitly.
  if (riskAbs <= 0 || rewardAbs <= 0) return null;

  const riskPct = (riskAbs / entry) * 100;
  const rewardPct = (rewardAbs / entry) * 100;
  const grossRR = rewardPct / riskPct;

  // Costs are charged in full on both winning and losing trades: you pay to get
  // in and you pay to get out either way.
  const rt = cost.roundTripCostPct;
  const netWinPct = rewardPct - rt;
  const netLossPct = riskPct + rt;

  const netRR = netLossPct > 0 ? netWinPct / netLossPct : 0;

  const breakEven =
    netWinPct + netLossPct > 0
      ? (netLossPct / (netWinPct + netLossPct)) * 100
      : 100;

  return {
    riskPct: Number(riskPct.toFixed(4)),
    rewardPct: Number(rewardPct.toFixed(4)),
    grossRR: Number(grossRR.toFixed(3)),
    netRR: Number(netRR.toFixed(3)),
    netWinPct: Number(netWinPct.toFixed(4)),
    netLossPct: Number(netLossPct.toFixed(4)),
    breakEvenWinRatePct: Number(Math.min(100, Math.max(0, breakEven)).toFixed(2)),
    costDragPct: rewardPct > 0 ? Number(((rt / rewardPct) * 100).toFixed(2)) : 100,
    unwinnable: netWinPct <= 0,
  };
}

/**
 * Minimum move required for a trade to be worth taking at all.
 *
 * Anything smaller than this cannot clear costs plus a sensible profit margin,
 * so the model should not even be shown it as a candidate.
 */
export function minimumViableMovePct(cost: TradingCostModel, marginMultiple = 2.5): number {
  return Number((cost.roundTripCostPct * marginMultiple).toFixed(4));
}

/** Render the cost model for prompt injection. */
export function renderCostModelForPrompt(cost: TradingCostModel): string {
  const lines: string[] = [];
  lines.push('EXECUTION COST MODEL (deterministic, charged on EVERY trade):');
  lines.push(
    `- Venue: ${cost.exchange} | Taker fee: ${cost.takerFeePct}% per side | ` +
    `Spread: ${cost.spreadPct}% (${cost.spreadIsLive ? 'LIVE from order book' : 'estimated'}) | ` +
    `Slippage: ${cost.slippagePctPerSide}% per side`
  );
  lines.push(
    `- ROUND-TRIP COST: ${cost.roundTripCostPct}% of position value.`
  );
  lines.push(
    `- MINIMUM VIABLE MOVE: ${minimumViableMovePct(cost)}%. ` +
    `Any target closer than this to entry cannot clear costs and must NOT be proposed.`
  );
  // Derive the illustration from the ACTUAL cost figure rather than quoting a
  // hardcoded example. With a live order book the round trip varies between
  // roughly 0.26% and 0.35%, and a stale example would contradict the numbers
  // printed directly above it.
  {
    const grossRR = 1.8;
    const riskPct = 1.0;
    const netRR = (grossRR * riskPct - cost.roundTripCostPct) / (riskPct + cost.roundTripCostPct);
    const beNoCost = (1 / (1 + grossRR)) * 100;
    const beWithCost =
      ((riskPct + cost.roundTripCostPct) /
        (grossRR * riskPct - cost.roundTripCostPct + riskPct + cost.roundTripCostPct)) * 100;
    lines.push(
      `- Costs are paid on winners AND losers. A 1:${grossRR} gross R:R is only ` +
      `~1:${netRR.toFixed(2)} net on a ${riskPct}% risk trade, which raises the break-even ` +
      `win rate from ${beNoCost.toFixed(1)}% to ${beWithCost.toFixed(1)}%.`
    );
  }
  lines.push(
    '- Therefore: prefer FEWER, LARGER moves. A marginal setup with a tight target ' +
    'has negative expected value even when your directional read is correct.'
  );
  return lines.join('\n');
}
