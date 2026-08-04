/**
 * Playbook & Signal Validator Engine (Post-Processing)
 *
 * THE PURPOSE
 * -----------
 * LLMs occasionally hallucinate numbers: a target price that no swing level
 * supports, or a stop loss placed inside a zone where noise wicks will kill it.
 *
 * This validator checks every trade setup & playbook output against real
 * deterministic Decision Zones and market facts. When an error is detected:
 *   1. It corrects the number (e.g. snapping target to nearest real zone mid)
 *   2. It logs a `ValidationAdjustment` so the user knows what was adjusted
 *   3. If actionable.status is WAIT_FOR_ZONE, it forces trade_setup to null
 */

import { FullMarketContextPayload } from '@/types/analysis';
import { PlaybookValidation, StructuredLLMOutput, ValidationAdjustment } from '@/types/terminal';

export function validateAndCorrectPlaybook(
  payload: FullMarketContextPayload,
  output: StructuredLLMOutput
): PlaybookValidation {
  const adjustments: ValidationAdjustment[] = [];
  const errors: string[] = [];

  const zones = payload.decisionZones;
  const spot = payload.ticker?.price || zones?.spotPrice || 0;
  const atr = zones?.atr || payload.technicalFacts?.atrVolatility || spot * 0.0015;

  const playbook = output.playbook;
  const setup = playbook?.actionable?.setup || output.trade_setup;

  // 1. Enforce Actionable Status Consistency
  if (playbook?.actionable) {
    if (playbook.actionable.status === 'WAIT_FOR_ZONE' || playbook.actionable.status === 'NO_TRADE') {
      if (playbook.actionable.setup !== null) {
        adjustments.push({
          field: 'playbook.actionable.setup',
          original: 'TradeSetup object present',
          corrected: null,
          reason: `Status is ${playbook.actionable.status} — trade setup should be null until price reaches zone`,
          severity: 'WARNING',
        });
        playbook.actionable.setup = null;
      }
    }
  }

  // 2. Validate Trade Setup Targets & Stop Loss if Setup is Present
  if (setup && spot > 0 && zones) {
    const isLong = setup.position === 'LONG';
    const isShort = setup.position === 'SHORT';

    // Check Stop Loss Placement (Must be outside zone boundaries, not at mid)
    if (setup.stop_loss > 0) {
      if (isLong && setup.stop_loss >= spot) {
        const safeSL = Number((spot - 2 * atr).toFixed(2));
        adjustments.push({
          field: 'trade_setup.stop_loss',
          original: setup.stop_loss,
          corrected: safeSL,
          reason: 'LONG stop loss was at or above entry price — adjusted to ATR buffer floor',
          severity: 'CRITICAL',
        });
        setup.stop_loss = safeSL;
      } else if (isShort && setup.stop_loss <= spot) {
        const safeSL = Number((spot + 2 * atr).toFixed(2));
        adjustments.push({
          field: 'trade_setup.stop_loss',
          original: setup.stop_loss,
          corrected: safeSL,
          reason: 'SHORT stop loss was at or below entry price — adjusted to ATR buffer ceiling',
          severity: 'CRITICAL',
        });
        setup.stop_loss = safeSL;
      }
    }

    // Check Risk-to-Reward Ratio Consistency
    if (setup.stop_loss > 0 && setup.take_profit_1 > 0) {
      const risk = Math.abs(spot - setup.stop_loss);
      const reward = Math.abs(setup.take_profit_1 - spot);
      if (risk > 0) {
        const calculatedRR = Number((reward / risk).toFixed(2));
        if (Math.abs(calculatedRR - setup.risk_reward_ratio) > 0.3) {
          adjustments.push({
            field: 'trade_setup.risk_reward_ratio',
            original: setup.risk_reward_ratio,
            corrected: calculatedRR,
            reason: `Re-calculated exact R:R based on Entry=$${spot}, SL=$${setup.stop_loss}, TP1=$${setup.take_profit_1}`,
            severity: 'INFO',
          });
          setup.risk_reward_ratio = calculatedRR;
        }
      }
    }

    // Snap TP1 to nearest real Decision Zone if off by > 1.5%
    if (setup.take_profit_1 > 0) {
      const relevantZones = isLong ? zones.resistanceZones : zones.supportZones;
      if (relevantZones.length > 0) {
        const nearestZone = relevantZones[0];
        const diffPct = (Math.abs(setup.take_profit_1 - nearestZone.priceMid) / spot) * 100;
        if (diffPct > 1.5) {
          adjustments.push({
            field: 'trade_setup.take_profit_1',
            original: setup.take_profit_1,
            corrected: nearestZone.priceMid,
            reason: `Snapped TP1 to nearest real Decision Zone ${nearestZone.id} ($${nearestZone.priceMid})`,
            severity: 'INFO',
          });
          setup.take_profit_1 = nearestZone.priceMid;
        }
      }
    }
  }

  return {
    clean: adjustments.length === 0 && errors.length === 0,
    adjustments,
    errors,
  };
}
