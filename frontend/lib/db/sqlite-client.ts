import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initializeDatabaseSchema } from './schema';

let dbInstance: InstanceType<typeof Database> | null = null;

export function getDatabase(): InstanceType<typeof Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'trading.db');
  dbInstance = new Database(dbPath);

  // Enable WAL mode for better concurrency and fast reads
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  initializeDatabaseSchema(dbInstance);

  return dbInstance;
}
