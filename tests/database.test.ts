import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeDatabaseSchema } from '../lib/db/schema';

describe('SQLite Server Database Schema & Queries', () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeDatabaseSchema(db);
  });

  it('should create database tables successfully', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);

    expect(names).toContain('analyses');
    expect(names).toContain('watchlist');
    expect(names).toContain('chat_messages');
    expect(names).toContain('user_settings');
  });

  it('should insert and retrieve analysis records', () => {
    const stmt = db.prepare(`
      INSERT INTO analyses (id, symbol, exchange, timeframe, price, signal, confidence, risk_level, markdown_report)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run('test-123', 'BTC/USDT', 'kucoin', '1h', 65000, 'BUY', 85, 'MEDIUM', 'Test markdown report');

    const record = db.prepare('SELECT * FROM analyses WHERE id = ?').get('test-123') as any;

    expect(record).toBeDefined();
    expect(record.symbol).toBe('BTC/USDT');
    expect(record.price).toBe(65000);
    expect(record.signal).toBe('BUY');
  });

  it('should update analysis status and accuracy metrics', () => {
    db.prepare(`
      INSERT INTO analyses (id, symbol, price, signal, confidence, risk_level, markdown_report)
      VALUES ('test-456', 'ETH/USDT', 3200, 'SELL', 75, 'LOW', 'Report')
    `).run();

    db.prepare(`
      UPDATE analyses SET status = 'WIN', pnl_percentage = 4.2, current_price = 3065 WHERE id = 'test-456'
    `).run();

    const record = db.prepare('SELECT * FROM analyses WHERE id = ?').get('test-456') as any;

    expect(record.status).toBe('WIN');
    expect(record.pnl_percentage).toBe(4.2);
    expect(record.current_price).toBe(3065);
  });

  it('should store and query watchlist items with ordering', () => {
    const insert = db.prepare(`
      INSERT INTO watchlist (symbol, exchange, pinned, favorite, order_index)
      VALUES (?, ?, ?, ?, ?)
    `);

    insert.run('BTC/USDT', 'kucoin', 1, 1, 0);
    insert.run('SOL/USDT', 'kucoin', 0, 1, 1);

    const items = db.prepare('SELECT * FROM watchlist ORDER BY order_index ASC').all() as any[];

    expect(items.length).toBe(2);
    expect(items[0].symbol).toBe('BTC/USDT');
    expect(items[1].symbol).toBe('SOL/USDT');
  });
});
