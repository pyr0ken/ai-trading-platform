/**
 * Dynamic Macroeconomic Calendar & Risk Warning System
 */

export interface ScheduledEvent {
  name: string;
  type: 'NFP' | 'CPI' | 'FOMC' | 'CUSTOM';
  dateUtc: string; // ISO date string e.g. "2026-08-14"
  description: string;
}

export class EconomicCalendar {
  private static customEvents: ScheduledEvent[] = [];

  public static setScheduledEvents(events: ScheduledEvent[]): void {
    this.customEvents = events;
  }

  public static getEconomicWarnings(
    dateInput?: string | Date,
    eventsOverride?: ScheduledEvent[]
  ): string[] {
    const warnings: string[] = [];
    const date = dateInput ? new Date(dateInput) : new Date();

    if (isNaN(date.getTime())) {
      return warnings;
    }

    const dayOfMonth = date.getUTCDate();
    const dayOfWeek = date.getUTCDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    const isoDateStr = date.toISOString().split('T')[0];

    const eventsToUse = eventsOverride ?? this.customEvents;

    // 1. Check explicit scheduled events (if provided)
    if (eventsToUse.length > 0) {
      for (const ev of eventsToUse) {
        if (ev.dateUtc === isoDateStr) {
          warnings.push(`${ev.name} is ACTIVE TODAY. ${ev.description}`);
        } else {
          const tomorrow = new Date(date);
          tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
          if (ev.dateUtc === tomorrow.toISOString().split('T')[0]) {
            warnings.push(`${ev.name} is TOMORROW. Prepare risk reduction strategies.`);
          }
        }
      }
    }

    // 2. Accurate NFP Check (First Friday of the month)
    if (dayOfWeek === 5 && dayOfMonth <= 7) {
      warnings.push('US Non-Farm Payrolls (NFP) announcement window is TODAY. Expect high spreads, slippage, and intense short-term volatility.');
    } else if (dayOfWeek === 4 && dayOfMonth <= 6) {
      warnings.push('US Non-Farm Payrolls (NFP) announcement is TOMORROW. Prepare risk reduction strategies.');
    }

    // 3. Weekend Liquidity Warning (Saturday / Sunday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      warnings.push('WEEKEND TRADING SESSION: Traditional financial markets are CLOSED. Crypto orderbook liquidity may be thin, increasing risk of manipulative wicks and false breakouts.');
    }

    return warnings;
  }
}
