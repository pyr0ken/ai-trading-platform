# 📰 News & Sentiment — Part 1: Multi-Source Financial News Aggregator

> **Module:** `backend/app/features/news/`  
> **Data Sources:** CryptoPanic API, CoinDesk RSS, Decrypt, CoinTelegraph, Forexfactory Macro Calendar.

---

## 1. Scraping & Ingestion Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Multi-Source News Pipeline                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Async Feed Crawlers (CryptoPanic, RSS XML Feeds)         │
│ 2. Deduplication Engine (Hashing URL + Title Levenshtein)   │
│ 3. Currency Tagging (Extract BTC, ETH, SOL, Macro, Fed)     │
│ 4. NLP Scoring Pipeline (VADER + FinBERT compound score)    │
│ 5. Cached In-Memory Ring Buffer (Top 100 recent articles)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. High-Impact Macro Event Shield

When the AI Agent plans a trade setup, it queries `check_macro_news_risk(symbol)`:
- If High-Impact news (e.g. US CPI, FOMC Interest Rate, SEC ETF Decision) is scheduled within $\pm 60$ minutes:
- **Safety Rule:** Flag warning: *«⚠️ ریسک خبر مهم: انتشار شاخص CPI طی ۴۵ دقیقه آینده؛ پیشنهاد عدم باز کردن پوزیشن پیش از تثبیت نوسان.»*
