import { getDatabase } from '../db/connection.js';

export const assetsRepo = {
  create(asset, db = null) {
    const database = db || getDatabase();
    database
      .prepare(
        `INSERT INTO assets (id, sha256, file_name, original_name, mime, kind, bytes, width, height, created_at)
         VALUES (@id, @sha256, @file_name, @original_name, @mime, @kind, @bytes, @width, @height, @created_at)`
      )
      .run(asset);
    return asset;
  },

  findBySha256(sha256, db = null) {
    const database = db || getDatabase();
    return database.prepare('SELECT * FROM assets WHERE sha256 = ?').get(sha256) || null;
  },

  findById(id, db = null) {
    const database = db || getDatabase();
    return database.prepare('SELECT * FROM assets WHERE id = ?').get(id) || null;
  },

  findAll(kind = null, db = null) {
    const database = db || getDatabase();
    if (kind) {
      return database
        .prepare('SELECT * FROM assets WHERE kind = ? ORDER BY created_at DESC')
        .all(kind);
    }
    return database.prepare('SELECT * FROM assets ORDER BY created_at DESC').all();
  },

  deleteById(id, db = null) {
    const database = db || getDatabase();
    return database.prepare('DELETE FROM assets WHERE id = ?').run(id);
  },

  getAllReferencedUrls(db = null) {
    const database = db || getDatabase();
    const urls = new Set();

    function extractUrls(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const val of Object.values(obj)) {
        if (typeof val === 'string' && val.startsWith('/uploads/')) {
          urls.add(val);
        } else if (typeof val === 'object') {
          extractUrls(val);
        }
      }
    }

    // Check draft
    const draft = database.prepare('SELECT theme FROM theme_draft WHERE id = 1').get();
    if (draft) {
      try {
        extractUrls(JSON.parse(draft.theme));
      } catch {}
    }

    // Check published
    const versions = database.prepare('SELECT theme FROM theme_versions').all();
    for (const v of versions) {
      try {
        extractUrls(JSON.parse(v.theme));
      } catch {}
    }

    return Array.from(urls);
  }
};
