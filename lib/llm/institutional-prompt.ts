import { FullMarketContextPayload, HistoricalSignalFeedback } from '@/types/analysis';
import { CandleData, CalculatedIndicators } from '@/types/market';
import { renderRegimeForPrompt } from '@/lib/analysis/market-regime';
import { renderDecisionZonesForPrompt } from '@/lib/analysis/decision-zones';
import { describeFormingCandle } from '@/lib/market/closed-candle';
import { renderCostModelForPrompt } from '@/lib/analysis/trading-costs';
import { renderGateRulesForPrompt } from '@/lib/analysis/no-trade-gate';
import { computeVolumeSurgeRatio } from '@/lib/market/volume-surge';

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
  ],
  "playbook": {
    "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
    "bias_confidence": number (0 to 100),
    "primary_path": {
      "narrative": string,
      "probability": number,
      "trigger_zone_id": string (e.g. "R1" or "S1"),
      "invalidated_by": string,
      "branches": [
        {
          "zone_id": string,
          "outcome": "REJECT" | "BREAK",
          "probability": number,
          "target": number,
          "rationale": string
        }
      ]
    },
    "alternative_path": {
      "narrative": string,
      "probability": number,
      "trigger_zone_id": string,
      "invalidated_by": string,
      "branches": [ ... ]
    },
    "actionable": {
      "status": "READY" | "WAIT_FOR_ZONE" | "NO_TRADE",
      "waiting_for": string | null (populated ONLY when status is WAIT_FOR_ZONE, e.g. "price to reach S1 (63234-63361) and reject"),
      "anchor_zone_id": string | null (zone id this trade keys off, e.g. "S1"),
      "setup": {
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
      } | null (populated ONLY when status is READY; MUST be null when status is WAIT_FOR_ZONE or NO_TRADE)
    },
    "referenced_zone_ids": [string] (e.g. ["R1", "S1", "S2"])
  }
}

CRITICAL ACTIONABLE STATUS RULES:
1. "READY": Use ONLY when price is CURRENTLY sitting inside or at a Decision Zone boundary and the entry criteria are confirmed right now.
2. "WAIT_FOR_ZONE": Use when you have a clear directional bias, but price is mid-structure or between zones. Set setup to null, and populate waiting_for with the exact zone and reaction you are waiting for. DO NOT manufacture an immediate entry when price is mid-range.
3. "NO_TRADE": Use when market structure is unreadable or conflicting signals destroy edge. Set setup to null.

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
 * are unreliable because a short series can produce sma_50 === close as a
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
      Number.isNaN(ind.sma_50);
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
- If ADX < 20 the market is ranging — you may still form a directional BIAS from RSI position, EMA alignment, MACD histogram direction, and zone proximity. But a bias is not an entry: in a ranging regime the edge lives at zone EDGES, so the correct output is usually WAIT_FOR_ZONE until price reaches one.
- Distinguish BIAS from EXECUTION. Your directional read (bullish/bearish) and your action (enter now vs wait) are separate decisions. A strong bearish bias with price sitting mid-range is a WAIT, not a SELL.
- Do NOT force an immediate entry to avoid looking indecisive. Entering mid-structure because "some signal exists" is the single largest source of losing trades. If price is not at a decision zone, say so and wait.
- The signal field accepts BUY / SELL / HOLD / NEUTRAL and must reflect your directional BIAS. Whether to act on it right now is expressed separately via the actionable status.

DETERMINISTIC ATR-BASED RISK BUFFER GUIDELINES (USE AS NON-BINDING REFERENCE FOR SL/TP PLACEMENT):
* Long Position: Ideal SL floor = $${marketContext.technicalFacts.atrSuggestedStopLossLong} | Target = $${marketContext.technicalFacts.atrSuggestedTakeProfitLong} | Calculated Risk-to-Reward Ratio = 1:${marketContext.technicalFacts.riskRewardRatioLong && marketContext.technicalFacts.riskRewardRatioLong >= 1.8 ? marketContext.technicalFacts.riskRewardRatioLong : 'INVALID (no valid nearby resistance >= 1:1.8)'}
* Short Position: Ideal SL ceiling = $${marketContext.technicalFacts.atrSuggestedStopLossShort} | Target = $${marketContext.technicalFacts.atrSuggestedTakeProfitShort} | Calculated Risk-to-Reward Ratio = 1:${marketContext.technicalFacts.riskRewardRatioShort && marketContext.technicalFacts.riskRewardRatioShort >= 1.8 ? marketContext.technicalFacts.riskRewardRatioShort : 'INVALID (no valid nearby support >= 1:1.8)'}
* IMPORTANT: A trade setup is ONLY VALID when the calculated R/R is at least 1:1.8. If either side shows INVALID, DO NOT take that side unless a higher timeframe gives a clearly reachable target with confirmed volume.
` : '';

  const recentSignals = marketContext.recentHistoricalSignals || [];
  const validSignals = recentSignals.filter((s: HistoricalSignalFeedback) => s.status && s.status !== 'PENDING');

  /**
   * Win rate is computed over trades that ACTUALLY OPENED.
   *
   * NOT_FILLED means the entry price was never reached — no position existed,
   * so it is neither a win nor a loss and must not dilute the win rate.
   */
  const filledSignals = validSignals.filter(
    (s: HistoricalSignalFeedback) => s.status !== 'NOT_FILLED' && s.status !== 'NO_TRADE'
  );
  const winCount = filledSignals.filter(
    (s: HistoricalSignalFeedback) => s.status === 'WIN' || s.status === 'TAKE_PROFIT'
  ).length;
  const totalClosed = filledSignals.length;
  const historicalWinRate = totalClosed > 0 ? Math.round((winCount / totalClosed) * 100) : null;

  /**
   * Fill rate is reported SEPARATELY and is the feedback that was missing.
   *
   * A setup whose entry never printed is invisible in win/loss terms, so a model
   * that repeatedly asks for entries price never reaches receives no corrective
   * signal at all — it just sees fewer results. Surfacing the miss rate makes
   * that failure mode legible and lets the model tighten its entry bands.
   */
  const notFilledCount = validSignals.filter(
    (s: HistoricalSignalFeedback) => s.status === 'NOT_FILLED'
  ).length;
  const fillAttempts = totalClosed + notFilledCount;
  const fillRate = fillAttempts > 0 ? Math.round((totalClosed / fillAttempts) * 100) : null;

  const fillRateLine =
    fillRate !== null && fillAttempts >= 3
      ? `\n- Entry Fill Rate: ${totalClosed}/${fillAttempts} setups actually filled (${fillRate}%).${
          fillRate < 60
            ? ' WARNING: most proposed entries were never reached. Your entry bands are too far from price — anchor them to a zone price can realistically trade into, or use WAIT_FOR_ZONE instead of a band price will not visit.'
            : ''
        }`
      : '';

  const recentSignalsText = totalClosed > 0 || notFilledCount > 0
    ? `
HISTORICAL ACCURACY CONTEXT FOR ${symbol} (CLOSED-LOOP FEEDBACK):
- Recent Track Record: ${winCount}/${totalClosed} Wins${historicalWinRate !== null ? ` (${historicalWinRate}% Win Rate over filled trades)` : ''}.${fillRateLine}
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

  const newsIntel = marketContext.newsIntelligence;

  /**
   * Render the pre-analysed, symbol-filtered news brief.
   *
   * Falls back to the raw aggregated summary only when the intelligence layer
   * produced nothing at all — and says so explicitly, so the model knows the
   * difference between analysed intelligence and an unranked keyword dump.
   */
  const newsIntelligenceText = (() => {
    if (!newsIntel) {
      const raw = marketContext.news?.summaryForPrompt;
      if (!raw) return 'NEWS & MACRO INTELLIGENCE: N/A (Data Unavailable)';
      return `NEWS HEADLINES (RAW — intelligence layer unavailable, treat as unranked and unfiltered):
- Aggregate Keyword Sentiment Index: ${newsSentimentIndex} (${newsSentimentLabel})
${raw}`;
    }

    const b = newsIntel.brief;
    const ageMin = Math.max(0, Math.round((Date.now() - (Date.parse(b.generatedAt) || Date.now())) / 60_000));
    const lines: string[] = [];

    lines.push('NEWS & MACRO INTELLIGENCE BRIEF (pre-analysed, symbol-filtered, relevance-ranked):');
    lines.push(
      `- Provenance: ${b.isFallback ? 'DETERMINISTIC LEXICON (LLM analysis unavailable — lower confidence)' : 'LLM-ANALYSED'} | generated ${ageMin}m ago | ${b.sourceArticleCount} articles scanned`
    );
    lines.push(`- Aggregate Regime Bias: ${b.aggregateBias} (confidence ${b.biasConfidence}%)`);
    lines.push(
      `- Symbol-Weighted News Sentiment: ${newsIntel.weightedSentiment} (from ${newsIntel.directionalArticleCount} of ${newsIntel.rankedArticles.length} surfaced articles carrying directional signal; neutral items excluded so they do not dilute real signal)`
    );

    if (b.macroDrivers.length > 0) {
      const drivers = b.macroDrivers
        .map((d) => `[${d.driver}: ${d.direction}, w=${d.weight}, ${d.horizon}]`)
        .join(' ');
      lines.push(`- Active Macro Drivers: ${drivers}`);
    } else {
      lines.push('- Active Macro Drivers: N/A (none identified)');
    }

    if (newsIntel.directImpact) {
      const di = newsIntel.directImpact;
      lines.push(
        `- Direct Impact on ${di.asset}: ${di.impact} (magnitude ${di.magnitude}/100) — ${di.rationale}`
      );
    } else {
      lines.push(
        `- Direct Impact on ${symbol}: N/A (no asset-specific news impact identified in this window)`
      );
    }

    if (newsIntel.correlationAdjustedBtcImpact) {
      const c = newsIntel.correlationAdjustedBtcImpact;
      lines.push(`- Correlation-Adjusted BTC Spillover: ${c.verdict} (corr=${c.correlation})`);
    }

    if (b.eventRisks.length > 0) {
      lines.push('- Scheduled Event Risks:');
      for (const e of b.eventRisks) {
        lines.push(`  * ${e.event} [${e.whenUtc}] | if resolved positively: ${e.ifPassed} | if resolved negatively: ${e.ifFailed}`);
      }
    } else {
      lines.push('- Scheduled Event Risks: N/A (none identified)');
    }

    if (newsIntel.rankedArticles.length > 0) {
      lines.push(
        `- Relevant Headlines (${newsIntel.rankedArticles.length} of ${newsIntel.totalArticlesConsidered} passed the relevance filter, ranked by relevance x freshness):`
      );
      newsIntel.rankedArticles.forEach((a, i) => {
        const ageH = a.publishedAt
          ? `${Math.max(0, Math.round((Date.now() - Date.parse(a.publishedAt)) / 3_600_000))}h ago`
          : 'age unknown';
        const sentiment = a.llmSentiment !== null
          ? `sentiment ${a.llmSentiment} (LLM-corrected)`
          : `sentiment ${a.lexiconSentiment} (lexicon)`;
        lines.push(
          `  ${i + 1}. [w=${a.effectiveWeight} rel=${a.relevance}] (${a.source}, ${ageH}, ${a.category ?? 'general'}) ${a.title}`
        );
        lines.push(`     ${sentiment} | urgency ${a.timeSensitivity} | relevance basis: ${a.relevanceReason}`);
      });
    } else {
      lines.push(
        `- Relevant Headlines: NONE of the ${newsIntel.totalArticlesConsidered} scanned articles were materially relevant to ${symbol}. Treat news as NEUTRAL and rely on price action and microstructure.`
      );
    }

    lines.push(
      '- USAGE RULE: news adjusts CONVICTION and INVALIDATION LEVELS, it does not override market structure. Never take a trade against confirmed structure on a headline alone. If provenance is DETERMINISTIC LEXICON, weight this section lower.'
    );

    return lines.join('\n');
  })();

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
      // - primary timeframe: 75 candles (full historical context for accurate structure & trend)
      // - 4h, 1d, and 1w: 30 candles (macro trend & key S/R context)
      // - other timeframes (e.g. 5m, 15m): 20 candles
      const isPrimary = tf.toLowerCase() === timeframe.toLowerCase();
      const isHigherTf = tf === '4h' || tf === '1d' || tf === '1w';
      const targetCount = isPrimary ? 75 : (isHigherTf ? 30 : 20);
      const selectedCandles = validCandles.slice(-targetCount);

      // Volume Surge Ratio from CLOSED candles only, via the shared helper so
      // this figure and technicalFacts.volumeSurgeRatio (which the conviction
      // scorer reads) can never drift apart into two different definitions.
      //
      // Using the forming bar here would understate volume badly — measured at
      // 64% of average on a half-elapsed 1h bar — faking a "volume dries up"
      // reading and suppressing genuine breakout confirmation.
      const volumeSurgeRatio = computeVolumeSurgeRatio(validCandles);

      const summaryLine = `- ${tf}: Close=$${td.latestClose} | EMA7=$${ind.ema_7} | EMA20=$${ind.ema_20} | EMA50=$${ind.ema_50} | RSI14=${ind.rsi_14} (${ind.rsi_condition}) | MACD Hist=${ind.macd_hist} (${ind.macd_condition}) | ATR=$${ind.atr_14} | VolSurge=${volumeSurgeRatio}x | S/R=${(td.keyLevels?.supportLevels || []).length}/${(td.keyLevels?.resistanceLevels || []).length} levels`;

      // Live-bar disclosure: the forming candle is deliberately excluded from
      // every number above. Stating that explicitly stops the model from
      // assuming the feed is stale and "correcting" for a lag that isn't there.
      const formingLine = td.formingCandle
        ? `\n  ${describeFormingCandle(td.formingCandle, tf).split('\n').join('\n  ')}`
        : '';

      if (selectedCandles.length === 0) {
        return `${summaryLine}${formingLine}\n  [${tf}] columns: time_utc | O | H | L | C | V | body% | topwick% | botwick% | rsi14 | macd_hist\n  (No valid candles available after warm-up filtering)`;
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

      return `${summaryLine}${formingLine}\n${tableHeader}\n${tableRows}`;
    })
    .join('\n\n');

  /**
   * Deterministic pre-analysis blocks.
   *
   * These are rendered from values computed in code, not asked of the model.
   * They are placed BEFORE the raw payload so the model reads the measured
   * structure first and treats the raw candles as supporting evidence rather
   * than as something to re-derive its own levels from.
   *
   * Both degrade to an empty string when absent, so a payload produced before
   * this feature existed still builds a valid prompt.
   */
  const regimeText = marketContext.marketRegime
    ? `\n${renderRegimeForPrompt(marketContext.marketRegime)}\n`
    : '';

  const decisionZonesText = marketContext.decisionZones
    ? `\n${renderDecisionZonesForPrompt(marketContext.decisionZones)}\n`
    : '';

  /**
   * Execution costs and the hard constraints derived from them.
   *
   * Placed near the top of the prompt rather than buried at the end: the cost of
   * a round trip determines which targets are even worth proposing, so it has to
   * be known before the model starts sizing anything. A target inside the
   * minimum viable move is rejected by the gate regardless of how good the
   * directional read is, and a rejected signal wastes the whole analysis.
   */
  const costText = marketContext.costModel
    ? `\n${renderCostModelForPrompt(marketContext.costModel)}\n` +
      `\n${renderGateRulesForPrompt(marketContext.costModel, marketContext.mode || 'swing')}\n`
    : '';

  const userPrompt = `TARGET ASSET: ${symbol} (${timeframe})
EXCHANGE VENUE: ${exchange.toUpperCase()}
CURRENT PRICE: $${price} (24h Change: ${change24h}%)
${regimeText}${decisionZonesText}${costText}${technicalFactsText}
${economicWarningsText}
${recentSignalsText}
${modeInstruction}

RAW QUANTITATIVE MARKET DATA PAYLOAD:
- Ticker: Price=$${price} | 24h Change=${change24h}% | High/Low/Volume: $${marketContext.ticker?.high24h ?? 'N/A'}/$${marketContext.ticker?.low24h ?? 'N/A'}/$${marketContext.ticker?.volume24h ?? 'N/A'}
- Derivatives: Funding=${marketContext.derivatives?.fundingRate ?? 'N/A'} | OI=${marketContext.derivatives?.openInterest ?? 'N/A'} | Basis=${marketContext.derivatives?.basisPremiumPct ?? 0}%
- Microstructure: ${obText} | ${cvdText}${liqText}
- Macro: Fear&Greed=${marketContext.macroSentiment?.fearAndGreed?.value ?? 'N/A'} (${marketContext.macroSentiment?.fearAndGreed?.classification ?? 'N/A'}) | Stablecoin Mcap=$${marketContext.macroSentiment?.stablecoinLiquidity?.totalStablecoinMarketCapUsd ?? 'N/A'}

${newsIntelligenceText}

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

