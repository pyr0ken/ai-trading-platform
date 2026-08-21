"""
Financial NLP Sentiment Analysis Service
Combines VADER Sentiment Intensity Analyzer with custom Crypto/Quant lexicon weights.
"""

from typing import List, Dict, Any
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Custom financial/crypto lexicon overrides
FINANCIAL_CRYPTO_LEXICON = {
    "bullish": 2.5,
    "bearish": -2.5,
    "breakout": 2.0,
    "breakdown": -2.0,
    "moon": 2.0,
    "pump": 1.8,
    "dump": -2.2,
    "rekt": -2.5,
    "fud": -1.8,
    "liquidation": -2.0,
    "liquidated": -2.0,
    "ath": 2.2,
    "atl": -2.2,
    "accumulation": 1.8,
    "distribution": -1.8,
    "surging": 2.0,
    "crashing": -2.5,
    "plunge": -2.2,
    "rally": 2.0,
    "support": 0.5,
    "resistance": -0.5,
}

class SentimentService:
    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()
        # Update VADER lexicon with crypto terms
        self.analyzer.lexicon.update(FINANCIAL_CRYPTO_LEXICON)

    def analyze_text(self, text: str) -> Dict[str, Any]:
        scores = self.analyzer.polarity_scores(text)
        compound = scores["compound"]
        
        if compound >= 0.05:
            sentiment_label = "BULLISH"
        elif compound <= -0.05:
            sentiment_label = "BEARISH"
        else:
            sentiment_label = "NEUTRAL"

        return {
            "score": round(compound, 4),
            "label": sentiment_label,
            "pos": round(scores["pos"], 4),
            "neg": round(scores["neg"], 4),
            "neu": round(scores["neu"], 4),
        }

    def analyze_batch(self, items: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        results = []
        for item in items:
            text = item.get("text", "")
            item_id = item.get("id", "")
            res = self.analyze_text(text)
            res["id"] = item_id
            results.append(res)
        return results

sentiment_service = SentimentService()
