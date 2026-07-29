import { FullMarketContextPayload, HistoricalSignalFeedback } from '@/types/analysis';

/**
 * Institutional Quantitative LLM System Prompt Construction Engine
 * Mandates 100% structured JSON signals and exhaustive 24-section Institutional Report.
 */

export function buildInstitutionalSystemPrompt(): string {
  return `You are a Senior Wall Street Quantitative Trader, Macro Analyst, and Risk Director.
Your task is to analyze the provided cryptocurrency market payload (OHLCV candles, technical indicators, order book microstructure, CVD, funding rates, news sentiment) and output a dual-format response.

CRITICAL DISCIPLINE & RULES:
1. NEVER invent or hallucinate price levels, data, or indicators. Rely strictly on the quantitative payload provided.
2. DO NOT output generic chatbot conversational filler. Start directly with Section 1.
3. CRITICAL RISK RULE: You must respect the deterministic ATR-based trade thresholds provided in the user prompt. Do not set stop losses that violate the risk buffers unless you provide a clear, detailed technical justification (such as structure break or key order block invalidation).
4. CLOSED-LOOP LEARNING: Review any provided historical performance logs of your recent predictions for the target asset. If recent predictions resulted in losses or invalidations, identify what went wrong (e.g., trading against trend, entering inside ranges) and adjust your strategy to maximize win rate.
5. Structure your response into EXACTLY TWO SECTIONS:

SECTION 1: Structured JSON Code Block
Must begin with \`\`\`json and end with \`\`\`.
Schema requirement:
{
  "signal": "BUY" | "SELL" | "HOLD" | "NEUTRAL",
  "confidence": number (0 to 100),
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "market_phase": string,
  "momentum": string,
  "volatility": string,
  "liquidity": string,
  "expected_move_pct": number,
  "holding_period": string,
  "probabilities": { "bullish": number, "bearish": number, "sideways": number },
  "recommendation": string,
  "scores": {
    "technical": number,
    "momentum": number,
    "news": number,
    "risk": number,
    "liquidity": number,
    "trend": number
  },
  "trade_setup": {
    "position": "LONG" | "SHORT" | "NEUTRAL",
    "entry_range": [number, number],
    "stop_loss": number,
    "take_profit_1": number,
    "take_profit_2": number,
    "take_profit_3": number,
    "risk_reward_ratio": number,
    "recommended_leverage": string,
    "invalidation_point": number,
    "strategy_name": string
  },
  "reasoning_badges": [
    { "label": string, "type": "bullish" | "bearish" | "neutral" }
  ],
  "scenarios": {
    "bullish": { "probability": number, "conditions": string, "target": number, "invalidation": number },
    "bearish": { "probability": number, "conditions": string, "target": number, "invalidation": number },
    "sideways": { "probability": number, "conditions": string, "target": number, "invalidation": number }
  },
  "timeline_predictions": {
    "1h": string, "6h": string, "12h": string, "24h": string, "3d": string, "7d": string
  },
  "checklist": [
    { "item": string, "status": "good" | "neutral" | "bad" }
  ]
}

SECTION 2: Exhaustive Institutional Report in Markdown
Must strictly include these exact headers:
# Executive Summary & Market Thesis
## Technical & Market Structure Analysis
- Trend & Momentum Analysis
- Liquidity & Volatility Assessment
- Orderbook Microstructure & CVD Analysis
- News & Macro Sentiment Impact
## Scenario Modeling & Risk Assessment
- Bullish Case & Target Thresholds
- Bearish Breakdown Scenario
- Sideways Consolidation Bounds
- Key Invalidation Triggers & Conflicting Signals
## Quantitative Trade Execution Plan
- Entry & Position Management Strategy
- Stop Loss & Take Profit Targets (TP1, TP2, TP3)
- Risk-to-Reward Ratio & Leverage Constraints
- Final Recommendation & Institutional Rationale`;
}

export function buildInstitutionalUserPrompt(
  symbol: string,
  exchange: string,
  timeframe: string,
  marketContext: FullMarketContextPayload,
  mode: 'scalp' | 'swing' = 'swing'
): string {
  const price = marketContext.ticker?.price ?? 0;
  const change24h = marketContext.ticker?.change24hPercentage ?? 0;

  const technicalFactsText = marketContext.technicalFacts ? `
DETERMINISTIC TECHNICAL FACTS (DO NOT VIOLATE IN YOUR ANALYSIS):
- Trend Phase: ${marketContext.technicalFacts.trend}
- Market Consolidation State (ADX 14): Value = ${marketContext.technicalFacts.adxValue ?? 'N/A'} (Trend Strength: ${marketContext.technicalFacts.adxTrend ?? 'N/A'})
- Immediate Clustered Support Levels (S&R Zones): ${marketContext.technicalFacts.supportLevels.join(', ')}
- Immediate Clustered Resistance Levels (S&R Zones): ${marketContext.technicalFacts.resistanceLevels.join(', ')}
- Volatility (ATR 14): ${marketContext.technicalFacts.atrVolatility}
- RSI State: ${marketContext.technicalFacts.rsiCondition}
- MACD Cross: ${marketContext.technicalFacts.macdCrossover}
- Breakout State (BOS): Type = ${marketContext.technicalFacts.breakoutType ?? 'NONE'}${marketContext.technicalFacts.breakoutType && marketContext.technicalFacts.breakoutType !== 'NONE' ? ` (Broken Level = $${marketContext.technicalFacts.breakoutLevel}, Volume Ratio = ${marketContext.technicalFacts.breakoutVolumeRatio}x)` : ''}
- RSI Divergence: ${marketContext.technicalFacts.rsiDivergence ?? 'NONE'}
- MACD Divergence: ${marketContext.technicalFacts.macdDivergence ?? 'NONE'}
- BTC Correlation Index (30d): ${marketContext.technicalFacts.btcCorrelation ?? 1.0}

DETERMINISTIC ATR-BASED TRADE THRESHOLDS (GUIDELINE LIMITS):
* Long Position Invalidation Limit: Stop Loss should not be tighter than $${marketContext.technicalFacts.atrSuggestedStopLossLong} (Risk Buffer)
* Long Position Target Limit: Take Profit should target around $${marketContext.technicalFacts.atrSuggestedTakeProfitLong} (2x ATR Move)
* Short Position Invalidation Limit: Stop Loss should not be tighter than $${marketContext.technicalFacts.atrSuggestedStopLossShort} (Risk Buffer)
* Short Position Target Limit: Take Profit should target around $${marketContext.technicalFacts.atrSuggestedTakeProfitShort} (2x ATR Move)
` : '';

  const recentSignals = marketContext.recentHistoricalSignals || [];
  const recentSignalsText = recentSignals.length > 0
    ? `
HISTORICAL PERFORMANCE & RECENT SIGNALS FOR ${symbol} (CLOSED-LOOP FEEDBACK):
${recentSignals.map((s: HistoricalSignalFeedback, idx: number) => {
      return `${idx + 1}. Signal: ${s.signal} at Entry $${s.price} (Created: ${new Date(s.created_at).toLocaleDateString()}) -> Result: ${s.status}${s.status !== 'PENDING' ? ` (PnL: ${s.pnl_percentage}%)` : ''}`;
    }).join('\n')}
Use this historical performance data to refine your accuracy and prevent repeating previous trading mistakes.
` : '';

  const warnings = marketContext.economicWarnings || [];
  const economicWarningsText = warnings.length > 0
    ? `
CRITICAL MACROECONOMIC WARNING ALERTS:
${warnings.map((w, idx) => `* ALERT ${idx + 1}: ${w}`).join('\n')}
` : '';

  const newsSentimentIndex = marketContext.news?.newsSentimentIndex ?? 0.0;
  const newsSentimentLabel = newsSentimentIndex > 0.3 ? 'BULLISH' : newsSentimentIndex < -0.3 ? 'BEARISH' : 'NEUTRAL';

  const modeInstruction = mode === 'scalp'
    ? 'CRITICAL MODE CONSTRAINT: You are in SCALP MODE. Output ONLY Section 1 (the JSON block starting with ```json and ending with ```). DO NOT write any report or markdown text after the JSON block.'
    : 'You are in SWING MODE. Output Section 1 (JSON block) first, followed by Section 2 (Exhaustive Institutional Markdown Report).';

  return `TARGET ASSET: ${symbol} (${timeframe})
EXCHANGE VENUE: ${exchange.toUpperCase()}
CURRENT PRICE: $${price} (24h Change: ${change24h}%)
${technicalFactsText}
${economicWarningsText}
- Aggregate News Sentiment Index: ${newsSentimentIndex} (${newsSentimentLabel})
${recentSignalsText}
${modeInstruction}

RAW QUANTITATIVE MARKET DATA PAYLOAD:
${JSON.stringify(marketContext, null, 2)}

Provide the Output matching the mode constraints.`;
}
