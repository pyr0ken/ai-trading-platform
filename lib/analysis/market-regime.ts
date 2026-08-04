/**
 * Market Regime Detection Engine (Deterministic)
 *
 * WHY THIS EXISTS
 * ---------------
 * An LLM asked "is this a trending or ranging market?" will answer confidently
 * either way, because the question is qualitative and the model has no stable
 * threshold. That instability is a direct win-rate killer: a mean-reversion
 * setup executed inside a strong trend gets run over, and a breakout setup
 * executed inside a dead range bleeds fees.
 *
 * So we do NOT ask the model. We compute the regime here, from hard numbers,
 * and inject the answer into the prompt as a *fact* the model must respect.
 *
 * REGIME TAXONOMY
 * ---------------
 *  TRENDING_UP        ADX >= 25, EMA stack bullish, price above the stack
 *  TRENDING_DOWN      ADX >= 25, EMA stack bearish, price below the stack
 *  VOLATILE_EXPANSION ADX rising fast + Bollinger bandwidth spiking — direction
 *                     not yet resolved; breakout plays only, no fading
 *  COMPRESSION        Bollinger bandwidth in the bottom decile — energy coiling,
 *                     expect an imminent expansion, do not fade either side
 *  RANGING            ADX < 20, price oscillating between S/R — mean reversion
 *
 * TIMEFRAME ALIGNMENT
 * -------------------
 * Each timeframe votes BULLISH / BEARISH / NEUTRAL from its own EMA stack.
 * Higher timeframes carry more weight, because a 5m disagreement is noise while
 * a 1d disagreement is a regime change. The weighted agreement becomes
 * `alignmentScore`, and any timeframe voting against the majority is reported
 * explicitly so the model can name its own risk.
 *
 * ZERO-FABRICATION: every field is derived from real candles. When a timeframe
 * lacks mature data it is skipped, never guessed.
 */

import { CalculatedIndicators, CandleData, ProcessedTimeframeData } from '@/types/market';

export type RegimeType =
  | 'TRENDING_UP'
  | 'TRENDING_DOWN'
  | 'RANGING'
  | 'VOLATILE_EXPANSION'
  | 'COMPRESSION'
  | 'UNKNOWN';

export type DirectionalVote = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

/** Which playbook styles are sane in a given regime. */
export type StrategyStyle = 'TREND_FOLLOWING' | 'MEAN_REVERSION' | 'BREAKOUT' | 'STAND_ASIDE';

export interface TimeframeVote {
  timeframe: string;
  vote: DirectionalVote;
  /** Weight this timeframe carries in the alignment calculation. */
  weight: number;
  /** ADX at this timeframe, or null when not computable. */
  adx: number | null;
  /** Human-readable justification, surfaced in the prompt for auditability. */
  basis: string;
}

export interface MarketRegime {
  type: RegimeType;
  /** 0-100. How decisively the market is in this regime. */
  strength: number;
  /** 0-100. Weighted agreement among timeframes that have a directional opinion. */
  alignmentScore: number;
  /** 0-100. Share of total timeframe weight that is directional at all. */
  directionalParticipation: number;
  /** Net direction implied by the weighted vote. */
  dominantDirection: DirectionalVote;
  /** Timeframes voting against the dominant direction. */
  conflictingTimeframes: string[];
  /** Per-timeframe breakdown, for prompt transparency. */
  votes: TimeframeVote[];
  /** Strategy styles that fit this regime. */
  suitableStrategies: StrategyStyle[];
  /** Styles that historically bleed in this regime. */
  unsuitableStrategies: StrategyStyle[];
  /** Bollinger bandwidth percentile (0-100) on the primary timeframe. */
  volatilityPercentile: number | null;
  /** One-line summary injected into the prompt. */
  summary: string;
}

/**
 * Higher timeframes dominate. A 1d disagreement is a regime change; a 5m
 * disagreement is noise. Unlisted timeframes fall back to weight 1.
 */
const TIMEFRAME_WEIGHTS: Record<string, number> = {
  '1m': 0.5,
  '5m': 1,
  '15m': 1.5,
  '30m': 2,
  '1h': 3,
  '2h': 3.5,
  '4h': 4.5,
  '6h': 5,
  '12h': 5.5,
  '1d': 6,
  '3d': 6.5,
  '1w': 7,
};

const ADX_TRENDING = 25;
const ADX_RANGING = 20;

function weightFor(timeframe: string): number {
  return TIMEFRAME_WEIGHTS[timeframe] ?? 1;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Vote for a single timeframe from its EMA stack plus price position.
 *
 * We require BOTH the EMA stack ordering AND price position to agree before
 * casting a directional vote. A price below a bullish EMA stack is a pullback,
 * not a confirmed uptrend, and calling it bullish is how you buy the top.
 */
function voteForTimeframe(tf: string, data: ProcessedTimeframeData): TimeframeVote | null {
  const ind = data?.indicators;
  if (!ind) return null;

  const { ema_20: ema20, ema_50: ema50 } = ind;
  const price = data.latestClose;

  // Without a mature EMA stack we abstain rather than guess.
  if (!isFiniteNumber(ema20) || !isFiniteNumber(ema50) || !isFiniteNumber(price)) {
    return null;
  }

  const adx = isFiniteNumber(ind.adx_14) ? ind.adx_14 : null;
  const stackBullish = ema20 > ema50;
  const priceAboveStack = price > ema20;
  const priceBelowStack = price < ema20;

  let vote: DirectionalVote = 'NEUTRAL';
  let basis: string;

  if (stackBullish && priceAboveStack) {
    vote = 'BULLISH';
    basis = `EMA20 > EMA50 and price above EMA20`;
  } else if (!stackBullish && priceBelowStack) {
    vote = 'BEARISH';
    basis = `EMA20 < EMA50 and price below EMA20`;
  } else if (stackBullish) {
    // Bullish stack, price dipped below EMA20: a pullback inside an uptrend.
    // With real trend energy behind it this is still a bullish structure, just
    // an unconfirmed entry — calling it NEUTRAL discards a live trend read.
    if (adx !== null && adx >= ADX_TRENDING) {
      vote = 'BULLISH';
      basis = `EMA stack bullish, price pulled back below EMA20 but ADX ${adx.toFixed(1)} confirms trend energy (pullback in uptrend)`;
    } else {
      basis = `EMA stack bullish but price below EMA20 and no trend confirmation (pullback, unconfirmed)`;
    }
  } else {
    // Bearish stack, price popped above EMA20: relief bounce inside a downtrend.
    if (adx !== null && adx >= ADX_TRENDING) {
      vote = 'BEARISH';
      basis = `EMA stack bearish, price bounced above EMA20 but ADX ${adx.toFixed(1)} confirms trend energy (relief bounce in downtrend)`;
    } else {
      basis = `EMA stack bearish but price above EMA20 and no trend confirmation (relief bounce, unconfirmed)`;
    }
  }

  // A directional read inside a dead tape is not tradeable information.
  if (vote !== 'NEUTRAL' && adx !== null && adx < ADX_RANGING) {
    vote = 'NEUTRAL';
    basis = `${basis}, but ADX ${adx.toFixed(1)} < ${ADX_RANGING} (no trend energy)`;
  }

  return { timeframe: tf, vote, weight: weightFor(tf), adx, basis };
}

/**
 * Bollinger bandwidth percentile over the mature lookback window.
 *
 * Bandwidth answers "is volatility unusually low or high *for this market*",
 * which a raw ATR number cannot: $50 of range is compression on BTC and chaos
 * on a $2 altcoin. Percentile normalises that away.
 *
 * GUARD: a percentile is only meaningful if the underlying distribution has
 * spread. On a flat or synthetic series every reading is identical, and the
 * naive "count values below current" formula returns 0 — which would be read as
 * "extreme compression" and trigger a breakout bias out of thin air. When the
 * distribution is degenerate we return null and the caller falls back to ADX.
 */
function bandwidthPercentile(candles: Array<CandleData & { indicators: CalculatedIndicators }>): number | null {
  const widths = candles
    .map((c) => c.indicators?.bb_bandwidth)
    .filter((w): w is number => isFiniteNumber(w) && w > 0);

  if (widths.length < 30) return null;

  const current = widths[widths.length - 1];

  const min = Math.min(...widths);
  const max = Math.max(...widths);

  // Degenerate distribution: no dispersion to rank against.
  if (max - min <= Number.EPSILON) return null;

  // Require the spread to be a non-trivial fraction of the level, otherwise
  // we are ranking floating-point noise.
  const mean = widths.reduce((a, b) => a + b, 0) / widths.length;
  if (mean <= 0 || (max - min) / mean < 0.05) return null;

  // Mid-rank (average of strictly-below and at-or-below) so that ties land in
  // the middle of their band instead of collapsing to the bottom.
  const below = widths.filter((w) => w < current).length;
  const atOrBelow = widths.filter((w) => w <= current).length;
  const rank = (below + atOrBelow) / 2;

  return Number(((rank / widths.length) * 100).toFixed(1));
}

/**
 * Detect the market regime from the full multi-timeframe payload.
 *
 * @param timeframes  All processed timeframes (already indicator-enriched).
 * @param primaryTf   The timeframe the trade will actually execute on.
 */
export function detectMarketRegime(
  timeframes: Record<string, ProcessedTimeframeData>,
  primaryTf: string
): MarketRegime {
  const entries = Object.entries(timeframes || {});

  // No usable data — say so plainly instead of inventing a regime.
  if (entries.length === 0) {
    return {
      type: 'UNKNOWN',
      strength: 0,
      alignmentScore: 0,
      directionalParticipation: 0,
      dominantDirection: 'NEUTRAL',
      conflictingTimeframes: [],
      votes: [],
      suitableStrategies: ['STAND_ASIDE'],
      unsuitableStrategies: ['TREND_FOLLOWING', 'MEAN_REVERSION', 'BREAKOUT'],
      volatilityPercentile: null,
      summary: 'N/A (Data Unavailable) — no timeframe data to classify regime.',
    };
  }

  // ── 1. Collect per-timeframe votes ──────────────────────────────────────
  const votes: TimeframeVote[] = [];
  for (const [tf, data] of entries) {
    const v = voteForTimeframe(tf, data);
    if (v) votes.push(v);
  }

  if (votes.length === 0) {
    return {
      type: 'UNKNOWN',
      strength: 0,
      alignmentScore: 0,
      directionalParticipation: 0,
      dominantDirection: 'NEUTRAL',
      conflictingTimeframes: [],
      votes: [],
      suitableStrategies: ['STAND_ASIDE'],
      unsuitableStrategies: ['TREND_FOLLOWING', 'MEAN_REVERSION', 'BREAKOUT'],
      volatilityPercentile: null,
      summary: 'N/A (Data Unavailable) — indicators not mature on any timeframe.',
    };
  }

  // ── 2. Weighted directional tally ───────────────────────────────────────
  let bullWeight = 0;
  let bearWeight = 0;
  let neutralWeight = 0;

  for (const v of votes) {
    if (v.vote === 'BULLISH') bullWeight += v.weight;
    else if (v.vote === 'BEARISH') bearWeight += v.weight;
    else neutralWeight += v.weight;
  }

  const totalWeight = bullWeight + bearWeight + neutralWeight;
  const directionalWeight = bullWeight + bearWeight;

  /**
   * Dominance is decided ONLY between the two directional camps.
   *
   * A NEUTRAL vote is an *abstention*, not a vote for "no direction" — letting
   * it compete against BULLISH/BEARISH means a single undecided high-timeframe
   * can veto a genuine directional consensus on everything below it, and the
   * whole read collapses to NEUTRAL. That is how real setups get thrown away.
   *
   * Abstentions still matter, but they express themselves through
   * `directionalParticipation` (how much of the board is even voting), not by
   * out-voting the sides.
   */
  let dominantDirection: DirectionalVote = 'NEUTRAL';
  if (bullWeight > bearWeight) dominantDirection = 'BULLISH';
  else if (bearWeight > bullWeight) dominantDirection = 'BEARISH';
  // Exactly equal directional weight (or none at all) stays NEUTRAL: a genuine
  // standoff, which is materially different from an abstention-driven neutral.

  /**
   * Alignment measures agreement *among timeframes that actually have an
   * opinion*. Measuring it against the total weight would report "90% aligned"
   * for a tape where every timeframe is undecided — technically true, but it
   * reads to the model as high conviction and is exactly backwards.
   */
  let alignmentScore: number;
  if (dominantDirection === 'NEUTRAL' || directionalWeight === 0) {
    alignmentScore = 0;
  } else {
    const dominantWeight = dominantDirection === 'BULLISH' ? bullWeight : bearWeight;
    alignmentScore = Number(((dominantWeight / directionalWeight) * 100).toFixed(1));
  }

  /**
   * How much of the board is even participating. A 100% alignment built on a
   * single 5m vote is not the same as 100% across 1h/4h/1d, and the model must
   * be able to tell those apart.
   */
  const directionalParticipation =
    totalWeight > 0 ? Number(((directionalWeight / totalWeight) * 100).toFixed(1)) : 0;

  /**
   * Conflicts are only meaningful between opposing *directional* votes.
   * Listing abstentions as "conflicting" (or listing every directional vote as
   * conflicting with a NEUTRAL dominant read) is noise that trains the model to
   * ignore the field.
   */
  const conflictingTimeframes =
    dominantDirection === 'NEUTRAL'
      ? // True standoff: report both camps, since neither won.
        votes.filter((v) => v.vote !== 'NEUTRAL').map((v) => v.timeframe)
      : votes
          .filter((v) => v.vote !== 'NEUTRAL' && v.vote !== dominantDirection)
          .map((v) => v.timeframe);

  // ── 3. Classify the regime on the execution timeframe ───────────────────
  const primaryData = timeframes[primaryTf] ?? entries[0][1];
  const primaryInd = primaryData?.indicators;
  const primaryAdx = isFiniteNumber(primaryInd?.adx_14) ? (primaryInd!.adx_14 as number) : null;
  const volatilityPercentile = bandwidthPercentile(primaryData?.candles ?? []);

  let type: RegimeType;
  let strength: number;

  const hasTrendEnergy = primaryAdx !== null && primaryAdx >= ADX_TRENDING;
  const isDirectional = dominantDirection !== 'NEUTRAL';

  /**
   * Classification order matters, and trend is checked FIRST.
   *
   * A strong directional trend can perfectly well run inside narrow Bollinger
   * bands (a steady grind up is low-bandwidth by construction). Checking
   * compression first would relabel that grind as "coiling, wait for breakout"
   * and talk the model out of the highest-quality setup on the board.
   *
   * So: confirmed trend wins. Compression/expansion only classify tape that has
   * NO confirmed directional trend behind it.
   */
  if (hasTrendEnergy && isDirectional) {
    type = dominantDirection === 'BULLISH' ? 'TRENDING_UP' : 'TRENDING_DOWN';
    // ADX 25 -> 50 maps onto 50 -> 100 strength; above 50 ADX is already maxed.
    strength = Number(Math.min(100, (primaryAdx! / 50) * 100).toFixed(1));
  } else if (volatilityPercentile !== null && volatilityPercentile <= 10) {
    // Squeeze with no trend behind it: energy coiling, direction unresolved.
    type = 'COMPRESSION';
    strength = Number((100 - volatilityPercentile * 5).toFixed(1));
  } else if (volatilityPercentile !== null && volatilityPercentile >= 90) {
    // Wide bands without trend structure = violent chop, the worst tape to trade.
    type = 'VOLATILE_EXPANSION';
    strength = Number(volatilityPercentile.toFixed(1));
  } else if (primaryAdx !== null && primaryAdx < ADX_RANGING) {
    type = 'RANGING';
    strength = Number(Math.min(100, ((ADX_RANGING - primaryAdx) / ADX_RANGING) * 100).toFixed(1));
  } else if (primaryAdx === null) {
    // No ADX and no usable bandwidth: we genuinely do not know.
    type = 'UNKNOWN';
    strength = 0;
  } else {
    // ADX in the 20-25 grey zone, or trend energy without directional consensus:
    // something is building but nothing is confirmed.
    type = isDirectional ? 'VOLATILE_EXPANSION' : 'RANGING';
    strength = 40;
  }

  // ── 4. Map regime to permissible strategy styles ────────────────────────
  let suitableStrategies: StrategyStyle[];
  let unsuitableStrategies: StrategyStyle[];

  switch (type) {
    case 'TRENDING_UP':
    case 'TRENDING_DOWN':
      suitableStrategies = ['TREND_FOLLOWING', 'BREAKOUT'];
      unsuitableStrategies = ['MEAN_REVERSION'];
      break;
    case 'RANGING':
      suitableStrategies = ['MEAN_REVERSION'];
      unsuitableStrategies = ['TREND_FOLLOWING', 'BREAKOUT'];
      break;
    case 'COMPRESSION':
      suitableStrategies = ['BREAKOUT'];
      unsuitableStrategies = ['MEAN_REVERSION', 'TREND_FOLLOWING'];
      break;
    case 'VOLATILE_EXPANSION':
      suitableStrategies = ['BREAKOUT', 'STAND_ASIDE'];
      unsuitableStrategies = ['MEAN_REVERSION'];
      break;
    default:
      suitableStrategies = ['STAND_ASIDE'];
      unsuitableStrategies = ['TREND_FOLLOWING', 'MEAN_REVERSION', 'BREAKOUT'];
  }

  // ── 5. Prompt-facing summary ────────────────────────────────────────────
  const adxText = primaryAdx !== null ? `ADX ${primaryAdx.toFixed(1)}` : 'ADX N/A';
  const volText =
    volatilityPercentile !== null ? `volatility ${volatilityPercentile}th pct` : 'volatility N/A';
  const conflictText =
    conflictingTimeframes.length > 0
      ? `conflicting: ${conflictingTimeframes.join(', ')}`
      : 'no timeframe conflicts';

  const summary =
    `${type} (strength ${strength}/100) on ${primaryTf} | ${adxText}, ${volText} | ` +
    `dominant ${dominantDirection}, alignment ${alignmentScore}% of directional weight ` +
    `(${directionalParticipation}% of timeframes directional) | ${conflictText}`;

  return {
    type,
    strength,
    alignmentScore,
    directionalParticipation,
    dominantDirection,
    conflictingTimeframes,
    votes,
    suitableStrategies,
    unsuitableStrategies,
    volatilityPercentile,
    summary,
  };
}

/**
 * Render the regime block for the LLM prompt.
 *
 * Framed as non-negotiable fact, because the whole point is to stop the model
 * from re-deciding something we already measured.
 */
export function renderRegimeForPrompt(regime: MarketRegime): string {
  const lines: string[] = [];

  lines.push('MARKET REGIME (deterministic, computed from candles — treat as FACT, do not re-derive):');
  lines.push(`- Regime: ${regime.type} | Strength: ${regime.strength}/100`);
  lines.push(
    `- Dominant Direction: ${regime.dominantDirection} | Alignment among directional timeframes: ${regime.alignmentScore}%`
  );
  lines.push(
    `- Directional Participation: ${regime.directionalParticipation}% of timeframe weight has a directional read ` +
      `(the rest are undecided — low participation means weak evidence regardless of alignment)`
  );

  if (regime.volatilityPercentile !== null) {
    lines.push(
      `- Volatility Percentile: ${regime.volatilityPercentile}th (Bollinger bandwidth vs its own history)`
    );
  } else {
    lines.push('- Volatility Percentile: N/A (Data Unavailable)');
  }

  if (regime.votes.length > 0) {
    lines.push('- Timeframe Votes:');
    for (const v of regime.votes) {
      const adxTxt = v.adx !== null ? `ADX ${v.adx.toFixed(1)}` : 'ADX N/A';
      lines.push(`  * ${v.timeframe}: ${v.vote} (w=${v.weight}, ${adxTxt}) — ${v.basis}`);
    }
  }

  if (regime.conflictingTimeframes.length > 0) {
    if (regime.dominantDirection === 'NEUTRAL') {
      const bulls = regime.votes.filter((v) => v.vote === 'BULLISH').map((v) => v.timeframe);
      const bears = regime.votes.filter((v) => v.vote === 'BEARISH').map((v) => v.timeframe);
      lines.push(
        `- ⚠ STANDOFF: bullish [${bulls.join(', ') || 'none'}] vs bearish [${bears.join(', ') || 'none'}] ` +
          `carry equal weight. There is no directional consensus — prefer WAIT over forcing a side.`
      );
    } else {
      lines.push(
        `- ⚠ CONFLICT: ${regime.conflictingTimeframes.join(', ')} disagree with the dominant ${regime.dominantDirection} read. ` +
          `Lower conviction and state this conflict explicitly in your reasoning.`
      );
    }
  } else {
    lines.push('- No directional conflicts between timeframes.');
  }

  lines.push(`- Suitable strategy styles: ${regime.suitableStrategies.join(', ')}`);
  lines.push(`- Unsuitable in this regime: ${regime.unsuitableStrategies.join(', ')}`);
  lines.push(
    '- REGIME RULE: your chosen strategy MUST belong to the suitable list. ' +
      'Proposing an unsuitable style is a hard error and will be penalised by the validator.'
  );

  return lines.join('\n');
}
