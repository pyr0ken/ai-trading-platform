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
3. CRITICAL RISK RULE: You must structure trades with a minimum Risk-to-Reward ratio of 1:1.8. Place Stop Loss beyond market liquidity sweeps or key order block invalidations. Do not place tight stop losses that are easily hunted by noise.
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
DETERMINISTIC TECHNICAL FACTS (USE THESE AS YOUR PRIMARY QUANTITATIVE BASIS — DO NOT CONTRADICT THEM WITHOUT STRONG EVIDENCE):
- Trend Phase: ${marketContext.technicalFacts.trend} (based on EMA 20 vs EMA 50 alignment)
- Market Consolidation State (ADX 14): Value = ${marketContext.technicalFacts.adxValue ?? 'N/A'} (Trend Strength: ${marketContext.technicalFacts.adxTrend ?? 'N/A'})
- Immediate Clustered Support Levels (S&R Zones): ${marketContext.technicalFacts.supportLevels.join(', ') || 'None detected'}
- Immediate Clustered Resistance Levels (S&R Zones): ${marketContext.technicalFacts.resistanceLevels.join(', ') || 'None detected'}
- Volatility (ATR 14): ${marketContext.technicalFacts.atrVolatility}
- RSI State: ${marketContext.technicalFacts.rsiCondition}
- MACD Cross: ${marketContext.technicalFacts.macdCrossover}
- Breakout State (BOS): Type = ${marketContext.technicalFacts.breakoutType ?? 'NONE'}${marketContext.technicalFacts.breakoutType && marketContext.technicalFacts.breakoutType !== 'NONE' ? ` (Broken Level = $${marketContext.technicalFacts.breakoutLevel}, Volume Ratio = ${marketContext.technicalFacts.breakoutVolumeRatio}x)` : ''}
- RSI Divergence: ${marketContext.technicalFacts.rsiDivergence ?? 'NONE'}
- MACD Divergence: ${marketContext.technicalFacts.macdDivergence ?? 'NONE'}
- BTC Correlation Index (30d): ${marketContext.technicalFacts.btcCorrelation ?? 1.0}

IMPORTANT DECISION GUIDANCE:
- RSI BELOW 30 = OVERSOLD (bullish reversal bias), RSI ABOVE 70 = OVERBOUGHT (bearish reversal bias), RSI 30-70 = momentum continuation zone. Use RSI direction (rising vs falling) to detect momentum shifts, not just the absolute value.
- If ADX < 20 the market is ranging — still make a directional call based on RSI position, EMA alignment, MACD histogram direction, and support/resistance proximity. A ranging market does NOT mean NEUTRAL is the correct signal; it means you should pick the side with higher probability (e.g. RSI near oversold at support with bullish divergence = BUY bias).
- NEVER default to NEUTRAL/HOLD unless ALL of the following are true: RSI is mid-range (45-55) AND flat, MACD histogram is flat near zero, price is equidistant between support and resistance, AND no divergence or BOS signal exists. If ANY directional signal exists, make a directional call with appropriate confidence.
- The signal field accepts BUY / SELL / HOLD / NEUTRAL. Prefer BUY/SELL over HOLD when directional evidence exists. HOLD is reserved for no edge; NEUTRAL is reserved for truly mixed signals.

DETERMINISTIC ATR-BASED RISK BUFFER GUIDELINES (USE AS NON-BINDING REFERENCE FOR SL/TP PLACEMENT):
* Long Invalidation Risk Buffer: Ideal Stop Loss should consider the $${marketContext.technicalFacts.atrSuggestedStopLossLong} ATR floor, but place your actual SL beyond market liquidity sweeps or key order block invalidation.
* Long Profit Target Guide: Projected 2x ATR Move = $${marketContext.technicalFacts.atrSuggestedTakeProfitLong}
* Short Invalidation Risk Buffer: Ideal Stop Loss should consider the $${marketContext.technicalFacts.atrSuggestedStopLossShort} ATR ceiling, but place your actual SL above liquidity sweeps or key supply zones.
* Short Profit Target Guide: Projected 2x ATR Move = $${marketContext.technicalFacts.atrSuggestedTakeProfitShort}
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

RAW QUANTITATIVE MARKET DATA PAYLOAD (SUMMARIZED — USE THE DETERMINISTIC FACTS ABOVE AS YOUR PRIMARY BASIS):
- Ticker: Price=$${price} | 24h Change=${change24h}% | High/Low/Volume: $${marketContext.ticker?.high24h ?? 'N/A'}/$${marketContext.ticker?.low24h ?? 'N/A'}/$${marketContext.ticker?.volume24h ?? 'N/A'}
- Derivatives: Funding=${marketContext.derivatives?.fundingRate ?? 'N/A'} | OI=${marketContext.derivatives?.openInterest ?? 'N/A'} | Basis=${marketContext.derivatives?.basisPremiumPct ?? 0}%
- Microstructure: Orderbook Pressure=${marketContext.microstructure?.orderBookDepth?.orderBookPressure ?? 'NEUTRAL'} | Imbalance=${marketContext.microstructure?.orderBookDepth?.imbalanceRatio ?? 1.0} | CVD Signal=${marketContext.microstructure?.volumeDeltaCvd?.cvdSignal ?? 'BALANCED'} | Volume Delta=${marketContext.microstructure?.volumeDeltaCvd?.volumeDelta ?? 0}
- Macro: Fear&Greed=${marketContext.macroSentiment?.fearAndGreed?.value ?? 'N/A'} (${marketContext.macroSentiment?.fearAndGreed?.classification ?? 'N/A'}) | Stablecoin Mcap=$${marketContext.macroSentiment?.stablecoinLiquidity?.totalStablecoinMarketCapUsd ?? 'N/A'}
- News Sentiment Index: ${marketContext.news?.newsSentimentIndex ?? 0} (${newsSentimentLabel})

MULTI-TIMEFRAME INDICATORS & PRICE ACTION ANATOMY:
${Object.entries(marketContext.timeframes || {})
  .map(([tf, td]) => {
    const ind = td?.indicators;
    if (!ind) return `- ${tf}: no data`;
    const candles = td.candles || [];
    const recent5 = candles.slice(-5);
    
    // Calculate Volume Surge Ratio
    const slice20 = candles.slice(-20);
    const avgVol20 = slice20.length > 0 ? slice20.reduce((acc, c) => acc + c.volume, 0) / slice20.length : 1;
    const latestVol = candles.length > 0 ? candles[candles.length - 1].volume : 0;
    const volumeSurgeRatio = avgVol20 > 0 ? Number((latestVol / avgVol20).toFixed(2)) : 1.0;

    const candleText = recent5.length > 0
      ? `  Recent 5 Candles Anatomy (O/H/L/C/V): [${recent5.map(c => {
          const range = c.high - c.low;
          const bodyPct = range > 0 ? Math.round((Math.abs(c.close - c.open) / range) * 100) : 100;
          const upperWickPct = range > 0 ? Math.round(((c.high - Math.max(c.open, c.close)) / range) * 100) : 0;
          const lowerWickPct = range > 0 ? Math.round(((Math.min(c.open, c.close) - c.low) / range) * 100) : 0;
          return `O:$${c.open}/H:$${c.high}/L:$${c.low}/C:$${c.close}/V:${c.volume} (Body:${bodyPct}%|TopWick:${upperWickPct}%|BotWick:${lowerWickPct}%)`;
        }).join(' | ')}]`
      : '';
    return `- ${tf}: Close=$${td.latestClose} | EMA7=$${ind.ema_7} | EMA20=$${ind.ema_20} | EMA50=$${ind.ema_50} | RSI14=${ind.rsi_14} (${ind.rsi_condition}) | MACD Hist=${ind.macd_hist} (${ind.macd_condition}) | ATR=$${ind.atr_14} | VolSurge=${volumeSurgeRatio}x | S/R=${(td.keyLevels?.supportLevels || []).length}/${(td.keyLevels?.resistanceLevels || []).length} levels\n${candleText}`;
  })
  .join('\n')}

Provide the Output matching the mode constraints.`;
}
