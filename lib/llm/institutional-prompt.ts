import { FullMarketContextPayload, HistoricalSignalFeedback } from '@/types/analysis';
import { CandleData, CalculatedIndicators } from '@/types/market';

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

/**
 * Format timestamp into compact UTC time MM-DD HH:mm
 */
function formatCandleTime(c: { timestamp?: number; gregorianDate?: string }): string {
  if (c.gregorianDate) {
    const match = c.gregorianDate.match(/\d{4}-(\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
    if (match) {
      return `${match[1]} ${match[2]}`;
    }
  }
  if (c.timestamp) {
    const d = new Date(c.timestamp);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const min = String(d.getUTCMinutes()).padStart(2, '0');
      return `${mm}-${dd} ${hh}:${min}`;
    }
  }
  return 'N/A';
}

/**
 * Estimate token count of a prompt string (chars / 4 heuristic).
 */
export function estimatePromptTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Filter out warm-up candles carrying synthetic placeholder indicators.
 * Real payload evidence: warm-up candles have rsi_14 exactly 50, macd_hist exactly 0,
 * and adx_14 exactly 20 while the indicator window has not filled. SMA equalities
 * are unreliable because a short series can produce sma_200 === close as a
 * computational artifact, not a placeholder.
 */
function filterWarmupCandles(candles: Array<CandleData & { indicators: CalculatedIndicators }>) {
  return candles.filter((c) => {
    const ind = c.indicators;
    if (!ind) return false;
    const placeholderSignature =
      typeof ind.rsi_14 === 'number' &&
      ind.rsi_14 === 50 &&
      typeof ind.macd_hist === 'number' &&
      ind.macd_hist === 0 &&
      typeof ind.adx_14 === 'number' &&
      ind.adx_14 === 20;
    const hasNaNIndicator =
      Number.isNaN(ind.sma_20) ||
      Number.isNaN(ind.sma_50) ||
      Number.isNaN(ind.sma_200);
    return !placeholderSignature && !hasNaNIndicator;
  });
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
* Long Position: Ideal SL floor = $${marketContext.technicalFacts.atrSuggestedStopLossLong} | Target = $${marketContext.technicalFacts.atrSuggestedTakeProfitLong} | Calculated Risk-to-Reward Ratio = 1:${marketContext.technicalFacts.riskRewardRatioLong && marketContext.technicalFacts.riskRewardRatioLong >= 1.8 ? marketContext.technicalFacts.riskRewardRatioLong : 'INVALID (no valid nearby resistance >= 1:1.8)'}
* Short Position: Ideal SL ceiling = $${marketContext.technicalFacts.atrSuggestedStopLossShort} | Target = $${marketContext.technicalFacts.atrSuggestedTakeProfitShort} | Calculated Risk-to-Reward Ratio = 1:${marketContext.technicalFacts.riskRewardRatioShort && marketContext.technicalFacts.riskRewardRatioShort >= 1.8 ? marketContext.technicalFacts.riskRewardRatioShort : 'INVALID (no valid nearby support >= 1:1.8)'}
* IMPORTANT: A trade setup is ONLY VALID when the calculated R/R is at least 1:1.8. If either side shows INVALID, DO NOT take that side unless a higher timeframe gives a clearly reachable target with confirmed volume.
` : '';

  const recentSignals = marketContext.recentHistoricalSignals || [];
  const validSignals = recentSignals.filter((s: HistoricalSignalFeedback) => s.status && s.status !== 'PENDING');
  const winCount = validSignals.filter((s: HistoricalSignalFeedback) => s.status === 'WIN' || s.status === 'TAKE_PROFIT').length;
  const totalClosed = validSignals.length;
  const historicalWinRate = totalClosed > 0 ? Math.round((winCount / totalClosed) * 100) : null;

  const recentSignalsText = totalClosed > 0
    ? `
HISTORICAL ACCURACY CONTEXT FOR ${symbol} (CLOSED-LOOP FEEDBACK):
- Recent Track Record: ${winCount}/${totalClosed} Wins (${historicalWinRate}% Win Rate over last closed trades).
- Guidance: Use your recent historical win rate to calibrate position confidence. If recent accuracy is low, enforce stricter invalidation boundaries and demand higher confluence before entry. Do NOT overfit or bias toward previous trade directions (BUY/SELL) — analyze current market structure independently.
` : '';

  const warnings = marketContext.economicWarnings || [];
  const economicWarningsText = warnings.length > 0
    ? `
CRITICAL MACROECONOMIC WARNING ALERTS:
${warnings.map((w, idx) => `* ALERT ${idx + 1}: ${w}`).join('\n')}
` : '';

  const newsSentimentIndex = marketContext.news?.newsSentimentIndex ?? 0.0;
  const newsSentimentLabel = newsSentimentIndex > 0.3 ? 'BULLISH' : newsSentimentIndex < -0.3 ? 'BEARISH' : 'NEUTRAL';

  const newsHeadlines = marketContext.news?.summaryForPrompt
    ? marketContext.news.summaryForPrompt
    : (marketContext.news?.articles?.length
        ? marketContext.news.articles.slice(0, 5).map((a) => {
            const dateStr = a.published_at ? a.published_at.substring(0, 10) : 'N/A';
            return `- [${a.source ?? 'N/A'}, ${dateStr}] ${a.title ?? 'N/A'} (sentiment: ${typeof a.sentimentScore === 'number' ? (a.sentimentScore > 0 ? `+${a.sentimentScore}` : a.sentimentScore) : 'N/A'})`;
          }).join('\n')
        : 'No recent market news available. N/A (Data Unavailable)');

  const newsSummaryText = newsHeadlines;

  const ob = marketContext.microstructure?.orderBookDepth;
  const cvd = marketContext.microstructure?.volumeDeltaCvd;
  const hasRealDepth = ob && typeof ob.bestBid === 'number' && ob.bestBid > 0 && (ob.bidDepthVolumeTop20 > 0 || ob.askDepthVolumeTop20 > 0);
  const obText = hasRealDepth
    ? `Bid/Ask=$${ob.bestBid}/$${ob.bestAsk} | Spread=$${ob.spread} (${ob.spreadPercentage}%) | Bid Depth Top 20=${ob.bidDepthVolumeTop20} | Ask Depth Top 20=${ob.askDepthVolumeTop20} | Imbalance=${ob.imbalanceRatio} (${ob.orderBookPressure})`
    : `Orderbook depth: N/A (Data Unavailable)`;
  const hasRealCvd = cvd && typeof cvd.takerBuyVolume === 'number' && cvd.sampleTradesCount > 0;
  const cvdText = hasRealCvd
    ? `CVD Signal=${cvd.cvdSignal} | Delta=${cvd.volumeDelta} | Taker Buy/Sell=${cvd.takerBuyVolume}/${cvd.takerSellVolume} (Ratio: ${cvd.buySellRatio}) | Trades=${cvd.sampleTradesCount}`
    : `CVD: N/A (Data Unavailable)`;
  const liqText = marketContext.microstructure?.liquidationsStatus ? ` | Liquidations=${marketContext.microstructure.liquidationsStatus}` : '';

  const modeInstruction = mode === 'scalp'
    ? 'CRITICAL MODE CONSTRAINT: You are in SCALP MODE. Output ONLY Section 1 (the JSON block starting with ```json and ending with ```). DO NOT write any report or markdown text after the JSON block.'
    : 'You are in SWING MODE. Output Section 1 (JSON block) first, followed by Section 2 (Exhaustive Institutional Markdown Report).';

  const mtfText = Object.entries(marketContext.timeframes || {})
    .map(([tf, td]) => {
      const ind = td?.indicators;
      if (!ind) return `- ${tf}: no data`;
      const candles = td.candles || [];

      // Warm-up candle filtering (R2)
      const validCandles = filterWarmupCandles(candles);

      // Select candle count per timeframe:
      // - primary timeframe: 50 candles (full historical context for accurate structure & trend)
      // - 4h and 1d: 30 candles (macro trend & key S/R context)
      // - other timeframes: 20 candles
      const isPrimary = tf.toLowerCase() === timeframe.toLowerCase();
      const isHigherTf = tf === '4h' || tf === '1d';
      const targetCount = isPrimary ? 50 : (isHigherTf ? 30 : 20);
      const selectedCandles = validCandles.slice(-targetCount);

      // Calculate Volume Surge Ratio
      const slice20 = candles.slice(-20);
      const avgVol20 = slice20.length > 0 ? slice20.reduce((acc, c) => acc + c.volume, 0) / slice20.length : 1;
      const latestVol = candles.length > 0 ? candles[candles.length - 1].volume : 0;
      const volumeSurgeRatio = avgVol20 > 0 ? Number((latestVol / avgVol20).toFixed(2)) : 1.0;

      const summaryLine = `- ${tf}: Close=$${td.latestClose} | EMA7=$${ind.ema_7} | EMA20=$${ind.ema_20} | EMA50=$${ind.ema_50} | RSI14=${ind.rsi_14} (${ind.rsi_condition}) | MACD Hist=${ind.macd_hist} (${ind.macd_condition}) | ATR=$${ind.atr_14} | VolSurge=${volumeSurgeRatio}x | S/R=${(td.keyLevels?.supportLevels || []).length}/${(td.keyLevels?.resistanceLevels || []).length} levels`;

      if (selectedCandles.length === 0) {
        return `${summaryLine}\n  [${tf}] columns: time_utc | O | H | L | C | V | body% | topwick% | botwick% | rsi14 | macd_hist\n  (No valid candles available after warm-up filtering)`;
      }

      const tableHeader = `  [${tf}] columns: time_utc | O | H | L | C | V | body% | topwick% | botwick% | rsi14 | macd_hist`;
      const tableRows = selectedCandles.map((c) => {
        const timeUtc = formatCandleTime(c);
        const range = c.high - c.low;
        const bodyPct = range > 0 ? Math.round((Math.abs(c.close - c.open) / range) * 100) : 100;
        const topWickPct = range > 0 ? Math.round(((c.high - Math.max(c.open, c.close)) / range) * 100) : 0;
        const botWickPct = range > 0 ? Math.round(((Math.min(c.open, c.close) - c.low) / range) * 100) : 0;
        const rsi14 = c.indicators?.rsi_14 !== undefined ? Number(c.indicators.rsi_14.toFixed(1)) : 'N/A';
        const macdHist = c.indicators?.macd_hist !== undefined ? Number(c.indicators.macd_hist.toFixed(1)) : 'N/A';

        return `  ${timeUtc} | ${c.open} | ${c.high} | ${c.low} | ${c.close} | ${c.volume} | ${bodyPct} | ${topWickPct} | ${botWickPct} | ${rsi14} | ${macdHist}`;
      }).join('\n');

      return `${summaryLine}\n${tableHeader}\n${tableRows}`;
    })
    .join('\n\n');

  const userPrompt = `TARGET ASSET: ${symbol} (${timeframe})
EXCHANGE VENUE: ${exchange.toUpperCase()}
CURRENT PRICE: $${price} (24h Change: ${change24h}%)
${technicalFactsText}
${economicWarningsText}
${recentSignalsText}
${modeInstruction}

RAW QUANTITATIVE MARKET DATA PAYLOAD:
- Ticker: Price=$${price} | 24h Change=${change24h}% | High/Low/Volume: $${marketContext.ticker?.high24h ?? 'N/A'}/$${marketContext.ticker?.low24h ?? 'N/A'}/$${marketContext.ticker?.volume24h ?? 'N/A'}
- Derivatives: Funding=${marketContext.derivatives?.fundingRate ?? 'N/A'} | OI=${marketContext.derivatives?.openInterest ?? 'N/A'} | Basis=${marketContext.derivatives?.basisPremiumPct ?? 0}%
- Microstructure: ${obText} | ${cvdText}${liqText}
- Macro: Fear&Greed=${marketContext.macroSentiment?.fearAndGreed?.value ?? 'N/A'} (${marketContext.macroSentiment?.fearAndGreed?.classification ?? 'N/A'}) | Stablecoin Mcap=$${marketContext.macroSentiment?.stablecoinLiquidity?.totalStablecoinMarketCapUsd ?? 'N/A'}

MARKET NEWS & INTELLIGENCE HEADLINES:
- Aggregate News Sentiment Index: ${newsSentimentIndex} (${newsSentimentLabel})
${newsSummaryText}

MULTI-TIMEFRAME INDICATORS & PRICE ACTION ANATOMY:
${mtfText}

Provide the Output matching the mode constraints.`;

  // R5 safety ceiling: warn loudly in dev if the prompt balloons; NEVER truncate silently.
  if (process.env.NODE_ENV !== 'production' && userPrompt.length > 120_000) {
    console.warn(
      `[institutional-prompt] User prompt exceeds safety ceiling: ${userPrompt.length} chars (~${estimatePromptTokens(userPrompt)} tokens). Review candle counts / news volume.`
    );
  }

  return userPrompt;
}

