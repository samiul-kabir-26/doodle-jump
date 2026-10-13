import { getDatabase } from '../db/connection.js';

export const playersRepo = {
  findById(id, db = null) {
    const database = db || getDatabase();
    return database.prepare('SELECT * FROM players WHERE id = ?').get(id) || null;
  },

  findByExternalUserId(externalUserId, db = null) {
    const database = db || getDatabase();
    return (
      database
        .prepare('SELECT * FROM players WHERE external_user_id = ?')
        .get(externalUserId) || null
    );
  },

  findByDeviceId(deviceId, db = null) {
    const database = db || getDatabase();
    return database.prepare('SELECT * FROM players WHERE device_id = ?').get(deviceId) || null;
  },

  create(player, db = null) {
    const database = db || getDatabase();
    database
      .prepare(
        `INSERT INTO players (id, mode, external_user_id, device_id, display_name, banned_at, ban_reason, created_at, last_seen_at)
         VALUES (@id, @mode, @external_user_id, @device_id, @display_name, @banned_at, @ban_reason, @created_at, @last_seen_at)`
      )
      .run(player);
    return player;
  },

  update(id, fields, db = null) {
    const database = db || getDatabase();
    const keys = Object.keys(fields);
    if (keys.length === 0) return this.findById(id, database);

    const setClauses = keys.map((k) => `${k} = @${k}`).join(', ');
    database
      .prepare(`UPDATE players SET ${setClauses} WHERE id = @id`)
      .run({ ...fields, id });
    return this.findById(id, database);
  },

  findMany({ q, banned, limit = 50, offset = 0 } = {}, db = null) {
    const database = db || getDatabase();
    let sql = 'SELECT * FROM players WHERE 1=1';
    const params = {};

    if (q) {
      sql += ' AND (display_name LIKE @q OR external_user_id LIKE @q OR id = @rawQ)';
      params.q = `%${q}%`;
      params.rawQ = q;
    }
    if (banned === true) {
      sql += ' AND banned_at IS NOT NULL';
    } else if (banned === false) {
      sql += ' AND banned_at IS NULL';
    }

    sql += ' ORDER BY created_at DESC LIMIT @limit OFFSET @offset';
    params.limit = limit;
    params.offset = offset;

    return database.prepare(sql).all(params);
  },

  count({ q, banned } = {}, db = null) {
    const database = db || getDatabase();
    let sql = 'SELECT COUNT(*) as count FROM players WHERE 1=1';
    const params = {};

    if (q) {
      sql += ' AND (display_name LIKE @q OR external_user_id LIKE @q OR id = @rawQ)';
      params.q = `%${q}%`;
      params.rawQ = q;
    }
    if (banned === true) {
      sql += ' AND banned_at IS NOT NULL';
    } else if (banned === false) {
      sql += ' AND banned_at IS NULL';
    }

    return database.prepare(sql).get(params).count;
  }
};
