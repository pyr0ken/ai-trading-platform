import { StructuredLLMOutput } from '@/types/terminal';
import { PaperPosition, PaperAccount } from '@/types/paper-trading';
import { DashboardLayoutConfig, DEFAULT_LAYOUT_CONFIG } from '@/types/layout';

/**
 * Browser Storage Engine for Local Persistence (IndexedDB + LocalStorage Wrapper)
 * Persists session state, watchlists, analysis history, chat history, Pine Scripts, and settings.
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
  /** LLM inference engine base URL (OpenAI-compatible, e.g. 9router/OmniRoute). */
  llmUrl: string;
  /** Model id selected in Terminal Settings, sent with every analysis/chat call. */
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
  /**
   * Round-trip execution cost in percent, captured from the LIVE cost model at
   * the moment the signal was generated (venue taker fee + real orderbook
   * spread + slippage, both sides).
   *
   * The auto-resolver used to charge a hardcoded 0.30% to every historical
   * trade. Real spread varies with liquidity — trading-costs.ts measures it per
   * signal and it ranges roughly 0.26%-0.35% — so a signal taken in a thin book
   * was scored with a cost lower than it actually paid, flattering its PnL.
   * Persisting the figure lets resolution charge what the trade really cost.
   *
   * Optional: records written before this field existed fall back to the
   * conservative default in use-auto-resolver.ts.
   */
  round_trip_cost_pct?: number;
  accuracy_evaluation?: {
    current_price?: number;
    pnl_percentage?: number;
    /**
     * NOT_FILLED is distinct from INVALIDATED and from LOSS.
     *
     * A limit setup whose entry price was never reached is not a losing trade —
     * no position existed. Recording it as LOSS poisons the feedback the model
     * receives and understates the strategy's real win rate. Keeping it separate
     * means win-rate statistics are computed only over trades that actually
     * happened.
     */
    status: 'PENDING' | 'WIN' | 'LOSS' | 'INVALIDATED' | 'NOT_FILLED';
    /**
     * The price the position actually opened at. PnL must be measured from this,
     * not from the spot price at analysis time, or every limit-entry signal is
     * mis-scored.
     */
    entry_fill_price?: number;
    /** Gross PnL before execution costs, for transparency in the UI. */
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

const STORAGE_KEYS = {
  SESSION: 'steep_quant_session_v2',
  WATCHLIST: 'steep_quant_watchlist_v2',
  ANALYSES: 'steep_quant_analyses_v2',
  CHATS: 'steep_quant_chats_v2',
  SETTINGS: 'steep_quant_settings_v2',
  PINE_SCRIPTS: 'steep_quant_pinescripts_v2',
  PAPER_POSITIONS: 'steep_quant_paper_positions_v2',
  PAPER_ACCOUNT: 'steep_quant_paper_account_v2',
  LAYOUT: 'steep_quant_layout_v1',
};

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

  // --- Layout Configuration Persistence ---
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
    } catch (e) {
      console.warn('LocalStorage saveLayoutConfig error:', e);
    }
  }

  // --- Session Restoration ---
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
    } catch (e) {
      console.warn('LocalStorage saveSession error:', e);
    }
  }

  // --- Watchlist Manager ---
  public static getWatchlist(): WatchlistItem[] {
    if (typeof window === 'undefined') return DEFAULT_WATCHLIST;
    if (this.cachedWatchlist) return this.cachedWatchlist;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      this.cachedWatchlist = data ? JSON.parse(data) : DEFAULT_WATCHLIST;
    } catch {
      this.cachedWatchlist = DEFAULT_WATCHLIST;
    }
    return this.cachedWatchlist || DEFAULT_WATCHLIST;
  }

  public static saveWatchlist(list: WatchlistItem[]): void {
    if (typeof window === 'undefined') return;
    try {
      this.cachedWatchlist = list;
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage saveWatchlist error:', e);
    }
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
    if (typeof window === 'undefined') return [];
    if (this.cachedAnalyses) return this.cachedAnalyses;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ANALYSES);
      const parsed: StoredAnalysisRecord[] = data ? JSON.parse(data) : [];
      this.cachedAnalyses = parsed.map((rec) => ({
        ...rec,
        accuracy_evaluation: rec.accuracy_evaluation || {
          status: 'PENDING',
          current_price: rec.price,
          pnl_percentage: 0,
        },
      }));
    } catch {
      this.cachedAnalyses = [];
    }
    return this.cachedAnalyses || [];
  }

  public static saveAnalyses(list: StoredAnalysisRecord[]): void {
    if (typeof window === 'undefined') return;
    try {
      const capped = list.map((rec) => ({
        ...rec,
        accuracy_evaluation: rec.accuracy_evaluation || {
          status: 'PENDING',
          current_price: rec.price,
          pnl_percentage: 0,
        },
      })).slice(0, 100);
      this.cachedAnalyses = capped;
      localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(capped));
    } catch (e) {
      console.warn('LocalStorage saveAnalyses error:', e);
    }
  }

  public static saveAnalysis(record: StoredAnalysisRecord): void {
    if (typeof window === 'undefined') return;
    try {
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
    } catch (e) {
      console.warn('LocalStorage saveAnalysis error:', e);
    }
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
      list[index].accuracy_evaluation = {
        status,
        current_price: currentPrice,
        pnl_percentage: pnl,
        ...(extra?.entryFillPrice !== undefined ? { entry_fill_price: extra.entryFillPrice } : {}),
        ...(extra?.grossPnl !== undefined ? { gross_pnl_percentage: extra.grossPnl } : {}),
      };
      this.saveAnalyses(list);
    }
  }

  public static deleteAnalysis(id: string): void {
    const list = this.getAnalyses();
    const updated = list.filter((a) => a.id !== id);
    this.saveAnalyses(updated);
  }

  public static clearAnalyses(): void {
    if (typeof window === 'undefined') return;
    try {
      this.cachedAnalyses = [];
      localStorage.removeItem(STORAGE_KEYS.ANALYSES);
    } catch (e) {
      console.warn('LocalStorage clearAnalyses error:', e);
    }
  }

  // --- Chat Messages Persistence ---
  public static getChats(symbol?: string): StoredChatMessage[] {
    if (typeof window === 'undefined') return [];
    if (!this.cachedChats) {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.CHATS);
        this.cachedChats = data ? JSON.parse(data) : [];
      } catch {
        this.cachedChats = [];
      }
    }
    const chats = this.cachedChats || [];
    if (symbol) {
      return chats.filter((c) => c.symbol.toUpperCase() === symbol.toUpperCase());
    }
    return chats;
  }

  public static saveChat(msg: StoredChatMessage): void {
    if (typeof window === 'undefined') return;
    try {
      const chats = this.getChats();
      const updated = [...chats, msg].slice(-200);
      this.cachedChats = updated;
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage saveChat error:', e);
    }
  }

  public static clearChats(symbol?: string): void {
    if (typeof window === 'undefined') return;
    try {
      if (symbol) {
        const chats = this.getChats().filter((c) => c.symbol.toUpperCase() !== symbol.toUpperCase());
        this.cachedChats = chats;
        localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
      } else {
        this.cachedChats = [];
        localStorage.removeItem(STORAGE_KEYS.CHATS);
      }
    } catch {}
  }

  // --- Paper Trading Storage & Operations ---
  
  public static getPaperAccount(): PaperAccount {
    const defaultAccount: PaperAccount = {
      balance: 10000,
      equity: 10000,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      balanceHistory: [{ timestamp: new Date().toISOString(), balance: 10000 }],
    };

    if (typeof window === 'undefined') return defaultAccount;
    if (this.cachedPaperAccount) return this.cachedPaperAccount;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAPER_ACCOUNT);
      this.cachedPaperAccount = data ? { ...defaultAccount, ...JSON.parse(data) } : defaultAccount;
    } catch {
      this.cachedPaperAccount = defaultAccount;
    }
    return this.cachedPaperAccount || defaultAccount;
  }

  public static savePaperAccount(account: PaperAccount): void {
    if (typeof window === 'undefined') return;
    try {
      this.cachedPaperAccount = account;
      localStorage.setItem(STORAGE_KEYS.PAPER_ACCOUNT, JSON.stringify(account));
    } catch (e) {
      console.warn('LocalStorage savePaperAccount error:', e);
    }
  }

  public static getPaperPositions(): PaperPosition[] {
    if (typeof window === 'undefined') return [];
    if (this.cachedPaperPositions) return this.cachedPaperPositions;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAPER_POSITIONS);
      this.cachedPaperPositions = data ? JSON.parse(data) : [];
    } catch {
      this.cachedPaperPositions = [];
    }
    return this.cachedPaperPositions || [];
  }

  public static savePaperPositions(list: PaperPosition[]): void {
    if (typeof window === 'undefined') return;
    try {
      this.cachedPaperPositions = list;
      localStorage.setItem(STORAGE_KEYS.PAPER_POSITIONS, JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage savePaperPositions error:', e);
    }
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

      // Calculate final PnL
      const isLong = pos.side === 'LONG';
      const priceDiff = isLong ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
      const pnlPct = (priceDiff / pos.entryPrice) * pos.leverage;
      const pnl = pos.margin * pnlPct;

      pos.pnl = Number(pnl.toFixed(2));
      pos.pnlPct = Number((pnlPct * 100).toFixed(2));

      // Update account metrics
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
      // Cap balance history to prevent unbounded localStorage growth
      if (account.balanceHistory.length > 500) {
        account.balanceHistory = account.balanceHistory.slice(-500);
      }

      this.savePaperAccount(account);
      this.savePaperPositions(list);
    }
  }

  public static resetPaperTrading(): void {
    if (typeof window === 'undefined') return;
    try {
      this.cachedPaperPositions = [];
      this.cachedPaperAccount = null;
      localStorage.removeItem(STORAGE_KEYS.PAPER_POSITIONS);
      localStorage.removeItem(STORAGE_KEYS.PAPER_ACCOUNT);
    } catch {}
  }

  // --- Full LocalStorage Backup Export / Import ---
  public static exportFullBackup(): string {
    if (typeof window === 'undefined') return '{}';
    const storageMap: Record<string, unknown> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('steep_quant_') || key.startsWith('hermes_'))) {
          const raw = localStorage.getItem(key);
          if (raw !== null) {
            try {
              storageMap[key] = JSON.parse(raw);
            } catch {
              storageMap[key] = raw;
            }
          }
        }
      }
    } catch (e) {
      console.warn('exportFullBackup error:', e);
    }

    const payload = {
      app: 'Steep Market Intelligence',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      storage: storageMap,
    };
    return JSON.stringify(payload, null, 2);
  }

  public static importFullBackup(jsonStr: string): { success: boolean; importedCount: number; error?: string } {
    if (typeof window === 'undefined') return { success: false, importedCount: 0, error: 'SSR environment' };
    try {
      const parsed = JSON.parse(jsonStr);
      const storageObj = parsed?.storage || (typeof parsed === 'object' ? parsed : null);

      if (!storageObj || typeof storageObj !== 'object') {
        return { success: false, importedCount: 0, error: 'Invalid backup file format' };
      }

      let count = 0;
      for (const [key, value] of Object.entries(storageObj)) {
        if (key && (key.startsWith('steep_quant_') || key.startsWith('hermes_'))) {
          const valStr = typeof value === 'string' ? value : JSON.stringify(value);
          localStorage.setItem(key, valStr);
          count++;
        }
      }

      // Clear in-memory caches
      this.cachedSession = null;
      this.cachedWatchlist = null;
      this.cachedAnalyses = null;
      this.cachedChats = null;
      this.cachedPaperAccount = null;
      this.cachedPaperPositions = null;
      this.cachedLayout = null;

      // Dispatch global sync events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('intel-toggles-changed'));
        window.dispatchEvent(new Event('storage'));
      }

      return { success: true, importedCount: count };
    } catch (err) {
      return {
        success: false,
        importedCount: 0,
        error: err instanceof Error ? err.message : 'Invalid JSON backup',
      };
    }
  }
}
