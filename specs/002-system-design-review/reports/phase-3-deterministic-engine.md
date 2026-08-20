# فاز ۳: موتور پیشتحلیلهای ریاضی و قطعی (Deterministic Engine Architecture)

**مسیر سند:** `specs/002-system-design-review/reports/phase-3-deterministic-engine.md`  
**تاریخ ایجاد:** ۲۰۲۶-۰۸-۲۰  
**وضعیت:** تکمیل شده  

---

## 📊 ۱. رژیم بازار با ADX پویا (`lib/analysis/market-regime.ts`)

رژیم بازار به صورت قطعی بدون دخالت مدل هوش مصنوعی تعیین میشود:

```typescript
function getAdxThresholds(timeframe: string): { trending: number; ranging: number } {
  if (['1m', '5m', '15m'].includes(timeframe)) {
    return { trending: 28, ranging: 22 };
  }
  if (['4h', '6h', '12h', '1d', '3d', '1w'].includes(timeframe)) {
    return { trending: 20, ranging: 15 };
  }
  return { trending: 24, ranging: 18 };
}
```

* **انواع رژیمها:** `TRENDING_UP`, `TRENDING_DOWN`, `RANGING`, `COMPRESSION`, `VOLATILE_EXPANSION`.
* **وزندهی تایمفریمها:** تایمفریمهای بالا (مثل 4h و 1d) وزن بیشتری در تعیین اجماع جهت بازار دارند.

---

## 🎯 ۲. زونهای تصمیمگیری حمایت و مقاومت (`lib/analysis/decision-zones.ts`)

نواحی حمایت و مقاومت بر اساس پراکندگی قیمت و ATR استخراج میشوند:

$$\text{Half Width} = \text{Clamp}(\max(\text{Cluster Dispersion} / 2, \text{ATR} \times 0.25), \text{ATR} \times 0.25, \text{ATR} \times 1.0)$$

* **قدرت ناحیه (Strength):** بر اساس تعداد برخوردهای قبلی (Touch Count) و تازگی (Recency) سنجیده میشود.
* **احتمال برگشت یا شکست:** فرمول ریاضی با ترکیب همپوشانی اندیکاتورها، احتمال Rejection و Break را محاسبه میکند.

---

## 💰 ۳. مدل هزینههای معامله (`lib/analysis/trading-costs.ts`)

هزینه کل معامله رفت وبرگشت به صورت زنده حساب میشود:

$$\text{Round Trip Cost \%} = (\text{Maker/Taker Fee \%} \times 2) + \text{Live Spread \%}$$

این عدد به لایه **No-Trade Gate** پاس داده میشود تا از صدور معاملات با سود ناخالص کمتر از کارمزد جلوگیری شود.
