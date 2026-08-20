# فاز ۵: گاردریلهای فیلتر ریسک و اعتبارسنجی قطعی (Post-Processing & Risk Gates Architecture)

**مسیر سند:** `specs/002-system-design-review/reports/phase-5-post-processing-and-risk-gates.md`  
**تاریخ ایجاد:** ۲۰۲۶-۰۸-۲۰  
**وضعیت:** تکمیل شده  

---

## 🛠️ ۱. پارسر مقاوم ۴ لایهای JSON (`lib/llm/json-guard.ts`)

برای جلوگیری از بایپاس فیلترها، تابع `extractAndParseJSON` استراتژیهای زیر را دنبال میکند:

1. **بلوک ```json ... ```**
2. **بلوک ``` ... ``` عمومی**
3. **استخراج مستقیم آکولدها `{ ... }` از اول تا آخر متن**
4. **ترمیم خودکار JSON ناقص با `tryRepairJSON`**

---

## ⚖️ ۲. انسجام سیگنال و قفل سطوح قیمت

* **`enforceSignalCoherence`:** تطبیق سیگنال `BUY`/`SELL` با `LONG`/`SHORT` و رد سیگنالهای دارای استاپلاس نامعتبر.
* **`validateAndCorrectPlaybook`:** قفل کردن (`Snap`) قیمتهای حدضرری که هوش مصنوعی پیشنهاد داده روی **زونهای تصمیم ریاضی (`Decision Zones`)**.

---

## 🛑 ۳. دروازه عدم معامله (`lib/analysis/no-trade-gate.ts`)

این لایه بدون توجه به لحن هوش مصنوعی معامله را ارزیابی میکند:

```typescript
const MIN_NET_RR_HARD = 1.0;      // کف مطلق R:R خالص
const MIN_NET_RR_PREFERRED = 1.5; // R:R ایدهآل
```

* **سطوح خطا:**
  * **BLOCKING (رد مطلق):** سود کمتر از هزینه رفتوبرگشت (`COSTS_EXCEED_TARGET`)، R:R خالص زیر ۱.۰ (`NET_RR_BELOW_PARITY`) یا اسپرد فراتر از حد مجاز.
  * **DEGRADING (تضعیف نمره):** R:R باریک بین ۱.۰ تا ۱.۵، یا ADX پایین در روند.

---

## 💯 ۴. موتور نمرهدهی ضریب اطمینان ۹ فیلتره (`lib/analysis/conviction-scorer.ts`)

امتیاز ۰ تا ۱۰۰٪ بر اساس ۹ فیلتر کمی تایید تایمفریمها، زونها، R:R، اوردربوک و سنتیمنت محاسبه شده و جایگزین درصد ادعایی هوش مصنوعی میشود.
