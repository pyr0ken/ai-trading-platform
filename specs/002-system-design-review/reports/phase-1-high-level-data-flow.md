# فاز ۱: تحلیل جریان داده و لایه رابط کاربر (High-Level Data Flow Architecture)

**مسیر سند:** `specs/002-system-design-review/reports/phase-1-high-level-data-flow.md`  
**تاریخ ایجاد:** ۲۰۲۶-۰۸-۲۰  
**وضعیت:** تکمیل شده  

---

## 🏛️ ۱. چکیده و دیاگرام معماری (Executive Flow Map)

جریان داده در پلتفرم **ai-trading-platform** از کلیک کاربر روی دکمه **Run Analysis** تا صدور سیگنال و نمایش کارتهای تحلیل، یک چرخه ۶ مرحلهای را طی میکند:

```
+-----------------------------------------------------------------------+
| 1. UI Layer (CoinSelector / TopNav / AppPage)                         |
|    - User clicks 'Run Analysis' -> handleRunAnalysis()                |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 2. Data Fetching (useMarketData hook)                                 |
|    - GET /api/market/full-context                                     |
|    - Fetches multi-TF OHLCV, Orderbook, CVD, Macro, News, Whales      |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 3. Deterministic Pre-Analysis Engine                                  |
|    - Market Regime Detection (ADX per TF)                             |
|    - Decision Zones (Support / Resistance with ATR Clamping)          |
|    - Trading Cost Model (Fee + Live Spread Friction)                  |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 4. LLM Streaming Engine (useLLMAnalysis hook)                         |
|    - POST /api/analysis/stream                                        |
|    - Institutional System Prompt + User Data Payload                  |
|    - SSE Token Streaming via 9router / Hermes LLM                     |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 5. Post-Processing & Deterministic Risk Guardrails                    |
|    - extractAndParseJSON (4-strategy fail-safe parser)                |
|    - enforceSignalCoherence (BUY/SELL vs LONG/SHORT sync)             |
|    - validateAndCorrectPlaybook (Snap SL/TP to Decision Zones)        |
|    - evaluateNoTradeGate (Net R:R >= 1.0, Cost Floor Verification)    |
|    - computeConvictionScore (9-Filter Score: 0 - 100%)                |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 6. Storage & UI Render                                                |
|    - AppStorageEngine.saveAnalysis (SQLite persistent + LocalStorage) |
|    - PineScript Strategy Code Generation                              |
|    - UI Component Render & Accuracy Auto-Resolver                     |
+-----------------------------------------------------------------------+
```

---

## ⚡ ۲. رویدادهای UI و مدیریت وضعیت (State Lifecycle)

1. **دکمه ماشه (Trigger Button):** در کامپوننت `CoinSelector` (`components/market/coin-selector.tsx`) رویداد `onClick={onRunAnalysis}` اجرا میشود.
2. **ارسال وضعیت به Main View:** تابع `handleRunAnalysis` در `app/page.tsx` وضعیت `hasRun` را `true` کرده و درخواست `refetchMarketData()` را صادر میکند.
3. **هوکهای موازی:**
   * `useMarketData`: مسئول دریافت پکیج کامل داده از API.
   * `useLLMAnalysis`: مسئول مدیریت لاگهای زنده (`LogStep`) و اتصال به جریان SSE الالم.

---

## 🛡️ ۳. مدیریت خطا و بازخورد کاربر (Visual Feedback & Error Handling)

* **لاگهای زنده (Live Status Logger):** مرحله به مرحله انجام فچ دادهها و اتصال به الالم را به صورت انیمیشنی به کاربر نشان میدهد.
* **بنرهای خطای ایزولهشده:** خطاهای موتور داده (`Data Engine Failure`) از خطاهای هوش مصنوعی (`Analysis System Failure`) کاملاً جدا شدهاند تا کاربر علت دقیق مشکل را ببیند.
* **عدم Retry خودکار (Retry=0):** تصمیمگیری برای تلاش مجدد به صورت دستی به کاربر واگذار شده تا از اسپم API جلوگیری شود.
