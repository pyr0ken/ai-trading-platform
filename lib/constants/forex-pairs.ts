export interface ForexPairMeta {
  symbol: string; // Normalized e.g. "EURUSD"
  name: string;   // Display name e.g. "EUR/USD"
  category: 'Majors' | 'Minors' | 'Commodities' | 'Indices';
  pipSize: number; // e.g. 0.0001 for EUR/USD, 0.01 for USD/JPY
  decimals: number; // Price display decimals
  tradingViewSymbol: string; // Symbol for TradingView widget
  description?: string;
}

export const FOREX_PAIRS: ForexPairMeta[] = [
  // ── Majors ──────────────────────────────────────────
  { symbol: 'EUR/USD', name: 'Euro / US Dollar',         category: 'Majors',      pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:EURUSD', description: 'Most liquid pair' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'Majors',      pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:GBPUSD' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen',  category: 'Majors',      pipSize: 0.01,   decimals: 3, tradingViewSymbol: 'OANDA:USDJPY' },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc',   category: 'Majors',      pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:USDCHF' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', category: 'Majors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:AUDUSD' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', category: 'Majors',   pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:USDCAD' },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', category: 'Majors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:NZDUSD' },
  // ── Minors ──────────────────────────────────────────
  { symbol: 'EUR/GBP', name: 'Euro / British Pound',     category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:EURGBP' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen',      category: 'Minors', pipSize: 0.01,   decimals: 3, tradingViewSymbol: 'OANDA:EURJPY' },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', category: 'Minors', pipSize: 0.01, decimals: 3, tradingViewSymbol: 'OANDA:GBPJPY' },
  { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc',       category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:EURCHF' },
  // ── Commodities ─────────────────────────────────────
  { symbol: 'XAU/USD', name: 'Gold / US Dollar',         category: 'Commodities', pipSize: 0.01,  decimals: 2, tradingViewSymbol: 'OANDA:XAUUSD' },
  { symbol: 'XAG/USD', name: 'Silver / US Dollar',       category: 'Commodities', pipSize: 0.001, decimals: 3, tradingViewSymbol: 'OANDA:XAGUSD' },
  { symbol: 'XTI/USD', name: 'WTI Crude Oil / US Dollar', category: 'Commodities', pipSize: 0.01, decimals: 2, tradingViewSymbol: 'TVC:USOIL' },
  // ── Indices ─────────────────────────────────────────
  { symbol: 'DXY',     name: 'US Dollar Index',          category: 'Indices',  pipSize: 0.01, decimals: 2, tradingViewSymbol: 'TVC:DXY' },
  { symbol: 'US30',    name: 'Dow Jones Industrial Average', category: 'Indices', pipSize: 0.1, decimals: 1, tradingViewSymbol: 'INDEX:DJI' },
  { symbol: 'SPX500',  name: 'S&P 500 Index',            category: 'Indices',  pipSize: 0.1, decimals: 1, tradingViewSymbol: 'INDEX:SPX' },
  { symbol: 'NAS100',  name: 'Nasdaq 100 Index',         category: 'Indices',  pipSize: 0.1, decimals: 1, tradingViewSymbol: 'INDEX:IXIC' },
];

const FOREX_MAP = new Map<string, ForexPairMeta>();
for (const p of FOREX_PAIRS) {
  FOREX_MAP.set(p.symbol, p);
  FOREX_MAP.set(p.symbol.replace('/', ''), p); // also store slashless
}

/**
 * Get pip info for any symbol. Returns forex info if it's a forex pair,
 * or a sensible default for crypto.
 */
export function getPipInfo(symbol: string): {
  pipSize: number;
  decimals: number;
  isForex: boolean;
  tradingViewSymbol: string;
} {
  const clean = symbol.toUpperCase().replace('-', '/');
  // Try exact match first, then slashless
  const pair = FOREX_MAP.get(symbol.toUpperCase()) || FOREX_MAP.get(clean) || FOREX_MAP.get(clean.replace('/', ''));
  if (pair) {
    return {
      pipSize: pair.pipSize,
      decimals: pair.decimals,
      isForex: true,
      tradingViewSymbol: pair.tradingViewSymbol,
    };
  }
  // Default for crypto
  return {
    pipSize: 0.01,
    decimals: 2,
    isForex: false,
    tradingViewSymbol: '',
  };
}
