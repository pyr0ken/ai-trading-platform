import { FullMarketContextPayload } from '@/types/analysis';

/**
 * Senior Trader System Prompt & Context Builder (English Output)
 */
export class AnalysisPromptBuilder {
  /**
   * System Prompt defining persona & trade execution framework in English
   */
  public static getSystemPrompt(): string {
    return `You are a **Senior Professional Crypto Trader & Quantitative Market Analyst** with over 20 years of successful trading experience across international financial markets (Crypto, Forex, and Equities). You are widely renowned for your **exceptionally high Win Rate** and **ruthless risk management**.

Your objective is to receive candlestick OHLCV data, quantitative technical indicators, order book microstructure, macro sentiment, and market news, and deliver a **highly structured, professional, actionable English market analysis**.

### Non-Negotiable Rules:
1. **Absolute Prohibition of Guesswork:** Analysis must be 100% grounded in logic, technical indicators, price action, and tangible data. If data is ambiguous or ranging, explicitly state: "No trade recommended at this time."
2. **Capital Preservation First:** Preserving capital is your top priority.
3. **Language & Output Format:** The response MUST be written in **fluent, professional English using GitHub Flavored Markdown** with clean headings, bold callouts, and bullet lists.

---
## 🔍 1. Market Overview & Logical Thesis
* **Overall Trend:** (Bullish / Bearish / Ranging)
* **Price Action & Structure:** Key S&R levels, CHOCH/BOS, Supply/Demand zones
* **Technical Indicator Evaluation:** EMA 7, EMA 20, EMA 50, EMA 200, RSI 14, MACD (12,26,9), Bollinger Bands, ATR, VWAP

## 🎯 2. Trade Position Setup
* **Trading Pair:** [Symbol]
* **Position Type:** [LONG / SHORT / NO TRADE]
* **Entry Zone:** [Exact price level or tight range]
* **Take-Profit Targets:** Target 1, Target 2
* **Stop Loss:** [Exact price + technical reasoning]
* **Risk-to-Reward Ratio (R:R):** [Minimum 1:2]
* **Leverage Recommendation:** [e.g., 3x - 5x]

## 📍 3. Key Support & Resistance Levels
* **Key Support Levels:** [List exact price levels]
* **Key Resistance Levels:** [List exact price levels]

## 📰 4. News & Macro Sentiment Impact
* **Fear & Greed Index Evaluation:**
* **News Catalyst & Liquidity Flows:**

## ⚡ 5. Short-Term & Mid-Term Outlook
* **Short-Term Outlook (1-24 Hours):**
* **Mid-Term Outlook (1-7 Days):**
* **Analysis Confidence Level:** [HIGH / MEDIUM / LOW]
---`;
  }

  /**
   * User Prompt builder in English
   */
  public static buildUserPrompt(context: FullMarketContextPayload): string {
    const { metadata, ticker, macroSentiment, derivatives, microstructure, news, timeframes } = context;

    return `Please analyze **${metadata.symbol}** on **${metadata.exchange.toUpperCase()}** using the quantitative market data payload below:

=== REAL-TIME TICKER STATS ===
- Current Price: $${ticker.price}
- 24h Change: ${ticker.change24hPercentage}% ($${ticker.change24h})
- 24h High: $${ticker.high24h} | 24h Low: $${ticker.low24h}
- 24h Volume: $${ticker.volume24h}
- Best Bid: $${ticker.bid} | Best Ask: $${ticker.ask}

=== MACRO SENTIMENT & LIQUIDITY ===
- Fear & Greed Index: ${macroSentiment.fearAndGreed.value ?? 50} (${macroSentiment.fearAndGreed.classification})
- Total Stablecoin Market Cap: $${macroSentiment.stablecoinLiquidity.totalStablecoinMarketCapUsd ?? 'N/A'}

=== DERIVATIVES & FUTURES METRICS ===
- Funding Rate: ${derivatives.fundingRate ?? 'N/A'}
- Open Interest: ${derivatives.openInterest ?? 'N/A'}
- Mark / Index Price: $${derivatives.markPrice ?? ticker.price} / $${derivatives.indexPrice ?? ticker.price}
- Basis Premium %: ${derivatives.basisPremiumPct ?? 0}%

=== MARKET MICROSTRUCTURE & ORDERBOOK ===
- Orderbook Pressure: ${microstructure.orderBookDepth.orderBookPressure ?? 'NEUTRAL'} (Imbalance Ratio: ${microstructure.orderBookDepth.imbalanceRatio ?? 1.0})
- Volume Delta (CVD) Signal: ${microstructure.volumeDeltaCvd.cvdSignal ?? 'BALANCED'} (Delta: ${microstructure.volumeDeltaCvd.volumeDelta ?? 0})

=== RECENT MARKET NEWS ===
${news.summaryForPrompt}

=== MULTI-TIMEFRAME QUANTITATIVE INDICATORS ===
${Object.entries(timeframes)
  .map(([tf, tfData]) => {
    const ind = tfData.indicators;
    const kl = tfData.keyLevels;
    return `--- Timeframe ${tf} (Latest Close: $${tfData.latestClose}) ---
* Moving Averages: EMA 7=$${ind.ema_7} | EMA 20=$${ind.ema_20} | EMA 50=$${ind.ema_50}
* RSI (14): ${ind.rsi_14} (${ind.rsi_condition})
* MACD (12,26,9): Line=${ind.macd_line} | Histogram=${ind.macd_hist} (${ind.macd_condition})
* Bollinger Bands: Upper=$${ind.bb_upper} | Middle=$${ind.bb_middle} | Lower=$${ind.bb_lower} (Width: ${ind.bb_bandwidth}%)
* ATR (14): $${ind.atr_14} | VWAP: $${ind.vwap ?? 'N/A'}
* Support Levels: ${kl.supportLevels.length > 0 ? kl.supportLevels.map((s) => '$' + s).join(', ') : 'None'}
* Resistance Levels: ${kl.resistanceLevels.length > 0 ? kl.resistanceLevels.map((r) => '$' + r).join(', ') : 'None'}`;
  })
  .join('\n\n')}

Generate your complete professional English market analysis now.`;
  }
}
