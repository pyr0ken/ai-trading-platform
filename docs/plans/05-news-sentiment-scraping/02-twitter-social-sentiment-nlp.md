# 🐦 News & Sentiment — Part 2: Twitter/X Social Sentiment & NLP Intelligence

> **Module:** `backend/app/features/news/sentiment/`  
> **Key Capabilities:** Social Media Buzz Ingestion, Sentiment Quantization, Fear & Greed Index Aggregation.

---

## 1. Social Sentiment Pipeline

1. **Twitter/X & Telegram Crypto Feed Ingestion:**
   - Real-time stream of crypto influencer posts, breaking alerts, and whale transaction monitors.
2. **NLP Quantization:**
   - Clean tweets (strip cashtags, spam, referral links).
   - Compute Sentiment Polarity: $[-1.0 \text{ (Extreme Panic)} \dots +1.0 \text{ (Extreme Euphoria)}]$.
3. **Sentiment Divergence Detection:**
   - **Bullish Divergence:** Price dropping while Social Sentiment & Fear/Greed is rising (Retail Panic Selling vs Smart Money Accumulation).
   - **Bearish Divergence:** Price making higher highs while Social Sentiment is declining (Exhaustion).

---

## 2. API Contract for Agent Tool

The AI Agent accesses sentiment via `@register_tool`:

```python
@registry.register(
    name="get_market_sentiment_snapshot",
    description="Fetch real-time Fear & Greed index, news sentiment, and Twitter buzz score for a symbol."
)
async def get_market_sentiment_snapshot(symbol: str) -> dict:
    # Returns { fear_and_greed: 42, news_sentiment: 0.28, social_buzz: "HIGH", macro_risk: "LOW" }
    ...
```
