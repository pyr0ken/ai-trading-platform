/**
 * Deterministic Conviction Scorer Engine
 *
 * WHY THIS EXISTS
 * ---------------
 * The LLM's self-reported "confidence" (e.g. 85%) is a subjective opinion,
 * not a mathematical measurement. An AI will often report 85% confidence on a
 * trade that goes directly against a 4-hour trend or has an R:R of 1:1.1.
 *
 * This engine calculates a DETERMINISTIC, AUDITABLE conviction score (0-100)
 * based on 9 weighted quantitative filters + soft-veto penalties.
 *
 * SOFT-VETO PHILOSOPHY
 * --------------------
 * Per user design choice: Vetoes heavily penalize confidence points (-15 to -25)
 * rather than hard-killing the trade to 'NO_TRADE'. This allows high-impact news
 * or strong catalysts to still justify a position if the setup is strong enough,
 * while making the risk explicitly visible.
 */

import { FullMarketContextPayload } from '@/types/analysis';
import { ConvictionFilter, ConvictionScore, StructuredLLMOutput } from '@/types/terminal';
import { resolveTradeSetup } from './setup-resolver';

export function computeConvictionScore(
  payload: FullMarketContextPayload,
  parsedOutput: StructuredLLMOutput
): ConvictionScore {
  const filters: ConvictionFilter[] = [];
  const vetoes: Array<{ rule: string; penalty: number; detail: string }> = [];

  const regime = payload.marketRegime;
  const zones = payload.decisionZones;
  const facts = payload.technicalFacts;
  const setup = resolveTradeSetup(parsedOutput);
  const bias = parsedOutput.playbook?.bias || (parsedOutput.signal === 'BUY' ? 'BULLISH' : parsedOutput.signal === 'SELL' ? 'BEARISH' : 'NEUTRAL');
  const isLong = bias === 'BULLISH';
  const isShort = bias === 'BEARISH';

  // 1. Timeframe Alignment (Max 20 pts)
  if (regime) {
    const alignScore = (regime.alignmentScore / 100) * 20;
    filters.push({
      name: 'Timeframe Alignment',
      score: Number(alignScore.toFixed(1)),
      max: 20,
      reason: `Directional consensus across timeframes: ${regime.alignmentScore}% (${regime.dominantDirection})`,
      penalising: regime.alignmentScore < 50,
    });
  } else {
    filters.push({
      name: 'Timeframe Alignment',
      score: 10,
      max: 20,
      reason: 'Regime data missing — fallback mid-score assigned',
      penalising: false,
    });
  }

  // 2. Higher Timeframe Agreement (Max 18 pts)
  //
  // Carries the FULL cost of fighting the higher timeframe. This filter is the
  // single authority on HTF conflict — the old Rule A veto charged another -18
  // on top of the -16 already taken here, so one fault cost 34 points and a
  // clean early-reversal setup (zone + oversold RSI + volume + 2.5 R:R) fell
  // from MEDIUM to LOW purely through double counting. Measured: 66 -> 48.
  let htfScore = 9;
  let htfReason = 'HTF neutral or unconfirmed';
  if (regime) {
    const htfVote = regime.votes.find((v) => v.timeframe === '4h' || v.timeframe === '1d');
    if (htfVote) {
      if ((isLong && htfVote.vote === 'BULLISH') || (isShort && htfVote.vote === 'BEARISH')) {
        htfScore = 18;
        htfReason = `Trade aligns with HTF (${htfVote.timeframe}: ${htfVote.vote})`;
      } else if ((isLong && htfVote.vote === 'BEARISH') || (isShort && htfVote.vote === 'BULLISH')) {
        htfScore = 0;
        htfReason = `Trade CONFLICTS with HTF trend (${htfVote.timeframe}: ${htfVote.vote}) — full filter penalty applied once`;
      }
    }
  }
  filters.push({
    name: 'Higher-TF Agreement',
    score: htfScore,
    max: 18,
    reason: htfReason,
    penalising: htfScore < 9,
  });

  // 3. Regime Suitability (Max 15 pts)
  let regimeScore = 7.5;
  let regimeReason = 'Standard regime conditions';
  if (regime) {
    const isTrending = regime.type === 'TRENDING_UP' || regime.type === 'TRENDING_DOWN';
    const isRanging = regime.type === 'RANGING';

    if (isTrending && regime.dominantDirection === bias) {
      regimeScore = 15;
      regimeReason = `Trade aligns with confirmed trend regime (${regime.type})`;
    } else if (isRanging) {
      regimeScore = 10;
      regimeReason = 'Ranging regime — mean reversion edge applies at zone boundaries';
    } else if (regime.type === 'VOLATILE_EXPANSION') {
      regimeScore = 3;
      regimeReason = 'Volatile expansion regime — high chop & slippage risk';
    }
  }
  filters.push({
    name: 'Regime Suitability',
    score: regimeScore,
    max: 15,
    reason: regimeReason,
    penalising: regimeScore < 7.5,
  });

  // 4. Risk-to-Reward Ratio Quality (Max 12 pts)
  //
  // Sole authority on R:R quality. The old Rule B veto charged a further -15
  // for rr < 1.5 on top of the reduced score here, punishing one weakness twice.
  const rr = setup?.risk_reward_ratio || 0;
  let rrScore = 0;
  let rrReason = 'R:R unavailable or < 1.0';
  if (rr >= 2.5) {
    rrScore = 12;
    rrReason = `Excellent Risk-to-Reward ratio: 1:${rr.toFixed(2)}`;
  } else if (rr >= 1.8) {
    rrScore = 9;
    rrReason = `Valid Risk-to-Reward ratio: 1:${rr.toFixed(2)}`;
  } else if (rr >= 1.5) {
    rrScore = 4;
    rrReason = `Suboptimal R:R ratio: 1:${rr.toFixed(2)} (target >= 1.8)`;
  } else if (rr > 0) {
    rrScore = 0;
    rrReason = `R:R 1:${rr.toFixed(2)} is below the 1:1.5 minimum — no points awarded`;
  }
  filters.push({
    name: 'R:R Quality',
    score: rrScore,
    max: 12,
    reason: rrReason,
    penalising: rrScore < 9,
  });

  // 5. Decision Zone Proximity (Max 10 pts)
  let zoneScore = 5;
  let zoneReason = 'No active decision zone detected near entry';
  if (zones) {
    if (zones.activeZoneId) {
      zoneScore = 10;
      zoneReason = `Price is sitting directly INSIDE Decision Zone ${zones.activeZoneId}`;
    } else if (zones.nextDecisionZoneId) {
      const nextZone = [...zones.resistanceZones, ...zones.supportZones].find((z) => z.id === zones.nextDecisionZoneId);
      if (nextZone && Math.abs(nextZone.distancePct) < 0.5) {
        zoneScore = 8;
        zoneReason = `Price is within 0.5% of key Decision Zone ${nextZone.id}`;
      } else if (nextZone) {
        zoneScore = 4;
        zoneReason = `Price is ${Math.abs(nextZone.distancePct).toFixed(2)}% away from next Decision Zone ${nextZone.id}`;
      }
    }
  }
  filters.push({
    name: 'Zone Proximity',
    score: zoneScore,
    max: 10,
    reason: zoneReason,
    penalising: zoneScore < 5,
  });

  // 6. Momentum Confirmation (Max 8 pts)
  //
  // Sole authority on chasing extended momentum. The old Rule C veto charged a
  // further -15 for a long into overbought (or short into oversold) on top of
  // the reduced score here.
  let momScore = 4;
  let momReason = 'Neutral momentum indicators';
  if (facts) {
    const rsi = facts.rsiCondition;
    if ((isLong && rsi.includes('OVERSOLD')) || (isShort && rsi.includes('OVERBOUGHT'))) {
      momScore = 8;
      momReason = `RSI extreme confirms reversal edge (${rsi})`;
    } else if ((isLong && rsi.includes('OVERBOUGHT')) || (isShort && rsi.includes('OVERSOLD'))) {
      momScore = 0;
      momReason = `Chasing extended momentum: RSI opposes entry direction (${rsi})`;
    } else {
      momScore = 5;
      momReason = `RSI momentum neutral (${rsi})`;
    }
  }
  filters.push({
    name: 'Momentum Confirmation',
    score: momScore,
    max: 8,
    reason: momReason,
    penalising: momScore < 4,
  });

  // 7. Volume Surge Confirmation (Max 7 pts)
  //
  // Reads volumeSurgeRatio, which is computed on every bar. The previous source
  // (breakoutVolumeRatio) is only populated meaningfully when a break of
  // structure fired — detectBreakout() bails out below 1.5x — so outside a
  // breakout this filter was scoring on a number that carried no volume
  // information at all, and awarded the neutral 3.5 by default.
  let volScore = 3.5;
  let volReason = 'Volume ratio normal';
  const volRatio = facts?.volumeSurgeRatio ?? facts?.breakoutVolumeRatio;
  if (typeof volRatio === 'number' && Number.isFinite(volRatio) && volRatio > 0) {
    if (volRatio >= 1.5) {
      volScore = 7;
      volReason = `Volume surge confirmed: ${volRatio.toFixed(2)}x the 20-bar average`;
    } else if (volRatio >= 1.1) {
      volScore = 5;
      volReason = `Volume mildly expanding: ${volRatio.toFixed(2)}x the 20-bar average`;
    } else if (volRatio < 0.8) {
      volScore = 1;
      volReason = `Volume drying up: ${volRatio.toFixed(2)}x the 20-bar average — move lacks participation`;
    } else {
      volReason = `Volume in line with average: ${volRatio.toFixed(2)}x`;
    }
  } else {
    volReason = 'Volume data unavailable — neutral score assigned';
  }
  filters.push({
    name: 'Volume Confirmation',
    score: volScore,
    max: 7,
    reason: volReason,
    penalising: volScore < 3.5,
  });

  // 8. Orderbook / Microstructure Imbalance (Max 5 pts)
  let obScore = 2.5;
  let obReason = 'Balanced orderbook / CVD';
  if (payload.microstructure && payload.microstructure.orderBookDepth) {
    const ob = payload.microstructure.orderBookDepth as { orderBookPressure?: string; imbalanceRatio?: number };
    const pressure = ob.orderBookPressure;
    if ((isLong && pressure === 'BUY_PRESSURE') || (isShort && pressure === 'SELL_PRESSURE')) {
      obScore = 5;
      obReason = `Orderbook pressure supports trade direction (${pressure})`;
    } else if ((isLong && pressure === 'SELL_PRESSURE') || (isShort && pressure === 'BUY_PRESSURE')) {
      obScore = 0.5;
      obReason = `Orderbook pressure CONFLICTS with trade direction (${pressure})`;
    }
  }
  filters.push({
    name: 'Orderbook Imbalance',
    score: obScore,
    max: 5,
    reason: obReason,
    penalising: obScore < 2.5,
  });

  // 9. Macro / News Regime Alignment (Max 5 pts)
  let newsScore = 2.5;
  let newsReason = 'Neutral news / sentiment impact';
  if (payload.newsIntelligence) {
    const impact = payload.newsIntelligence.directImpact;
    if (impact) {
      if ((isLong && impact.impact === 'BULLISH') || (isShort && impact.impact === 'BEARISH')) {
        newsScore = 5;
        newsReason = `Direct news impact supports trade (${impact.impact}, mag ${impact.magnitude}/100)`;
      } else if ((isLong && impact.impact === 'BEARISH') || (isShort && impact.impact === 'BULLISH')) {
        newsScore = 0;
        newsReason = `Direct news impact CONFLICTS with trade (${impact.impact})`;
      }
    }
  }
  filters.push({
    name: 'News Regime Alignment',
    score: newsScore,
    max: 5,
    reason: newsReason,
    penalising: newsScore < 2.5,
  });

  // ── Calculate Raw Score ──
  const rawScore = filters.reduce((sum, f) => sum + f.score, 0);

  /**
   * ── VETO RULES ──
   *
   * Rules A (COUNTER_HTF_TREND), B (SUBOPTIMAL_RISK_REWARD) and C
   * (CHASING_OVERBOUGHT/OVERSOLD) were REMOVED here because each duplicated a
   * penalty the corresponding filter had already applied:
   *
   *   Rule A  <-> filter 2 (Higher-TF Agreement)
   *   Rule B  <-> filter 4 (R:R Quality)
   *   Rule C  <-> filter 6 (Momentum Confirmation)
   *
   * Charging both meant one fault cost up to 34 of 100 points. A clean early
   * reversal — inside a support zone, oversold RSI, volume surge, 2.5 R:R, and
   * only the 4h still against it — scored 48/LOW instead of 66/MEDIUM and was
   * effectively suppressed. That is exactly the setup this platform should be
   * able to take, so the system was blind at turning points by construction.
   *
   * Each filter now carries the full weight of its own concern, applied once.
   * Vetoes remain reserved for risks NO filter measures; the no-trade gate
   * (lib/analysis/no-trade-gate.ts) contributes its findings separately in
   * use-llm-analysis.ts, and those are genuinely additional information
   * (post-cost economics), not a second charge for the same fault.
   */

  // Calculate Veto Penalties & Final Score
  const vetoPenalty = vetoes.reduce((sum, v) => sum + v.penalty, 0);
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore - vetoPenalty)));

  let grade: 'HIGH' | 'MEDIUM' | 'LOW' | 'REJECTED' = 'LOW';
  if (finalScore >= 75) grade = 'HIGH';
  else if (finalScore >= 55) grade = 'MEDIUM';
  else if (finalScore >= 35) grade = 'LOW';
  else grade = 'REJECTED';

  return {
    final_score: finalScore,
    raw_score: Number(rawScore.toFixed(1)),
    filters,
    vetoes,
    veto_penalty: vetoPenalty,
    grade,
  };
}
