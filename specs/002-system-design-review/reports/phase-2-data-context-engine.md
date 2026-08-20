# فاز ۲: موتور دریافت و تلفیق دادههای بازار (Data Context Engine Architecture)

**مسیر سند:** `specs/002-system-design-review/reports/phase-2-data-context-engine.md`  
**تاریخ ایجاد:** ۲۰۲۶-۰۸-۲۰  
**وضعیت:** تکمیل شده  

---

## 🏛️ ۱. ساختار روت اصلی API (`app/api/market/full-context/route.ts`)

این روت مسئول جمعآوری تمام دادههای قیمتی، اندیکاتورها، اوردربوک، اخبار و جریان آنچین نهنگهاست:

```typescript
// کنترل همزمانی برای جلوگیری از فشار حافظه و Rate-Limit
async function runLimitedConcurrency<T>(
  items: string[],
  fn: (tf: string) => Promise<[string, T | null]>,
  concurrency = 2
)
```

---

## 🛡️ ۲. جلوگیری از Repaint با تفکیک کندل در حال تشکیل (`splitClosedCandles`)

تکنیک حیاتی پلتفرم در فایل `lib/market/closed-candle.ts`:

* کندلهای دریافتی از صرافی همیشه کندل آخر را به صورت ناقص (In-Progress) شامل میشوند که قیمت آن مداوم تغییر میکند.
* **راه حل:** کندل زنده از کندلهای بستهشده تفکیک میشود (`splitClosedCandles`). تمام اندیکاتورها (EMA, RSI, MACD) **فقط و فقط روی کندلهای بسته شده** محاسبه میشوند تا اندیکاتور دچار Repainting نشود.

---

## 📐 ۳. موتور اندیکاتورهای تکنیکال (`TechnicalIndicatorEngine`)

در فایل `lib/market/indicators.ts` اندیکاتورهای زیر محاسبه میشوند:

* **EMA (Exponential Moving Average):** دورههای ۷، ۲۰، ۵۰ و ۲۰۰.
* **RSI (Relative Strength Index):** ۱۴ دوره همراه با تشخیص واگراییهای مثبت و منفی (Divergence).
* **MACD:** خط MACD، خط سیگنال و هیستوگرام.
* **ATR (Average True Range):** مقیاس واقعی نوسان بازار برای تعیین استاپلاس و پهنای زونها.
* **Bollinger Bands:** پهنای باند (Bandwidth) برای تشخیص فشردهسازی نوسان (Compression).

---

## 📊 ۴. میکرواستراکچر و اخبار

* **Orderbook Depth & CVD:** محاسبه نسبت سفارشات خرید و فروش صرافی و دلتای حجم خریداران/فروشندگان شتابزده.
* **RSS News Intelligence:** دریافت اخبار از منابع اصلی، نمرهدهی با لغتنامه مالی (`analyzeSentimentDeterministic`) و کشینگ ۵ دقیقهای.
* **Whale Flow:** دریافت تراکنشهای بزرگ آنچین با تایماوت ۵ ثانیهای ایزوله.
