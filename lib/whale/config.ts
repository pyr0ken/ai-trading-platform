import type { SeverityLevel } from './types';

/* ───────────────────────────────────────────────
   Thresholds — tweak these to tune sensitivity
   ─────────────────────────────────────────────── */

/** Minimum transaction value in USD before we consider it a "whale" */
export const WHALE_MIN_USD = process.env.WHALE_MIN_USD
  ? parseInt(process.env.WHALE_MIN_USD, 10)
  : 500_000;

/** Thresholds for severity levels */
export const SEVERITY_THRESHOLDS: { level: SeverityLevel; minUsd: number }[] = [
  { level: 'low', minUsd: 500_000 },
  { level: 'medium', minUsd: 2_000_000 },
  { level: 'high', minUsd: 10_000_000 },
  { level: 'critical', minUsd: 100_000_000 },
];

/** Tokens we track and their approx USD conversion at fetch time */
export const TRACKED_TOKENS = [
  { symbol: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
  { symbol: 'BNB', decimals: 18, coingeckoId: 'binancecoin' },
  { symbol: 'USDT', decimals: 18, coingeckoId: 'tether' },
  { symbol: 'USDC', decimals: 18, coingeckoId: 'usd-coin' },
  { symbol: 'WBTC', decimals: 18, coingeckoId: 'wrapped-bitcoin' },
] as const;

/** How often the frontend polls (ms) */
export const POLL_INTERVAL = 10_000; // 10s

/** Max blocks to scan backwards on each poll */
export const MAX_BLOCKS_BACK = 3;

/** Max whale transactions to keep in localStorage history */
export const MAX_HISTORY = 200;

/** localStorage key */
export const STORAGE_KEY = 'hermes_whale_history';

/** API endpoints (with or without api key) */
export const API_SOURCES = {
  ethereum: {
    scanUrl: 'https://api.etherscan.io/api',
    rpcUrl: 'https://cloudflare-eth.com',
  },
  bsc: {
    scanUrl: 'https://api.bscscan.com/api',
    rpcUrl: 'https://binance.llamarpc.com',
  },
} as const;
