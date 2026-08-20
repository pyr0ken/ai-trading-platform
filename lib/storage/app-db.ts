import { StructuredLLMOutput } from '@/types/terminal';
import { PaperPosition, PaperAccount } from '@/types/paper-trading';
import { DashboardLayoutConfig, DEFAULT_LAYOUT_CONFIG } from '@/types/layout';

/**
 * Server SQLite Database Wrapper with LocalStorage Caching (Hybrid Storage Engine).
 * Fast synchronous reads via LocalStorage & in-memory cache for 0ms UI render.
 * Durable persistence via SQLite API routes (/api/db/*).
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

const STORAGE_KEYS = {
  SESSION: 'steep_quant_session_v2',
  WATCHLIST: 'steep_quant_watchlist_v2',
  ANALYSES: 'steep_quant_analyses_v2',
  CHATS: 'steep_quant_chats_v2',
  SETTINGS: 'steep_quant_settings_v2',
  LAYOUT: 'steep_quant_layout_v1',
  PAPER_POSITIONS: 'steep_quant_paper_positions_v2',
  PAPER_ACCOUNT: 'steep_quant_paper_account_v2',
};

export class AppStorageEngine {
  private static cachedSession: SessionState | null = null;
  private static cachedWatchlist: WatchlistItem[] | null = null;
  private static cachedAnalyses: StoredAnalysisRecord[] | null = null;
  private static cachedChats: StoredChatMessage[] | null = null;
  private static cachedPaperAccount: PaperAccount | null = null;
  private static cachedPaperPositions: PaperPosition[] | null = null;
  private static cachedLayout: DashboardLayoutConfig | null = null;

  private static notifyStorageChange(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('app-storage-updated'));
    }
  }

  // --- Layout Configuration (Instant LocalStorage + SQLite Backup) ---
  public static getLayoutConfig(): DashboardLayoutConfig {
    if (typeof window === 'undefined') return DEFAULT_LAYOUT_CONFIG;
    if (this.cachedLayout) return this.cachedLayout;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAYOUT);
      this.cachedLayout = data ? { ...DEFAULT_LAYOUT_CONFIG, ...JSON.parse(data) } : DEFAULT_LAYOUT_CONFIG;
    } catch {
      this.cachedLayout = DEFAULT_LAYOUT_CONFIG;
    }
    return this.cachedLayout || DEFAULT_LAYOUT_CONFIG;
  }

  public static saveLayoutConfig(config: DashboardLayoutConfig): void {
    if (typeof window === 'undefined') return;
    try {
      this.cachedLayout = config;
      localStorage.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify(config));
      fetch('/api/db/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutConfig: config }),
      }).catch(() => {});
      this.notifyStorageChange();
    } catch (e) {
      console.warn('saveLayoutConfig error:', e);
    }
  }

  // --- Session & UI Panel Toggles (Instant LocalStorage + SQLite Backup) ---
  public static getSession(): SessionState {
    if (typeof window === 'undefined') return DEFAULT_SESSION;
    if (this.cachedSession) return this.cachedSession;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION);
      this.cachedSession = data ? { ...DEFAULT_SESSION, ...JSON.parse(data) } : DEFAULT_SESSION;
    } catch {
      this.cachedSession = DEFAULT_SESSION;
    }
    return this.cachedSession || DEFAULT_SESSION;
  }

  public static saveSession(session: Partial<SessionState>): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getSession();
      const updated = { ...current, ...session, lastUpdated: new Date().toISOString() };
      this.cachedSession = updated;
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(updated));
      fetch('/api/db/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: updated }),
      }).catch(() => {});
      this.notifyStorageChange();
    } catch (e) {
      console.warn('saveSession error:', e);
    }
  }

  // --- Watchlist Manager ---
  public static getWatchlist(): WatchlistItem[] {
    if (this.cachedWatchlist) return this.cachedWatchlist;
    if (typeof window !== 'undefined') {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
        if (data) {
          this.cachedWatchlist = JSON.parse(data);
          return this.cachedWatchlist || DEFAULT_WATCHLIST;
        }
      } catch {}
    }
    return DEFAULT_WATCHLIST;
  }

  public static saveWatchlist(list: WatchlistItem[]): void {
    this.cachedWatchlist = list;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
      } catch (e) {
        console.warn('saveWatchlist error:', e);
      }
    }
    this.notifyStorageChange();
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
    if (this.cachedAnalyses) return this.cachedAnalyses;
    if (typeof window !== 'undefined') {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.ANALYSES);
        if (data) {
          this.cachedAnalyses = JSON.parse(data);
          return this.cachedAnalyses || [];
        }
      } catch {}
    }
    return [];
  }

  public static saveAnalyses(list: StoredAnalysisRecord[]): void {
    const capped = list.slice(0, 100);
    this.cachedAnalyses = capped;
    if (typeof window !== 'undefined') {
      try {
        // Prepare lightweight payload for LocalStorage to avoid 5MB quota limits.
        // Keep full markdown/pine_script only for the 5 most recent records in LocalStorage;
        // older records store metadata only (SQLite retains full fields).
        const lightweightList = capped.map((rec, idx) => {
          if (idx < 5) return rec;
          const { markdown_report, pine_script, ...rest } = rec;
          return {
            ...rest,
            markdown_report: markdown_report ? markdown_report.slice(0, 200) + '...' : '',
          };
        });

        localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(lightweightList));
      } catch (e) {
        console.warn('saveAnalyses LocalStorage quota warning, falling back to top 20 metadata:', e);
        try {
          const minimalList = capped.slice(0, 20).map(({ markdown_report, pine_script, ...rest }) => rest);
          localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(minimalList));
        } catch {
          // If still over quota, ignore LocalStorage error — SQLite persistence remains active
        }
      }
    }
    this.notifyStorageChange();
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
    this.saveAnalyses(updated);
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
      this.saveAnalyses([...list]);
      fetch('/api/db/analyses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, accuracy_evaluation: evaluation }),
      }).catch(() => {});
    }
  }

  public static deleteAnalysis(id: string): void {
    const list = this.getAnalyses();
    const updated = list.filter((a) => a.id !== id);
    this.saveAnalyses(updated);
    fetch(`/api/db/analyses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
  }

  public static clearAnalyses(): void {
    this.cachedAnalyses = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEYS.ANALYSES);
      } catch {}
    }
    this.notifyStorageChange();
    fetch('/api/db/analyses', { method: 'DELETE' }).catch(() => {});
  }

  // --- Chat Messages Persistence ---
  public static getChats(symbol?: string): StoredChatMessage[] {
    if (!this.cachedChats && typeof window !== 'undefined') {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.CHATS);
        if (data) {
          this.cachedChats = JSON.parse(data);
        }
      } catch {}
    }
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
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(updated));
      } catch (e) {
        console.warn('saveChat error:', e);
      }
    }
    this.notifyStorageChange();
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
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(this.cachedChats));
      } catch {}
    }
    this.notifyStorageChange();
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
    if (this.cachedPaperAccount) return this.cachedPaperAccount;
    if (typeof window !== 'undefined') {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.PAPER_ACCOUNT);
        if (data) {
          const accountObj: PaperAccount = { ...defaultAccount, ...JSON.parse(data) };
          this.cachedPaperAccount = accountObj;
          return accountObj;
        }
      } catch {}
    }
    return defaultAccount;
  }

  public static savePaperAccount(account: PaperAccount): void {
    this.cachedPaperAccount = account;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.PAPER_ACCOUNT, JSON.stringify(account));
      } catch (e) {
        console.warn('savePaperAccount error:', e);
      }
    }
    this.notifyStorageChange();
    fetch('/api/db/paper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account }),
    }).catch(() => {});
  }

  public static getPaperPositions(): PaperPosition[] {
    if (this.cachedPaperPositions) return this.cachedPaperPositions;
    if (typeof window !== 'undefined') {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.PAPER_POSITIONS);
        if (data) {
          this.cachedPaperPositions = JSON.parse(data);
          return this.cachedPaperPositions || [];
        }
      } catch {}
    }
    return [];
  }

  public static savePaperPositions(list: PaperPosition[]): void {
    this.cachedPaperPositions = list;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.PAPER_POSITIONS, JSON.stringify(list));
      } catch (e) {
        console.warn('savePaperPositions error:', e);
      }
    }
    this.notifyStorageChange();
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
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEYS.PAPER_POSITIONS);
        localStorage.removeItem(STORAGE_KEYS.PAPER_ACCOUNT);
      } catch {}
    }
    this.notifyStorageChange();
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

  // --- SQLite Async Sync Operations ---
  public static async fetchAnalysesFromDb(): Promise<StoredAnalysisRecord[]> {
    try {
      const res = await fetch('/api/db/analyses');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.records)) {
          this.saveAnalyses(json.records);
          return json.records;
        }
      }
    } catch (e) {
      console.warn('fetchAnalysesFromDb error:', e);
    }
    return this.getAnalyses();
  }

  public static async fetchWatchlistFromDb(): Promise<WatchlistItem[]> {
    try {
      const res = await fetch('/api/db/watchlist');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.watchlist) && json.watchlist.length > 0) {
          this.saveWatchlist(json.watchlist);
          return json.watchlist;
        }
      }
    } catch (e) {
      console.warn('fetchWatchlistFromDb error:', e);
    }
    return this.getWatchlist();
  }

  public static async fetchChatsFromDb(symbol?: string): Promise<StoredChatMessage[]> {
    try {
      const url = symbol ? `/api/db/chats?symbol=${encodeURIComponent(symbol)}` : '/api/db/chats';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.chats)) {
          const chats = json.chats as StoredChatMessage[];
          this.cachedChats = chats;
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
            } catch {}
          }
          this.notifyStorageChange();
          return this.getChats(symbol);
        }
      }
    } catch (e) {
      console.warn('fetchChatsFromDb error:', e);
    }
    return this.getChats(symbol);
  }

  public static async fetchPaperFromDb(): Promise<{ account: PaperAccount; positions: PaperPosition[] }> {
    try {
      const res = await fetch('/api/db/paper');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (json.account) this.savePaperAccount(json.account);
          if (Array.isArray(json.positions)) this.savePaperPositions(json.positions);
        }
      }
    } catch (e) {
      console.warn('fetchPaperFromDb error:', e);
    }
    return { account: this.getPaperAccount(), positions: this.getPaperPositions() };
  }

  public static async initializeFromDatabase(): Promise<void> {
    await Promise.allSettled([
      this.fetchAnalysesFromDb(),
      this.fetchWatchlistFromDb(),
      this.fetchChatsFromDb(),
      this.fetchPaperFromDb(),
    ]);
  }

  // --- Backup Export / Import ---
  public static exportFullBackup(): string {
    const payload = {
      app: 'Steep Market Intelligence',
      version: '3.0 (SQLite Powered)',
      exportedAt: new Date().toISOString(),
      data: {
        analyses: this.getAnalyses(),
        watchlist: this.getWatchlist(),
        session: this.getSession(),
        paperAccount: this.getPaperAccount(),
        paperPositions: this.getPaperPositions(),
        chats: this.getChats(),
        layout: this.getLayoutConfig(),
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

      if (Array.isArray(dataObj.analyses)) this.saveAnalyses(dataObj.analyses);
      if (Array.isArray(dataObj.watchlist)) this.saveWatchlist(dataObj.watchlist);
      if (dataObj.session) this.saveSession(dataObj.session);
      if (dataObj.paperAccount) this.savePaperAccount(dataObj.paperAccount);
      if (Array.isArray(dataObj.paperPositions)) this.savePaperPositions(dataObj.paperPositions);
      if (dataObj.layout) this.saveLayoutConfig(dataObj.layout);

      this.notifyStorageChange();

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
