import { getDatabase } from '../db/connection.js';

export const settingsRepo = {
  get(key, db = null) {
    const database = db || getDatabase();
    const row = database.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!row) return null;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  },

  getAll(db = null) {
    const database = db || getDatabase();
    const rows = database.prepare('SELECT key, value, updated_at FROM settings').all();
    const result = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = row.value;
      }
    }
    return result;
  },

  set(key, value, db = null) {
    const database = db || getDatabase();
    const strVal = typeof value === 'string' ? value : JSON.stringify(value);
    const now = Date.now();
    database
      .prepare(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(key, strVal, now);
    return value;
  }
};
