import type Database from 'better-sqlite3';

export function initializeDatabaseSchema(db: InstanceType<typeof Database>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      exchange TEXT NOT NULL DEFAULT 'kucoin',
      timeframe TEXT NOT NULL DEFAULT '1h',
      price REAL NOT NULL,
      signal TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      json_output TEXT,
      markdown_report TEXT NOT NULL,
      pine_script TEXT,
      round_trip_cost_pct REAL DEFAULT 0.30,
      status TEXT NOT NULL DEFAULT 'PENDING',
      entry_fill_price REAL,
      current_price REAL,
      pnl_percentage REAL,
      gross_pnl_percentage REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_symbol ON analyses(symbol);
    CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);

    CREATE TABLE IF NOT EXISTS watchlist (
      symbol TEXT NOT NULL,
      exchange TEXT NOT NULL DEFAULT 'kucoin',
      pinned INTEGER NOT NULL DEFAULT 0,
      favorite INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0,
      added_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (symbol, exchange)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      analysis_id TEXT,
      symbol TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chats_analysis_id ON chat_messages(analysis_id);

    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS paper_account (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      balance REAL NOT NULL DEFAULT 10000,
      equity REAL NOT NULL DEFAULT 10000,
      total_trades INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      balance_history TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS paper_positions (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      entry_price REAL NOT NULL,
      amount REAL NOT NULL,
      leverage INTEGER NOT NULL DEFAULT 1,
      stop_loss REAL,
      take_profit REAL,
      pnl REAL NOT NULL DEFAULT 0,
      pnl_pct REAL NOT NULL DEFAULT 0,
      opened_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'OPEN'
    );

    CREATE TABLE IF NOT EXISTS whale_transactions (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      amount REAL NOT NULL,
      value_usd REAL NOT NULL,
      from_address TEXT,
      to_address TEXT,
      from_label TEXT,
      to_label TEXT,
      direction TEXT NOT NULL,
      severity TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
