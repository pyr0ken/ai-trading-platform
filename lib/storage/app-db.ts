import { StructuredLLMOutput } from '@/types/terminal';
import { PaperPosition, PaperAccount } from '@/types/paper-trading';
import { DashboardLayoutConfig, DEFAULT_LAYOUT_CONFIG } from '@/types/layout';

/**
 * Server SQLite Database Wrapper (Zero LocalStorage dependency).
 * All persistence is performed via SQLite API routes (/api/db/*) with in-memory caching.
 */

export interface SessionState {
  selectedSymbol: string;
  selectedExchange: string;
  selectedTimeframe: string;
  analysisMode: 'scalp' | 'swing';
  includeNews: boolean;
  includeSocial: boolean;
  sidebarOpen: boolean;
  activeWorkspace: string;
  theme: 'dark' | 'light';
  llmUrl: string;
  llmModel: string;
  lastUpdated: string;
}

export interface WatchlistItem {
  symbol: string;
  exchange: string;
  pinned: boolean;
  favorite: boolean;
  addedAt: string;
  order: number;
}

export interface StoredAnalysisRecord {
  id: string;
  symbol: string;
  exchange: string;
  timeframe: string;
  price: number;
  signal: string;
  confidence: number;
  risk_level: string;
  json_output: StructuredLLMOutput | null;
  markdown_report: string;
  pine_script?: string;
  created_at: string;
  round_trip_cost_pct?: number;
  accuracy_evaluation?: {
    current_price?: number;
    pnl_percentage?: number;
    status: 'PENDING' | 'WIN' | 'LOSS' | 'INVALIDATED' | 'NOT_FILLED';
    entry_fill_price?: number;
    gross_pnl_percentage?: number;
  };
}

export interface StoredChatMessage {
  id: string;
  analysis_id?: string;
  symbol: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const DEFAULT_SESSION: SessionState = {
  selectedSymbol: 'BTC/USDT',
  selectedExchange: 'kucoin',
  selectedTimeframe: '1h',
  analysisMode: 'swing',
  includeNews: true,
  includeSocial: false,
  sidebarOpen: true,
  activeWorkspace: 'default',
  theme: 'dark',
  llmUrl: 'http://127.0.0.1:20128/v1',
  llmModel: 'hermes',
  lastUpdated: new Date().toISOString(),
};

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: 'BTC/USDT', exchange: 'kucoin', pinned: true, favorite: true, addedAt: new Date().toISOString(), order: 0 },
  { symbol: 'ETH/USDT', exchange: 'kucoin', pinned: true, favorite: true, addedAt: new Date().toISOString(), order: 1 },
  { symbol: 'SOL/USDT', exchange: 'kucoin', pinned: true, favorite: true, addedAt: new Date().toISOString(), order: 2 },
  { symbol: 'DOT/USDT', exchange: 'kucoin', pinned: false, favorite: true, addedAt: new Date().toISOString(), order: 3 },
  { symbol: 'BNB/USDT', exchange: 'kucoin', pinned: false, favorite: false, addedAt: new Date().toISOString(), order: 4 },
  { symbol: 'RE/USDT', exchange: 'kucoin', pinned: true, favorite: true, addedAt: new Date().toISOString(), order: 5 },
  { symbol: 'AVAX/USDT', exchange: 'kucoin', pinned: false, favorite: false, addedAt: new Date().toISOString(), order: 6 },
];

export class AppStorageEngine {
  private static cachedSession: SessionState | null = null;
  private static cachedWatchlist: WatchlistItem[] | null = null;
  private static cachedAnalyses: StoredAnalysisRecord[] | null = null;
  private static cachedChats: StoredChatMessage[] | null = null;
  private static cachedPaperAccount: PaperAccount | null = null;
  private static cachedPaperPositions: PaperPosition[] | null = null;
  private static cachedLayout: DashboardLayoutConfig | null = null;

  // --- Layout Configuration ---
  public static getLayoutConfig(): DashboardLayoutConfig {
    if (this.cachedLayout) return this.cachedLayout;
    return DEFAULT_LAYOUT_CONFIG;
  }

  public static saveLayoutConfig(config: DashboardLayoutConfig): void {
    this.cachedLayout = config;
    fetch('/api/db/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layoutConfig: config }),
    }).catch(() => {});
  }

  // --- Session Restoration ---
  public static getSession(): SessionState {
    if (this.cachedSession) return this.cachedSession;
    return DEFAULT_SESSION;
  }

  public static saveSession(session: Partial<SessionState>): void {
    const current = this.getSession();
    const updated = { ...current, ...session, lastUpdated: new Date().toISOString() };
    this.cachedSession = updated;
    fetch('/api/db/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: updated }),
    }).catch(() => {});
  }

  // --- Watchlist Manager ---
  public static getWatchlist(): WatchlistItem[] {
    if (this.cachedWatchlist) return this.cachedWatchlist;
    return DEFAULT_WATCHLIST;
  }

  public static saveWatchlist(list: WatchlistItem[]): void {
    this.cachedWatchlist = list;
    fetch('/api/db/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchlist: list }),
    }).catch(() => {});
  }

  public static addCoinToWatchlist(symbol: string, exchange = 'kucoin'): WatchlistItem[] {
    const list = this.getWatchlist();
    if (list.some((item) => item.symbol.toUpperCase() === symbol.toUpperCase())) {
      return list;
    }
    const newItem: WatchlistItem = {
      symbol: symbol.toUpperCase(),
      exchange,
      pinned: false,
      favorite: true,
      addedAt: new Date().toISOString(),
      order: list.length,
    };
    const updated = [newItem, ...list];
    this.saveWatchlist(updated);
    return updated;
  }

  public static removeCoinFromWatchlist(symbol: string): WatchlistItem[] {
    const list = this.getWatchlist();
    const updated = list.filter((item) => item.symbol.toUpperCase() !== symbol.toUpperCase());
    this.saveWatchlist(updated);
    return updated;
  }

  public static toggleFavorite(symbol: string): WatchlistItem[] {
    const list = this.getWatchlist();
    const updated = list.map((item) =>
      item.symbol.toUpperCase() === symbol.toUpperCase() ? { ...item, favorite: !item.favorite } : item
    );
    this.saveWatchlist(updated);
    return updated;
  }

  public static togglePin(symbol: string): WatchlistItem[] {
    const list = this.getWatchlist();
    const updated = list.map((item) =>
      item.symbol.toUpperCase() === symbol.toUpperCase() ? { ...item, pinned: !item.pinned } : item
    );
    this.saveWatchlist(updated);
    return updated;
  }

  // --- Analyses History & Replay ---
  public static getAnalyses(): StoredAnalysisRecord[] {
    return this.cachedAnalyses || [];
  }

  public static saveAnalyses(list: StoredAnalysisRecord[]): void {
    this.cachedAnalyses = list.slice(0, 100);
  }

  public static saveAnalysis(record: StoredAnalysisRecord): void {
    if (!record.accuracy_evaluation) {
      record.accuracy_evaluation = {
        status: 'PENDING',
        current_price: record.price,
        pnl_percentage: 0,
      };
    }
    const list = this.getAnalyses();
    const updated = [record, ...list.filter((a) => a.id !== record.id)].slice(0, 100);
    this.cachedAnalyses = updated;
    fetch('/api/db/analyses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(() => {});
  }

  public static updateAnalysisRecordStatus(
    id: string,
    status: 'WIN' | 'LOSS' | 'INVALIDATED' | 'NOT_FILLED',
    currentPrice: number,
    pnl: number,
    extra?: { entryFillPrice?: number; grossPnl?: number }
  ): void {
    const list = this.getAnalyses();
    const index = list.findIndex((rec) => rec.id === id);
    if (index !== -1) {
      const evaluation = {
        status,
        current_price: currentPrice,
        pnl_percentage: pnl,
        ...(extra?.entryFillPrice !== undefined ? { entry_fill_price: extra.entryFillPrice } : {}),
        ...(extra?.grossPnl !== undefined ? { gross_pnl_percentage: extra.grossPnl } : {}),
      };
      list[index].accuracy_evaluation = evaluation;
      this.cachedAnalyses = [...list];
      fetch('/api/db/analyses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, accuracy_evaluation: evaluation }),
      }).catch(() => {});
    }
  }

  public static deleteAnalysis(id: string): void {
    const list = this.getAnalyses();
    this.cachedAnalyses = list.filter((a) => a.id !== id);
    fetch(`/api/db/analyses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
  }

  public static clearAnalyses(): void {
    this.cachedAnalyses = [];
    fetch('/api/db/analyses', { method: 'DELETE' }).catch(() => {});
  }

  // --- Chat Messages Persistence ---
  public static getChats(symbol?: string): StoredChatMessage[] {
    const chats = this.cachedChats || [];
    if (symbol) {
      return chats.filter((c) => c.symbol.toUpperCase() === symbol.toUpperCase());
    }
    return chats;
  }

  public static saveChat(msg: StoredChatMessage): void {
    const chats = this.getChats();
    const updated = [...chats, msg].slice(-200);
    this.cachedChats = updated;
    fetch('/api/db/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    }).catch(() => {});
  }

  public static clearChats(symbol?: string): void {
    if (symbol) {
      const chats = this.getChats().filter((c) => c.symbol.toUpperCase() !== symbol.toUpperCase());
      this.cachedChats = chats;
    } else {
      this.cachedChats = [];
    }
  }

  // --- Paper Trading Storage ---
  public static getPaperAccount(): PaperAccount {
    const defaultAccount: PaperAccount = {
      balance: 10000,
      equity: 10000,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      balanceHistory: [{ timestamp: new Date().toISOString(), balance: 10000 }],
    };
    return this.cachedPaperAccount || defaultAccount;
  }

  public static savePaperAccount(account: PaperAccount): void {
    this.cachedPaperAccount = account;
    fetch('/api/db/paper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account }),
    }).catch(() => {});
  }

  public static getPaperPositions(): PaperPosition[] {
    return this.cachedPaperPositions || [];
  }

  public static savePaperPositions(list: PaperPosition[]): void {
    this.cachedPaperPositions = list;
    fetch('/api/db/paper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions: list }),
    }).catch(() => {});
  }

  public static openPaperPosition(
    pos: Omit<PaperPosition, 'id' | 'pnl' | 'pnlPct' | 'status' | 'openedAt' | 'currentPrice'>
  ): void {
    const list = this.getPaperPositions();
    const newPosition: PaperPosition = {
      ...pos,
      id: 'paper_' + Date.now(),
      currentPrice: pos.entryPrice,
      openedAt: new Date().toISOString(),
      pnl: 0,
      pnlPct: 0,
      status: 'OPEN',
    };

    const updatedList = [newPosition, ...list];
    this.savePaperPositions(updatedList);

    const account = this.getPaperAccount();
    account.equity = account.balance;
    this.savePaperAccount(account);
  }

  public static closePaperPosition(id: string, exitPrice: number): void {
    const list = this.getPaperPositions();
    const index = list.findIndex((p) => p.id === id);
    if (index !== -1 && list[index].status === 'OPEN') {
      const pos = list[index];
      pos.status = 'CLOSED';
      pos.closedAt = new Date().toISOString();
      pos.currentPrice = exitPrice;

      const isLong = pos.side === 'LONG';
      const priceDiff = isLong ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
      const pnlPct = (priceDiff / pos.entryPrice) * pos.leverage;
      const pnl = pos.margin * pnlPct;

      pos.pnl = Number(pnl.toFixed(2));
      pos.pnlPct = Number((pnlPct * 100).toFixed(2));

      const account = this.getPaperAccount();
      account.balance = Number((account.balance + pnl).toFixed(2));
      account.equity = account.balance;
      account.totalTrades += 1;
      if (pnl > 0) {
        account.wins += 1;
      } else {
        account.losses += 1;
      }
      account.balanceHistory.push({
        timestamp: new Date().toISOString(),
        balance: account.balance,
      });
      if (account.balanceHistory.length > 500) {
        account.balanceHistory = account.balanceHistory.slice(-500);
      }

      this.savePaperAccount(account);
      this.savePaperPositions(list);
    }
  }

  public static resetPaperTrading(): void {
    this.cachedPaperPositions = [];
    this.cachedPaperAccount = null;
    fetch('/api/db/paper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: {
          balance: 10000,
          equity: 10000,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          balanceHistory: [{ timestamp: new Date().toISOString(), balance: 10000 }],
        },
        positions: [],
      }),
    }).catch(() => {});
  }

  // --- SQLite Backup Export / Import ---
  public static exportFullBackup(): string {
    const payload = {
      app: 'Steep Market Intelligence',
      version: '3.0 (SQLite Powered)',
      exportedAt: new Date().toISOString(),
      data: {
        analyses: this.cachedAnalyses || [],
        watchlist: this.cachedWatchlist || [],
        session: this.cachedSession || DEFAULT_SESSION,
        paperAccount: this.cachedPaperAccount,
        paperPositions: this.cachedPaperPositions || [],
      },
    };
    return JSON.stringify(payload, null, 2);
  }

  public static importFullBackup(jsonStr: string): { success: boolean; importedCount: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      const dataObj = parsed?.data || parsed;

      fetch('/api/db/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataObj),
      }).catch(() => {});

      this.cachedSession = null;
      this.cachedWatchlist = null;
      this.cachedAnalyses = null;
      this.cachedChats = null;
      this.cachedPaperAccount = null;
      this.cachedPaperPositions = null;
      this.cachedLayout = null;

      return { success: true, importedCount: 1 };
    } catch (err) {
      return {
        success: false,
        importedCount: 0,
        error: err instanceof Error ? err.message : 'Invalid JSON backup',
      };
    }
  }
}
