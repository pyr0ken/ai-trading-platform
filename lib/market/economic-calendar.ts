/**
 * Deterministic Macroeconomic Calendar & Warning System
 */
export class EconomicCalendar {
  public static getEconomicWarnings(dateString?: string): string[] {
    const warnings: string[] = [];
    const date = dateString ? new Date(dateString) : new Date();
    
    const dayOfMonth = date.getUTCDate();
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday

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

    // 3. FOMC Alerts Removed (Meetings Concluded)

    return warnings;
  }
}
