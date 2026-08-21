/**
 * Price formatting utilities — single source of truth for decimal precision.
 *
 * WHY THIS EXISTS
 * ---------------
 * Scattering `toFixed(2)` or `toFixed(price < 1 ? 4 : 2)` across the codebase
 * silently destroys sub-cent assets.  SHIB at $0.0000185 → `toFixed(4)` →
 * "0.0000" → parsed back as 0 → ticker shows nothing and the full-context
 * route throws "Failed to aggregate market data context."
 *
 * This module owns the single canonical rule for every price display and
 * rounding operation in the platform.
 */

/**
 * Return the number of decimal places appropriate for a price of the given
 * magnitude, keeping ~6 significant figures where it matters while staying
 * human-readable on large-cap prices.
 *
 * Examples:
 *   BTC  $65 432.50  → 2
 *   ETH  $ 3 520.00  → 2
 *   SOL  $   165.50  → 2
 *   XRP  $     0.5234 → 4
 *   DOGE $     0.1023 → 4
 *   SHIB $     0.0000185 → 8
 *   PEPE $     0.0000098 → 8
 */
export function priceDecimals(price: number): number {
  const p = Math.abs(price);
  if (!Number.isFinite(p) || p === 0) return 2;
  if (p >= 1000) return 2;
  if (p >= 100)  return 2;
  if (p >= 1)    return 4;
  if (p >= 0.1)  return 5;
  if (p >= 0.01) return 6;
  if (p >= 0.0001) return 7;
  return 8; // SHIB, PEPE, BONK, FLOKI …
}

/** Round a raw price number to the appropriate precision. */
export function roundPrice(price: number, reference?: number): number {
  const d = priceDecimals(reference ?? price);
  return Number(price.toFixed(d));
}

/**
 * Format a price for display.
 *
 * @param price   - The numeric price value.
 * @param options.prefix   - Prepend "$" (default true).
 * @param options.compact  - Use locale thousand-separators (default true).
 * @param options.decimals - Override the auto-computed decimal count.
 */
export function formatPrice(
  price: number | undefined | null,
  options: { prefix?: boolean; compact?: boolean; decimals?: number } = {}
): string {
  if (price == null || !Number.isFinite(price) || price <= 0) return '—';
  const { prefix = true, compact = true, decimals } = options;
  const d = decimals ?? priceDecimals(price);

  const formatted = compact
    ? price.toLocaleString('en-US', {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })
    : price.toFixed(d);

  return prefix ? `$${formatted}` : formatted;
}

/**
 * Format a price *change* value (can be negative).
 * Follows the same decimal precision as formatPrice but never shows "—" for 0.
 */
export function formatPriceChange(
  change: number | undefined | null,
  reference: number,
  options: { prefix?: boolean } = {}
): string {
  if (change == null || !Number.isFinite(change)) return '—';
  const { prefix = true } = options;
  const d = priceDecimals(reference);
  const formatted = change.toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
    signDisplay: 'always',
  });
  return prefix ? `$${formatted}` : formatted;
}
