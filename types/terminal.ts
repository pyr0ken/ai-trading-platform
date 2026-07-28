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
