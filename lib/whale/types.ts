export interface WhaleTransaction {
  id: string;          // unique id: `${chain}_${hash}_${logIndex || '0'}`
  hash: string;        // transaction hash
  chain: 'ethereum' | 'bsc';
  token: string;       // 'ETH', 'BTC', 'USDT', 'USDC', 'WBTC', 'BNB'
  value: string;       // raw readable amount (e.g. "1234.56")
  valueUsd: number;    // estimated USD value
  from: string;        // sender address (checksummed)
  to: string;          // receiver address (checksummed)
  fromLabel: string;   // known exchange name or shortened address
  toLabel: string;     // known exchange name or shortened address
  timestamp: number;   // unix seconds
  direction: 'exchange_outflow' | 'exchange_inflow' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface WhaleAlertState {
  transactions: WhaleTransaction[];
  liveFeed: WhaleTransaction[];   // last 50 from current session
  lastFetched: number | null;
  isLoading: boolean;
  error: string | null;
  totalTodayUsd: number;
  countToday: number;
}

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
