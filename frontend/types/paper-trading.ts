export interface PaperPosition {
  id: string;
  symbol: string;
  exchange: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  leverage: number;
  stopLoss: number;
  takeProfit: number;
  margin: number;
  openedAt: string;
  closedAt?: string;
  pnl: number;
  pnlPct: number;
  status: 'OPEN' | 'CLOSED';
}

export interface BalanceHistoryPoint {
  timestamp: string;
  balance: number;
}

export interface PaperAccount {
  balance: number;
  equity: number;
  totalTrades: number;
  wins: number;
  losses: number;
  balanceHistory: BalanceHistoryPoint[];
}
