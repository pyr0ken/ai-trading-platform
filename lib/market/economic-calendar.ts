/**
 * Deterministic Macroeconomic Calendar & Dynamic Risk Warning System
 */
export class EconomicCalendar {
  public static getEconomicWarnings(dateInput?: string | Date): string[] {
    const warnings: string[] = [];
    const date = dateInput ? new Date(dateInput) : new Date();
    
    // Safety check for invalid date
    if (isNaN(date.getTime())) {
      return warnings;
    }

    const dayOfMonth = date.getUTCDate();
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    const month = date.getUTCMonth(); // 0 = Jan ... 11 = Dec

    // 1. Check for NFP (First Friday of the month)
    if (dayOfWeek === 5 && dayOfMonth <= 7) {
      warnings.push('US Non-Farm Payrolls (NFP) announcement is TODAY. Expect high spreads, slippage, and intense short-term volatility.');
    } else if (dayOfWeek === 4 && dayOfMonth <= 6) {
      warnings.push('US Non-Farm Payrolls (NFP) announcement is TOMORROW. Prepare risk reduction strategies.');
    }

    // 2. Check for US CPI Inflation Report (Mid-month window: 11th - 14th)
    if (dayOfMonth === 12 || dayOfMonth === 13) {
      warnings.push('US CPI Inflation report release window is ACTIVE TODAY. Critical macroeconomic catalyst; major market price swings expected.');
    } else if (dayOfMonth === 11) {
      warnings.push('US CPI Inflation report release window is TOMORROW. High institutional repositioning volatility expected.');
    }

    // 3. Dynamic FOMC Meeting Window Detection (8 meetings per year)
    // FOMC meetings typically occur in Jan, Mar, May, Jun, Jul, Sep, Nov, Dec (around 3rd/4th week)
    const fomcMonths = [0, 2, 4, 5, 6, 8, 10, 11]; // Jan, Mar, May, Jun, Jul, Sep, Nov, Dec
    if (fomcMonths.includes(month)) {
      if (dayOfMonth >= 18 && dayOfMonth <= 22 && (dayOfWeek === 2 || dayOfWeek === 3)) {
        warnings.push('Federal Reserve FOMC Interest Rate Decision & Press Conference window is ACTIVE. Severe market volatility likely across all assets.');
      }
    }

    // 4. Weekend Liquidity Warning (Saturday / Sunday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      warnings.push('WEEKEND TRADING SESSION: Traditional financial markets are CLOSED. Crypto orderbook liquidity may be thin, increasing risk of manipulative wicks and false breakouts.');
    }

    return warnings;
  }
}
