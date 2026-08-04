/**
 * Decision Zone Engine (Deterministic)
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * A bare "BUY" tells the trader nothing about where the idea starts, where it
 * ends, or what would prove it wrong. Real trading is conditional: price
 * arrives somewhere, and *there* it either holds or fails — and each outcome
 * implies a different next move.
 *
 * So instead of one directionless verdict, we hand the model a map of the
 * actual prices where a decision gets made, each annotated with:
 *   - how strong the level is (touch count, recency)
 *   - how far away it is (in % and in ATR units)
 *   - what confirmation would be required to call a break
 *   - where price likely goes if it holds, and if it breaks
 *
 * WHY ZONES, NOT LINES
 * --------------------
 * Price does not respect exact numbers. A "resistance at 4055.00" gets pierced
 * to 4056.80 and reverses — a line-based stop dies, a zone-based stop survives.
 * Zone half-width is derived from real data: the dispersion of the swings that
 * formed the cluster, floored by a fraction of ATR so it is never absurdly
 * tight on a volatile instrument.
 *
 * ZERO FABRICATION
 * ----------------
 * Every price here comes from actual swing pivots. Probabilities come from
 * measurable evidence (touch count, regime alignment, momentum, volume) via an
 * explicit, auditable formula — never from a guess. If the inputs are missing,
 * the zone is omitted rather than invented.
 */

import { CandleData, MarketTechnicalFacts, ProcessedTimeframeData } from '@/types/market';
import { TechnicalIndicatorEngine } from '@/lib/market/indicators';
import { MarketRegime } from './market-regime';

export type ZoneKind = 'SUPPORT' | 'RESISTANCE';

export interface ZoneBranch {
  /** Where price is expected to travel next on this branch. */
  nextTarget: number;
  /** Move size from the zone to the target, in percent. */
  expectedMovePct: number;
  /** Same distance expressed in ATR units — the honest measure of "far". */
  distanceInAtr: number;
  /** What the target actually is, so the model can cite it. */
  targetBasis: string;
}

export interface DecisionZone {
  /** Stable label used in the prompt and in model output ('R1', 'S2', ...). */
  id: string;
  kind: ZoneKind;
  /** Zone boundaries — price is "at" the zone anywhere inside this band. */
  priceLow: number;
  priceHigh: number;
  /** Cluster centre. */
  priceMid: number;
  /** Signed distance from spot to the zone centre, in percent. */
  distancePct: number;
  /** Absolute distance in ATR units. */
  distanceInAtr: number;
  /** Number of swing pivots that formed this level. */
  touchCount: number;
  /** 0-100 composite of touch count and recency. */
  strength: number;
  /** How many bars ago the level was last respected. */
  barsSinceLastTouch: number;

  /** Probability price REJECTS here (holds), 0-100. */
  rejectionProbability: number;
  /** Probability price BREAKS through, 0-100. Complement of rejection. */
  breakProbability: number;
  /** Concrete, checkable condition that would confirm a break. */
  breakConfirmation: string;

  /** Path if the zone holds. Null when there is no measurable next level. */
  ifRejected: ZoneBranch | null;
  /** Path if the zone breaks. Null when there is no measurable next level. */
  ifBroken: ZoneBranch | null;

  /** Plain-language justification of the probability split. */
  probabilityBasis: string;
}

export interface DecisionZoneMap {
  spotPrice: number;
  atr: number;
  /** Resistances above spot, nearest first. */
  resistanceZones: DecisionZone[];
  /** Supports below spot, nearest first. */
  supportZones: DecisionZone[];
  /** The zone price is currently sitting inside, if any. */
  activeZoneId: string | null;
  /** Nearest zone in either direction — the next decision point. */
  nextDecisionZoneId: string | null;
  /** Human summary for the prompt header. */
  summary: string;
}

/**
 * Zone half-width.
 *
 * Two competing needs: wide enough that normal wick noise does not count as a
 * break, tight enough to still be a usable entry band. We take the larger of
 * the cluster's own dispersion and a fraction of ATR, then clamp so a single
 * freak swing cannot inflate a zone into uselessness.
 */
const ATR_HALF_WIDTH_FLOOR = 0.25; // at least a quarter ATR either side
const ATR_HALF_WIDTH_CAP = 1.0; // never more than one full ATR either side

/**
 * Price-precision helper.
 *
 * Hardcoding `toFixed(2)` silently destroys every sub-dollar asset: DOGE at
 * $0.10234 rounds to $0.10, a zone's low and high collapse to the same number,
 * and the entire zone map degenerates into zero-width garbage. The bug is
 * invisible when testing on BTC or gold and catastrophic on altcoins.
 *
 * Precision therefore scales with magnitude, keeping ~6 significant figures
 * where it matters while staying readable on large-cap prices.
 */
function priceDecimals(price: number): number {
  const p = Math.abs(price);
  if (!Number.isFinite(p) || p === 0) return 2;
  if (p >= 1000) return 2;
  if (p >= 100) return 3;
  if (p >= 1) return 4;
  if (p >= 0.01) return 6;
  return 8;
}

/** Round a price to a magnitude-appropriate precision. */
function roundPrice(price: number, reference?: number): number {
  const decimals = priceDecimals(reference ?? price);
  return Number(price.toFixed(decimals));
}

function zoneHalfWidth(clusterSpread: number, atr: number, price: number): number {
  // Fallback when ATR is unusable: 0.15% of price is a reasonable market default.
  const safeAtr = Number.isFinite(atr) && atr > 0 ? atr : price * 0.0015;

  const floor = safeAtr * ATR_HALF_WIDTH_FLOOR;
  const cap = safeAtr * ATR_HALF_WIDTH_CAP;

  // Cluster dispersion is a full-width measure; halve it to get half-width.
  const fromCluster = clusterSpread / 2;

  const raw = Math.min(cap, Math.max(floor, fromCluster));

  // Guarantee a non-degenerate band even if ATR and spread are both ~0.
  const absoluteFloor = Math.abs(price) * 0.0002;
  return Math.max(raw, absoluteFloor);
}

/**
 * Composite level strength, 0-100.
 *
 * Touch count dominates (a level respected repeatedly is real), but recency
 * matters: a level last touched 200 bars ago has had its liquidity consumed and
 * is far less likely to hold than one defended last week.
 */
function levelStrength(touchCount: number, barsSince: number, totalBars: number): number {
  // 1 touch -> 30, 2 -> 55, 3 -> 72, 4 -> 83, 5+ -> approaching 100
  const touchScore = Math.min(100, 100 * (1 - Math.pow(0.55, touchCount)));

  // Fresh (0 bars ago) -> 1.0, half the window ago -> ~0.6, full window -> 0.35
  const recencyRatio = totalBars > 0 ? Math.min(1, barsSince / totalBars) : 1;
  const recencyMultiplier = 1 - 0.65 * recencyRatio;

  return Number(Math.max(0, Math.min(100, touchScore * recencyMultiplier)).toFixed(1));
}

/**
 * Rejection vs break probability for a zone.
 *
 * Start from level strength (strong levels reject), then adjust for the forces
 * actually pushing on it:
 *   - regime direction: a downtrend pressing into support raises break odds
 *   - momentum (RSI extremes): exhaustion favours rejection
 *   - breakout state: a confirmed BOS through this level means it already failed
 *   - proximity: distant levels have more room for the story to change
 *
 * Returns rejection probability clamped to a sane band. We never emit 0 or 100
 * because certainty is a lie in a probabilistic system.
 */
function rejectionProbability(
  zone: {
    kind: ZoneKind;
    strength: number;
    priceMid: number;
    distanceInAtr: number;
    barsSinceLastTouch: number;
  },
  regime: MarketRegime,
  facts: MarketTechnicalFacts,
  rsi: number | null
): { probability: number; basis: string } {
  const reasons: string[] = [];

  // Base: strength maps onto a 40-75 rejection band. Even a very strong level
  // is not a guarantee, and even a weak one is not free to pass.
  let p = 40 + (zone.strength / 100) * 35;
  reasons.push(`strength ${zone.strength}/100 -> base ${p.toFixed(0)}%`);

  // ── Regime pressure ─────────────────────────────────────────────────────
  const pressingDown = regime.dominantDirection === 'BEARISH';
  const pressingUp = regime.dominantDirection === 'BULLISH';
  const trendConfirmed = regime.type === 'TRENDING_UP' || regime.type === 'TRENDING_DOWN';

  if (zone.kind === 'SUPPORT' && pressingDown) {
    const adj = trendConfirmed ? 14 : 7;
    p -= adj;
    reasons.push(`bearish regime pressing into support -${adj}`);
  } else if (zone.kind === 'RESISTANCE' && pressingUp) {
    const adj = trendConfirmed ? 14 : 7;
    p -= adj;
    reasons.push(`bullish regime pressing into resistance -${adj}`);
  } else if (zone.kind === 'SUPPORT' && pressingUp) {
    p += 8;
    reasons.push('bullish regime supports the level +8');
  } else if (zone.kind === 'RESISTANCE' && pressingDown) {
    p += 8;
    reasons.push('bearish regime defends the level +8');
  }

  // ── Momentum exhaustion ─────────────────────────────────────────────────
  // Overbought price arriving at resistance is far likelier to reject than
  // fresh momentum arriving at the same level.
  if (rsi !== null) {
    if (zone.kind === 'RESISTANCE' && rsi > 70) {
      p += 10;
      reasons.push(`RSI ${rsi.toFixed(0)} overbought into resistance +10`);
    } else if (zone.kind === 'SUPPORT' && rsi < 30) {
      p += 10;
      reasons.push(`RSI ${rsi.toFixed(0)} oversold into support +10`);
    } else if (zone.kind === 'RESISTANCE' && rsi < 45) {
      p -= 5;
      reasons.push(`weak RSI ${rsi.toFixed(0)} but approaching resistance -5`);
    } else if (zone.kind === 'SUPPORT' && rsi > 55) {
      p -= 5;
      reasons.push(`firm RSI ${rsi.toFixed(0)} approaching support -5`);
    }
  }

  // ── Already-broken structure ────────────────────────────────────────────
  // If a confirmed BOS just took out this exact level, treating it as a wall
  // is how you fade a real breakout.
  if (facts.breakoutType === 'BOS_BULLISH' && zone.kind === 'RESISTANCE') {
    p -= 12;
    reasons.push('confirmed bullish BOS in progress -12');
  } else if (facts.breakoutType === 'BOS_BEARISH' && zone.kind === 'SUPPORT') {
    p -= 12;
    reasons.push('confirmed bearish BOS in progress -12');
  }

  // ── Volatile tape erodes levels ─────────────────────────────────────────
  if (regime.type === 'VOLATILE_EXPANSION') {
    p -= 8;
    reasons.push('volatile expansion erodes level integrity -8');
  } else if (regime.type === 'RANGING') {
    p += 10;
    reasons.push('ranging regime favours mean reversion at edges +10');
  }

  // ── Stale level decay ───────────────────────────────────────────────────
  // A level last defended hundreds of bars ago has had its resting liquidity
  // consumed or cancelled. It is still worth showing (price remembers), but
  // treating it with the same conviction as a level defended last week is how
  // you place a stop behind a wall that no longer exists.
  if (zone.barsSinceLastTouch > 200) {
    const decay = Math.min(12, 6 + (zone.barsSinceLastTouch - 200) / 50);
    p -= decay;
    reasons.push(`stale: last respected ${zone.barsSinceLastTouch} bars ago -${decay.toFixed(0)}`);
  }

  // ── Distance uncertainty ────────────────────────────────────────────────
  // Far zones: the market has time to change character before arrival, so pull
  // the estimate toward the coin-flip rather than pretending we know.
  if (zone.distanceInAtr > 3) {
    const pull = Math.min(10, (zone.distanceInAtr - 3) * 3);
    p = p + (50 - p) * (pull / 100);
    reasons.push(`${zone.distanceInAtr.toFixed(1)} ATR away, regressed toward 50%`);
  }

  // Clamp: never claim certainty in either direction.
  const clamped = Math.max(20, Math.min(80, p));

  return {
    probability: Number(clamped.toFixed(1)),
    basis: reasons.join('; '),
  };
}

/** Break confirmation phrased as something the trader can literally check. */
function breakConfirmationText(kind: ZoneKind, zone: { priceHigh: number; priceLow: number }, timeframe: string): string {
  const side = kind === 'RESISTANCE' ? 'above' : 'below';
  const level = kind === 'RESISTANCE' ? zone.priceHigh : zone.priceLow;
  return `${timeframe} candle CLOSE ${side} ${level} with volume >= 1.5x the 10-bar average`;
}

function pctChange(from: number, to: number): number {
  if (!Number.isFinite(from) || from === 0) return 0;
  return Number((((to - from) / from) * 100).toFixed(2));
}

/**
 * Build the full decision-zone map.
 *
 * @param primaryData  Processed data for the execution timeframe (mature candles).
 * @param facts        Technical facts already extracted for this timeframe.
 * @param regime       Deterministic regime read.
 * @param timeframe    Execution timeframe label, used in confirmation text.
 * @param maxPerSide   Zones per side. Default 3 (=6 total), per design decision.
 */
export function buildDecisionZones(
  primaryData: ProcessedTimeframeData | undefined,
  facts: MarketTechnicalFacts,
  regime: MarketRegime,
  timeframe: string,
  maxPerSide = 3
): DecisionZoneMap {
  const emptyMap: DecisionZoneMap = {
    spotPrice: 0,
    atr: 0,
    resistanceZones: [],
    supportZones: [],
    activeZoneId: null,
    nextDecisionZoneId: null,
    summary: 'N/A (Data Unavailable) — insufficient candle data to build decision zones.',
  };

  if (!primaryData || !Array.isArray(primaryData.candles) || primaryData.candles.length < 20) {
    return emptyMap;
  }

  const candles: CandleData[] = primaryData.candles;
  const spotPrice = primaryData.latestClose;

  if (!Number.isFinite(spotPrice) || spotPrice <= 0) return emptyMap;

  const atrRaw = facts.atrVolatility;
  const atr = Number.isFinite(atrRaw) && atrRaw > 0 ? atrRaw : spotPrice * 0.0015;

  const rsiRaw = primaryData.indicators?.rsi_14;
  const rsi = typeof rsiRaw === 'number' && Number.isFinite(rsiRaw) ? rsiRaw : null;

  // Pull clusters WITH metadata so strength is evidence-based, not assumed.
  // ATR is passed so "same level" is defined in volatility units rather than a
  // flat percentage — see extractSupportResistanceDetailed for why that matters.
  const detailed = TechnicalIndicatorEngine.extractSupportResistanceDetailed(candles, 5, maxPerSide, atr);
  const totalBars = candles.length;

  /** Shared construction for one side of the book. */
  const buildSide = (
    levels: Array<{ price: number; touchCount: number; lastTouchIndex: number; spread: number }>,
    kind: ZoneKind
  ): DecisionZone[] => {
    const prefix = kind === 'RESISTANCE' ? 'R' : 'S';

    return levels.map((lvl, idx) => {
      const halfWidth = zoneHalfWidth(lvl.spread, atr, spotPrice);
      const priceLow = roundPrice(lvl.price - halfWidth, spotPrice);
      const priceHigh = roundPrice(lvl.price + halfWidth, spotPrice);
      const barsSince = Math.max(0, totalBars - 1 - lvl.lastTouchIndex);
      const strength = levelStrength(lvl.touchCount, barsSince, totalBars);
      const distanceAbs = Math.abs(lvl.price - spotPrice);

      const zoneCore = {
        kind,
        strength,
        priceMid: lvl.price,
        distanceInAtr: Number((distanceAbs / atr).toFixed(2)),
        barsSinceLastTouch: barsSince,
      };

      const { probability: rejectionProb, basis } = rejectionProbability(zoneCore, regime, facts, rsi);

      return {
        id: `${prefix}${idx + 1}`,
        kind,
        priceLow,
        priceHigh,
        priceMid: lvl.price,
        distancePct: pctChange(spotPrice, lvl.price),
        distanceInAtr: zoneCore.distanceInAtr,
        touchCount: lvl.touchCount,
        strength,
        barsSinceLastTouch: barsSince,
        rejectionProbability: rejectionProb,
        breakProbability: Number((100 - rejectionProb).toFixed(1)),
        breakConfirmation: breakConfirmationText(kind, { priceLow, priceHigh }, timeframe),
        // Branches are filled in after both sides exist, since a rejection at
        // resistance targets a SUPPORT and vice versa.
        ifRejected: null,
        ifBroken: null,
        probabilityBasis: basis,
      } satisfies DecisionZone;
    });
  };

  const resistanceZones = buildSide(detailed.resistances, 'RESISTANCE');
  const supportZones = buildSide(detailed.supports, 'SUPPORT');

  /**
   * Wire the conditional branches.
   *
   * Rejection at a resistance sends price toward the nearest support (and vice
   * versa). A break through a resistance sends price toward the NEXT resistance
   * up. When no measured level exists in that direction we emit null instead of
   * inventing a target — an ATR-projected number would look authoritative while
   * being pure extrapolation.
   */
  const branch = (fromPrice: number, toPrice: number, basis: string): ZoneBranch => ({
    nextTarget: roundPrice(toPrice, spotPrice),
    expectedMovePct: pctChange(fromPrice, toPrice),
    distanceInAtr: Number((Math.abs(toPrice - fromPrice) / atr).toFixed(2)),
    targetBasis: basis,
  });

  resistanceZones.forEach((z, i) => {
    // Held -> rotate back down to nearest support.
    const nearestSupport = supportZones[0];
    if (nearestSupport) {
      z.ifRejected = branch(
        z.priceMid,
        nearestSupport.priceMid,
        `nearest measured support ${nearestSupport.id} (${nearestSupport.touchCount} touches)`
      );
    }
    // Broken -> continue to next resistance up.
    const nextUp = resistanceZones[i + 1];
    if (nextUp) {
      z.ifBroken = branch(
        z.priceMid,
        nextUp.priceMid,
        `next measured resistance ${nextUp.id} (${nextUp.touchCount} touches)`
      );
    }
  });

  supportZones.forEach((z, i) => {
    const nearestResistance = resistanceZones[0];
    if (nearestResistance) {
      z.ifRejected = branch(
        z.priceMid,
        nearestResistance.priceMid,
        `nearest measured resistance ${nearestResistance.id} (${nearestResistance.touchCount} touches)`
      );
    }
    const nextDown = supportZones[i + 1];
    if (nextDown) {
      z.ifBroken = branch(
        z.priceMid,
        nextDown.priceMid,
        `next measured support ${nextDown.id} (${nextDown.touchCount} touches)`
      );
    }
  });

  // Is price currently inside a zone? That changes everything: you do not chase
  // an entry mid-zone, you wait for the zone to resolve.
  const allZones = [...resistanceZones, ...supportZones];
  const active = allZones.find((z) => spotPrice >= z.priceLow && spotPrice <= z.priceHigh);

  // Nearest decision point by absolute distance.
  const nearest = allZones
    .slice()
    .sort((a, b) => Math.abs(a.priceMid - spotPrice) - Math.abs(b.priceMid - spotPrice))[0];

  const summaryParts: string[] = [];
  summaryParts.push(`spot ${roundPrice(spotPrice)}`);
  summaryParts.push(`ATR ${roundPrice(atr, spotPrice)}`);
  summaryParts.push(`${resistanceZones.length} resistance / ${supportZones.length} support zones`);
  if (active) {
    summaryParts.push(`price INSIDE ${active.id} (${active.priceLow}-${active.priceHigh})`);
  } else if (nearest) {
    summaryParts.push(`next decision ${nearest.id} at ${nearest.distancePct > 0 ? '+' : ''}${nearest.distancePct}%`);
  }

  return {
    spotPrice: roundPrice(spotPrice),
    atr: roundPrice(atr, spotPrice),
    resistanceZones,
    supportZones,
    activeZoneId: active?.id ?? null,
    nextDecisionZoneId: nearest?.id ?? null,
    summary: summaryParts.join(' | '),
  };
}

/** Render one zone as a compact, self-describing prompt block. */
function renderZone(z: DecisionZone): string {
  const lines: string[] = [];
  const sign = z.distancePct > 0 ? '+' : '';

  const staleTag = z.barsSinceLastTouch > 200 ? ' ⚠STALE' : '';

  lines.push(
    `  [${z.id}] ${z.kind} ${z.priceLow} — ${z.priceHigh} (mid ${z.priceMid}) | ` +
      `${sign}${z.distancePct}% away (${z.distanceInAtr} ATR) | ` +
      `${z.touchCount} touches, strength ${z.strength}/100, last respected ${z.barsSinceLastTouch} bars ago${staleTag}`
  );
  lines.push(
    `      REJECT ${z.rejectionProbability}% vs BREAK ${z.breakProbability}% — ${z.probabilityBasis}`
  );
  lines.push(`      Break confirmed by: ${z.breakConfirmation}`);

  if (z.ifRejected) {
    lines.push(
      `      IF HOLDS -> ${z.ifRejected.nextTarget} (${z.ifRejected.expectedMovePct > 0 ? '+' : ''}${z.ifRejected.expectedMovePct}%, ${z.ifRejected.distanceInAtr} ATR) via ${z.ifRejected.targetBasis}`
    );
  } else {
    lines.push('      IF HOLDS -> N/A (no measured level in that direction; do not invent one)');
  }

  if (z.ifBroken) {
    lines.push(
      `      IF BREAKS -> ${z.ifBroken.nextTarget} (${z.ifBroken.expectedMovePct > 0 ? '+' : ''}${z.ifBroken.expectedMovePct}%, ${z.ifBroken.distanceInAtr} ATR) via ${z.ifBroken.targetBasis}`
    );
  } else {
    lines.push('      IF BREAKS -> N/A (no further measured level; treat as open-ended, state that explicitly)');
  }

  return lines.join('\n');
}

/**
 * Render the decision-zone map for the LLM prompt.
 *
 * Framed as the ONLY legal source of price levels, because the failure mode we
 * are eliminating is the model inventing a round-number target that no swing in
 * the data supports.
 */
export function renderDecisionZonesForPrompt(map: DecisionZoneMap): string {
  if (map.resistanceZones.length === 0 && map.supportZones.length === 0) {
    return (
      'DECISION ZONES: N/A (Data Unavailable) — no valid swing structure detected. ' +
      'Do NOT invent price levels. State that structure is unreadable and recommend WAIT.'
    );
  }

  const lines: string[] = [];

  lines.push('DECISION ZONES (deterministic, derived from real swing pivots — these are the ONLY valid price levels):');
  lines.push(`- Context: ${map.summary}`);

  if (map.activeZoneId) {
    lines.push(
      `- ⚠ PRICE IS CURRENTLY INSIDE ZONE ${map.activeZoneId}. ` +
        `The zone is unresolved: do NOT recommend entry until it either holds or breaks with confirmation.`
    );
  } else if (map.nextDecisionZoneId) {
    lines.push(`- Next decision point: ${map.nextDecisionZoneId}`);
  }

  if (map.resistanceZones.length > 0) {
    lines.push('- RESISTANCE ZONES (above price, nearest first):');
    for (const z of map.resistanceZones) lines.push(renderZone(z));
  } else {
    lines.push('- RESISTANCE ZONES: none measured above current price (open upside — say so explicitly).');
  }

  if (map.supportZones.length > 0) {
    lines.push('- SUPPORT ZONES (below price, nearest first):');
    for (const z of map.supportZones) lines.push(renderZone(z));
  } else {
    lines.push('- SUPPORT ZONES: none measured below current price (open downside — say so explicitly).');
  }

  lines.push('- ZONE RULES (violating these is a hard error):');
  lines.push('  1. Every entry, stop, target and invalidation you output MUST reference a zone id above.');
  lines.push('  2. Do NOT invent round-number levels that no zone supports.');
  lines.push('  3. Stops belong OUTSIDE a zone boundary, never at the mid — mid-zone stops get wicked out.');
  lines.push('  4. If price sits inside a zone, the correct output is WAIT_FOR_ZONE, not an entry.');
  lines.push('  5. Probabilities above are priors from structure. You may adjust them, but you MUST justify any change with evidence from the payload.');

  return lines.join('\n');
}
