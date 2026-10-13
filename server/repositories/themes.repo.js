import { getDatabase } from '../db/connection.js';

export const themesRepo = {
  getLatestPublished(db = null) {
    const database = db || getDatabase();
    return (
      database
        .prepare('SELECT * FROM theme_versions ORDER BY version DESC LIMIT 1')
        .get() || null
    );
  },

  getVersion(version, db = null) {
    const database = db || getDatabase();
    return database.prepare('SELECT * FROM theme_versions WHERE version = ?').get(version) || null;
  },

  listVersions(db = null) {
    const database = db || getDatabase();
    return database
      .prepare('SELECT version, note, published_at FROM theme_versions ORDER BY version DESC')
      .all();
  },

  createVersion(version, theme, note = null, publishedAt = Date.now(), db = null) {
    const database = db || getDatabase();
    database
      .prepare(
        'INSERT INTO theme_versions (version, theme, note, published_at) VALUES (?, ?, ?, ?)'
      )
      .run(version, theme, note, publishedAt);
    return { version, theme, note, published_at: publishedAt };
  },

  getDraft(db = null) {
    const database = db || getDatabase();
    return database.prepare('SELECT * FROM theme_draft WHERE id = 1').get() || null;
  },

  saveDraft(theme, baseVersion = 0, db = null) {
    const database = db || getDatabase();
    const now = Date.now();
    database
      .prepare(
        `INSERT INTO theme_draft (id, theme, updated_at, base_version)
         VALUES (1, @theme, @updated_at, @base_version)
         ON CONFLICT(id) DO UPDATE SET theme = @theme, updated_at = @updated_at, base_version = @base_version`
      )
      .run({ theme, updated_at: now, base_version: baseVersion });
    return { id: 1, theme, updated_at: now, base_version: baseVersion };
  }
};
