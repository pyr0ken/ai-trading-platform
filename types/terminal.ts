export type SignalType = 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type MarketPhase = 'Accumulation' | 'Bullish Breakout' | 'Distribution' | 'Bearish Breakdown' | 'Compression';

export interface ReasoningBadge {
  label: string;
  type: 'bullish' | 'bearish' | 'neutral';
}

export interface TradeSetup {
  position: 'LONG' | 'SHORT' | 'NEUTRAL';
  entry_range: [number, number];
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  take_profit_3: number;
  risk_reward_ratio: number;
  recommended_leverage: string;
  invalidation_point: number;
  strategy_name: string;
}

export interface RadarScores {
  technical: number;
  momentum: number;
  news: number;
  risk: number;
  liquidity: number;
  trend: number;
}

export interface ScenarioDetail {
  probability: number;
  conditions: string;
  target: number;
  invalidation: number;
}

export interface Scenarios {
  bullish: ScenarioDetail;
  bearish: ScenarioDetail;
  sideways?: ScenarioDetail;
}

export interface TimelinePredictions {
  '1h': string;
  '6h': string;
  '12h': string;
  '24h': string;
  '3d': string;
  '7d': string;
}

export interface ChecklistItem {
  item: string;
  status: 'good' | 'neutral' | 'bad';
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADING PLAYBOOK
//
// Replaces the mental model of "one directional verdict" with a positional
// plan. The problem with a bare BUY/SELL is that it hides the two things a
// trader actually needs: WHERE the idea begins, and WHAT would prove it wrong.
// A playbook answers both, and — critically — is allowed to say "not yet".
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execution readiness, kept deliberately separate from directional bias.
 *
 * - READY:          price is at a zone and conditions are met; setup is present.
 * - WAIT_FOR_ZONE:  bias exists but price is not at a decision point yet. This
 *                   is the single most valuable state in the whole system — it
 *                   is how the platform declines to chase mid-structure entries
 *                   instead of manufacturing a trade to look decisive.
 * - NO_TRADE:       structure is unreadable or evidence is contradictory.
 */
export type ActionableStatus = 'READY' | 'WAIT_FOR_ZONE' | 'NO_TRADE';

/** One branch of a conditional path: what happens if a zone resolves this way. */
export interface PlaybookBranch {
  /** Zone id this branch hangs off, e.g. 'R1'. Must exist in the zone map. */
  zone_id: string;
  /** 'REJECT' = price holds at the zone, 'BREAK' = price closes through it. */
  outcome: 'REJECT' | 'BREAK';
  /** Model's probability for this outcome, 0-100. */
  probability: number;
  /** Where price is expected to travel if this branch plays out. */
  target: number;
  /** Plain-language reasoning, must cite payload evidence. */
  rationale: string;
}

/**
 * A named path through the structure: "price reaches X, does Y, then goes to Z".
 * This is the narrative form of the conditional map.
 */
export interface PlaybookPath {
  /** Human-readable walk-through of the expected sequence. */
  narrative: string;
  /** Probability this whole path plays out, 0-100. */
  probability: number;
  /** Zone that triggers this path. */
  trigger_zone_id: string;
  /** Concrete, checkable condition that kills this path. */
  invalidated_by: string;
  /** Ordered branches making up the path. */
  branches: PlaybookBranch[];
}

/**
 * The model's conditional plan.
 *
 * Optional on StructuredLLMOutput so that an older cached analysis, or a model
 * response that omits it, still renders through the legacy fields instead of
 * crashing the UI.
 */
export interface TradingPlaybook {
  /**
   * Directional bias — what the model thinks, independent of whether to act.
   * Kept distinct from `actionable.status` on purpose: a strong bias with price
   * mid-range is a WAIT, not an entry, and conflating the two is what produces
   * chased trades.
   */
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  /** Confidence in the BIAS specifically, 0-100. */
  bias_confidence: number;

  /** Most likely path through the structure. */
  primary_path: PlaybookPath;
  /** The credible alternative. Forces the model to hold two hypotheses. */
  alternative_path: PlaybookPath;

  /** Execution decision, separate from bias. */
  actionable: {
    status: ActionableStatus;
    /**
     * When status is WAIT_FOR_ZONE: the literal condition being waited for,
     * e.g. "price to reach S1 (63234.02-63361.88) and print a rejection wick".
     * Null when status is READY.
     */
    waiting_for: string | null;
    /** Present ONLY when status is READY. Null otherwise. */
    setup: TradeSetup | null;
    /** Zone id the setup keys off, so the validator can check the numbers. */
    anchor_zone_id: string | null;
  };

  /** Zone ids the model actually used, for validator cross-checking. */
  referenced_zone_ids: string[];
}

/**
 * Deterministic conviction score computed in CODE after the model responds.
 *
 * The model does not get to grade its own homework: a self-reported confidence
 * of 85 is a vibe, not a measurement. This structure records an auditable score
 * built from the same nine filters every time, so two identical setups always
 * receive the same number.
 */
export interface ConvictionFilter {
  /** Filter name, e.g. 'Timeframe Alignment'. */
  name: string;
  /** Points awarded. */
  score: number;
  /** Maximum points this filter can award. */
  max: number;
  /** Why this score was given — always populated, always specific. */
  reason: string;
  /** True when this filter actively argues against the trade. */
  penalising: boolean;
}

export interface ConvictionScore {
  /** Final 0-100 score after filters and soft-veto penalties. */
  final_score: number;
  /** Score before veto penalties were applied. */
  raw_score: number;
  /** Per-filter breakdown, always all nine present. */
  filters: ConvictionFilter[];
  /**
   * Soft vetoes: conditions that heavily penalise the score but do NOT hard-kill
   * the signal. Per the user's decision, a veto lowers confidence rather than
   * discarding the trade, so that a strong news catalyst can still justify it.
   */
  vetoes: Array<{ rule: string; penalty: number; detail: string }>;
  /** Total points removed by vetoes. */
  veto_penalty: number;
  /** Bucket derived from final_score, for UI colouring and quick reading. */
  grade: 'HIGH' | 'MEDIUM' | 'LOW' | 'REJECTED';
}

/**
 * Corrections the validator made to the model's own numbers.
 *
 * The model will occasionally output a target no swing supports, or a stop
 * sitting at a zone mid where it is guaranteed to be wicked. Rather than
 * silently trusting it or silently overwriting it, every adjustment is recorded
 * so the reasoning stays auditable.
 */
export interface ValidationAdjustment {
  field: string;
  original: number | string | null;
  corrected: number | string | null;
  reason: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface PlaybookValidation {
  /** True when every number the model produced checked out unmodified. */
  clean: boolean;
  adjustments: ValidationAdjustment[];
  /** Hard structural problems that could not be auto-corrected. */
  errors: string[];
}

export interface StructuredLLMOutput {
  signal: SignalType;
  confidence: number; // 0 to 100
  risk_level: RiskLevel;
  market_phase: string;
  momentum: string;
  volatility: string;
  liquidity: string;
  expected_move_pct: number;
  holding_period: string;
  probabilities: {
    bullish: number;
    bearish: number;
  };
  recommendation: string;
  scores: RadarScores;
  trade_setup: TradeSetup;
  reasoning_badges: ReasoningBadge[];
  scenarios: Scenarios;
  timeline_predictions: TimelinePredictions;
  checklist: ChecklistItem[];

  /**
   * The conditional playbook. Optional for backward compatibility with older
   * cached responses or simplified outputs.
   */
  playbook?: TradingPlaybook;

  /**
   * Deterministic conviction score computed after LLM response by code.
   */
  conviction?: ConvictionScore;

  /**
   * Validation & auto-correction adjustments applied by code.
   */
  validation?: PlaybookValidation;
}

export interface TimeframeHeatmapRow {
  timeframe: string;
  trend: 'Bullish' | 'Bearish' | 'Neutral';
  ema: 'Bullish' | 'Bearish' | 'Neutral';
  macd: 'Bullish' | 'Bearish' | 'Neutral';
  rsi: 'Overbought' | 'Oversold' | 'Neutral';
  vwap: 'Above' | 'Below';
  volume: 'High' | 'Normal' | 'Low';
  signal: SignalType;
}

export interface HistoricalAnalysisRecord {
  id: string;
  symbol: string;
  exchange: string;
  timeframe: string;
  signal: SignalType;
  confidence: number;
  risk_level: RiskLevel;
  json_output: StructuredLLMOutput;
  markdown_report: string;
  created_at: string;
}
