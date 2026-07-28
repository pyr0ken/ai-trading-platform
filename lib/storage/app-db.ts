/**
 * Browser Storage Engine for Local Persistence (IndexedDB + LocalStorage Wrapper)
 * Persists session state, watchlists, analysis history, chat history, Pine Scripts, and settings.
 */

export interface SessionState {
  selectedSymbol: string;
  selectedExchange: string;
  selectedTimeframe: string;
  sidebarOpen: boolean;
  activeWorkspace: string;
  theme: 'dark' | 'light';
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
  json_output: any;
  markdown_report: string;
  pine_script?: string;
  created_at: string;
  accuracy_evaluation?: {
    current_price?: number;
    pnl_percentage?: number;
    status: 'PENDING' | 'WIN' | 'LOSS' | 'INVALIDATED';
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
};

const DEFAULT_SESSION: SessionState = {
  selectedSymbol: 'BTC/USDT',
  selectedExchange: 'kucoin',
  selectedTimeframe: '1h',
  sidebarOpen: true,
  activeWorkspace: 'default',
  theme: 'dark',
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
  // --- Session Restoration ---
  public static getSession(): SessionState {
    if (typeof window === 'undefined') return DEFAULT_SESSION;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION);
      return data ? { ...DEFAULT_SESSION, ...JSON.parse(data) } : DEFAULT_SESSION;
    } catch {
      return DEFAULT_SESSION;
    }
  }

  public static saveSession(session: Partial<SessionState>): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getSession();
      const updated = { ...current, ...session, lastUpdated: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage saveSession error:', e);
    }
  }

  // --- Watchlist Manager ---
  public static getWatchlist(): WatchlistItem[] {
    if (typeof window === 'undefined') return DEFAULT_WATCHLIST;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      return data ? JSON.parse(data) : DEFAULT_WATCHLIST;
    } catch {
      return DEFAULT_WATCHLIST;
    }
  }

  public static saveWatchlist(list: WatchlistItem[]): void {
    if (typeof window === 'undefined') return;
    try {
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
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ANALYSES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static saveAnalysis(record: StoredAnalysisRecord): void {
    if (typeof window === 'undefined') return;
    try {
      const list = this.getAnalyses();
      const updated = [record, ...list.filter((a) => a.id !== record.id)].slice(0, 100);
      localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage saveAnalysis error:', e);
    }
  }

  public static clearAnalyses(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.ANALYSES);
    } catch (e) {
      console.warn('LocalStorage clearAnalyses error:', e);
    }
  }

  // --- Chat Messages Persistence ---
  public static getChats(symbol?: string): StoredChatMessage[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHATS);
      const chats: StoredChatMessage[] = data ? JSON.parse(data) : [];
      if (symbol) {
        return chats.filter((c) => c.symbol.toUpperCase() === symbol.toUpperCase());
      }
      return chats;
    } catch {
      return [];
    }
  }

  public static saveChat(msg: StoredChatMessage): void {
    if (typeof window === 'undefined') return;
    try {
      const chats = this.getChats();
      const updated = [...chats, msg].slice(-200);
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
        localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CHATS);
      }
    } catch {}
  }
}
