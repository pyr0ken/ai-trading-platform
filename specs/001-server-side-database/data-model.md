# Data Model: Server-Side Database Storage

## Schema Definitions

### 1. `analyses` Table
Stores all AI-generated market analyses and predictions.

```sql
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'kucoin',
  timeframe TEXT NOT NULL DEFAULT '1h',
  price REAL NOT NULL,
  signal TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  json_output TEXT, -- JSON string
  markdown_report TEXT NOT NULL,
  pine_script TEXT,
  round_trip_cost_pct REAL DEFAULT 0.30,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, WIN, LOSS, INVALIDATED, NOT_FILLED
  entry_fill_price REAL,
  current_price REAL,
  pnl_percentage REAL,
  gross_pnl_percentage REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analyses_symbol ON analyses(symbol);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
```

### 2. `watchlist` Table
Stores user pinned and favorite coins.

```sql
CREATE TABLE IF NOT EXISTS watchlist (
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'kucoin',
  pinned INTEGER NOT NULL DEFAULT 0,
  favorite INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (symbol, exchange)
);
```

### 3. `chat_messages` Table
Stores follow-up chat conversations linked to specific analysis sessions.

```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  analysis_id TEXT,
  symbol TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chats_analysis_id ON chat_messages(analysis_id);
```

### 4. `user_settings` Table
Stores key-value system and workspace preferences.

```sql
CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON or string value
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
