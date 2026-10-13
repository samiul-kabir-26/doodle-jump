import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

let defaultDb = null;

export function createDatabase(dbPath = null) {
  const targetPath = dbPath || env.absoluteDbPath;
  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(targetPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  return db;
}

export function getDatabase() {
  if (!defaultDb) {
    defaultDb = createDatabase();
  }
  return defaultDb;
}

export function closeDatabase() {
  if (defaultDb) {
    defaultDb.close();
    defaultDb = null;
  }
}
