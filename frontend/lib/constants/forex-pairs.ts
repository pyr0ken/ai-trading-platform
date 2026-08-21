export interface ForexPairMeta {
  symbol: string; // Normalized e.g. "EURUSD"
  name: string;   // Display name e.g. "EUR/USD"
  category: 'Majors' | 'Minors' | 'Exotics' | 'Commodities' | 'Indices';
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

  // ── Minors / Crosses ────────────────────────────────
  { symbol: 'EUR/GBP', name: 'Euro / British Pound',     category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:EURGBP' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen',      category: 'Minors', pipSize: 0.01,   decimals: 3, tradingViewSymbol: 'OANDA:EURJPY' },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', category: 'Minors', pipSize: 0.01, decimals: 3, tradingViewSymbol: 'OANDA:GBPJPY' },
  { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc',       category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:EURCHF' },
  { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:EURAUD' },
  { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar',   category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:EURCAD' },
  { symbol: 'EUR/NZD', name: 'Euro / New Zealand Dollar', category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:EURNZD' },
  { symbol: 'GBP/AUD', name: 'British Pound / Australian Dollar', category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:GBPAUD' },
  { symbol: 'GBP/CAD', name: 'British Pound / Canadian Dollar', category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:GBPCAD' },
  { symbol: 'GBP/CHF', name: 'British Pound / Swiss Franc', category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:GBPCHF' },
  { symbol: 'GBP/NZD', name: 'British Pound / New Zealand Dollar', category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:GBPNZD' },
  { symbol: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen', category: 'Minors', pipSize: 0.01, decimals: 3, tradingViewSymbol: 'OANDA:AUDJPY' },
  { symbol: 'AUD/CAD', name: 'Australian Dollar / Canadian Dollar', category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:AUDCAD' },
  { symbol: 'AUD/CHF', name: 'Australian Dollar / Swiss Franc', category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:AUDCHF' },
  { symbol: 'AUD/NZD', name: 'Australian Dollar / New Zealand Dollar', category: 'Minors', pipSize: 0.0001, decimals: 5, tradingViewSymbol: 'OANDA:AUDNZD' },
  { symbol: 'NZD/JPY', name: 'New Zealand Dollar / Japanese Yen', category: 'Minors', pipSize: 0.01, decimals: 3, tradingViewSymbol: 'OANDA:NZDJPY' },
  { symbol: 'CAD/JPY', name: 'Canadian Dollar / Japanese Yen', category: 'Minors', pipSize: 0.01, decimals: 3, tradingViewSymbol: 'OANDA:CADJPY' },
  { symbol: 'CHF/JPY', name: 'Swiss Franc / Japanese Yen', category: 'Minors', pipSize: 0.01, decimals: 3, tradingViewSymbol: 'OANDA:CHFJPY' },

  // ── Exotics & Emerging Markets ──────────────────────
  { symbol: 'USD/AED', name: 'US Dollar / UAE Dirham',   category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'FX_IDC:USDAED' },
  { symbol: 'USD/SAR', name: 'US Dollar / Saudi Riyal',  category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'FX_IDC:USDSAR' },
  { symbol: 'USD/QAR', name: 'US Dollar / Qatari Riyal', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'FX_IDC:USDQAR' },
  { symbol: 'USD/KWD', name: 'US Dollar / Kuwaiti Dinar', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'FX_IDC:USDKWD' },
  { symbol: 'USD/BHD', name: 'US Dollar / Bahraini Dinar', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'FX_IDC:USDBHD' },
  { symbol: 'USD/OMR', name: 'US Dollar / Omani Rial',   category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'FX_IDC:USDOMR' },
  { symbol: 'USD/JOD', name: 'US Dollar / Jordanian Dinar', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'FX_IDC:USDJOD' },
  { symbol: 'USD/ILS', name: 'US Dollar / Israeli Shekel', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'OANDA:USDILS' },
  { symbol: 'USD/TRY', name: 'US Dollar / Turkish Lira', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'OANDA:USDTRY' },
  { symbol: 'USD/MXN', name: 'US Dollar / Mexican Peso', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'OANDA:USDMXN' },
  { symbol: 'USD/ZAR', name: 'US Dollar / South African Rand', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'OANDA:USDZAR' },
  { symbol: 'USD/BRL', name: 'US Dollar / Brazilian Real', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'FX_IDC:USDBRL' },
  { symbol: 'USD/SEK', name: 'US Dollar / Swedish Krona', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'OANDA:USDSEK' },
  { symbol: 'USD/NOK', name: 'US Dollar / Norwegian Krone', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'OANDA:USDNOK' },
  { symbol: 'USD/SGD', name: 'US Dollar / Singapore Dollar', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'OANDA:USDSGD' },
  { symbol: 'USD/HKD', name: 'US Dollar / Hong Kong Dollar', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'OANDA:USDHKD' },
  { symbol: 'USD/PLN', name: 'US Dollar / Polish Zloty', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'OANDA:USDPLN' },
  { symbol: 'USD/CZK', name: 'US Dollar / Czech Koruna', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'OANDA:USDCZK' },
  { symbol: 'USD/HUF', name: 'US Dollar / Hungarian Forint', category: 'Exotics', pipSize: 0.01, decimals: 2, tradingViewSymbol: 'OANDA:USDHUF' },
  { symbol: 'USD/DKK', name: 'US Dollar / Danish Krone', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'OANDA:USDDKK' },
  { symbol: 'USD/CNH', name: 'US Dollar / Chinese Yuan (Offshore)', category: 'Exotics', pipSize: 0.0001, decimals: 4, tradingViewSymbol: 'OANDA:USDCNH' },
  { symbol: 'USD/INR', name: 'US Dollar / Indian Rupee', category: 'Exotics', pipSize: 0.001, decimals: 3, tradingViewSymbol: 'FX_IDC:USDINR' },
  { symbol: 'USD/KRW', name: 'US Dollar / South Korean Won', category: 'Exotics', pipSize: 0.1, decimals: 1, tradingViewSymbol: 'FX_IDC:USDKRW' },
  { symbol: 'USD/TWD', name: 'US Dollar / Taiwan Dollar', category: 'Exotics', pipSize: 0.001, decimals: 3, tradingViewSymbol: 'FX_IDC:USDTWD' },
  { symbol: 'USD/THB', name: 'US Dollar / Thai Baht', category: 'Exotics', pipSize: 0.001, decimals: 3, tradingViewSymbol: 'OANDA:USDTHB' },
  { symbol: 'USD/EGP', name: 'US Dollar / Egyptian Pound', category: 'Exotics', pipSize: 0.001, decimals: 3, tradingViewSymbol: 'FX_IDC:USDEGP' },
  { symbol: 'USD/NGN', name: 'US Dollar / Nigerian Naira', category: 'Exotics', pipSize: 0.01, decimals: 2, tradingViewSymbol: 'FX_IDC:USDNGN' },

  // ── Commodities & Tokenized Gold ───────────────────
  { symbol: 'XAU/USD', name: 'Gold / US Dollar',         category: 'Commodities', pipSize: 0.01,  decimals: 2, tradingViewSymbol: 'OANDA:XAUUSD' },
  { symbol: 'XAUT/USD', name: 'Tether Gold / US Dollar', category: 'Commodities', pipSize: 0.01,  decimals: 2, tradingViewSymbol: 'BITFINEX:XAUTUSD' },
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
