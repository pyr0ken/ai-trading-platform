/**
 * Deterministic Macroeconomic Calendar & Warning System
 */
export class EconomicCalendar {
  public static getEconomicWarnings(dateString?: string): string[] {
    const warnings: string[] = [];
    const date = dateString ? new Date(dateString) : new Date();
    
    const dayOfMonth = date.getUTCDate();
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    const month = date.getUTCMonth(); // 0 = Jan, 11 = Dec

    // 1. Check for NFP (First Friday of the month)
    if (dayOfWeek === 5 && dayOfMonth <= 7) {
      warnings.push('US Non-Farm Payrolls (NFP) announcement is TODAY. Expect high spreads, slippage, and intense short-term volatility.');
    } else if (dayOfWeek === 4 && dayOfMonth <= 6) {
      warnings.push('US Non-Farm Payrolls (NFP) announcement is TOMORROW. Prepare risk reduction strategies.');
    }

    // 2. Check for CPI (Usually 12th of every month)
    if (dayOfMonth === 12) {
      warnings.push('US CPI Inflation report release is TODAY. Critical macroeconomic catalyst; major index and cryptocurrency price swings are highly likely.');
    } else if (dayOfMonth === 11) {
      warnings.push('US CPI Inflation report release is TOMORROW. High institutional repositioning volatility expected.');
    }

    // 3. Check for FOMC (Wednesday interest rate decision, approx. every 6-8 weeks)
    const fomcDays: Record<number, number> = {
      0: 28, // Jan 28
      2: 18, // Mar 18
      4: 6,  // May 6
      5: 17, // Jun 17
      6: 29, // Jul 29 (Current month is July 2026!)
      8: 16, // Sep 16
      10: 4, // Nov 4
      11: 16 // Dec 16
    };

    if (fomcDays[month] !== undefined) {
      const fomcDay = fomcDays[month];
      if (dayOfMonth === fomcDay) {
        warnings.push('Federal Reserve (FOMC) Interest Rate Decision and Press Conference TODAY. Absolute caution required. Expect severe liquidation runs on both sides of the book.');
      } else if (dayOfMonth === fomcDay - 1) {
        warnings.push('Federal Reserve (FOMC) Interest Rate Decision is TOMORROW. Market sentiment may consolidate in anticipation of policy updates.');
      }
    }

    return warnings;
  }
}
