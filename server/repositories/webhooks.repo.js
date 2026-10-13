import { getDatabase } from '../db/connection.js';

export const webhooksRepo = {
  createDelivery(delivery, db = null) {
    const database = db || getDatabase();
    database
      .prepare(
        `INSERT INTO webhook_deliveries (
          id, event_seq, url, status, attempts, next_attempt_at,
          last_status_code, last_error, last_duration_ms, created_at, updated_at
        ) VALUES (
          @id, @event_seq, @url, @status, @attempts, @next_attempt_at,
          @last_status_code, @last_error, @last_duration_ms, @created_at, @updated_at
        )`
      )
      .run(delivery);
    return delivery;
  },

  getPendingDeliveries(now = Date.now(), limit = 20, db = null) {
    const database = db || getDatabase();
    return database
      .prepare(
        `SELECT d.*, e.id as event_id, e.type as event_type, e.version as event_version,
                e.category as event_category, e.trust as event_trust, e.occurred_at,
                e.received_at, e.player_id, e.external_user_id, e.session_id, e.data as event_data,
                p.display_name as player_display_name
         FROM webhook_deliveries d
         JOIN events e ON e.seq = d.event_seq
         LEFT JOIN players p ON p.id = e.player_id
         WHERE d.status = 'pending' AND d.next_attempt_at <= ?
         ORDER BY d.next_attempt_at ASC
         LIMIT ?`
      )
      .all(now, limit);
  },

  updateDelivery(id, fields, db = null) {
    const database = db || getDatabase();
    const fieldsWithUpdated = { ...fields, updated_at: Date.now() };
    const keys = Object.keys(fieldsWithUpdated);
    const setClauses = keys.map((k) => `${k} = @${k}`).join(', ');
    database
      .prepare(`UPDATE webhook_deliveries SET ${setClauses} WHERE id = @id`)
      .run({ ...fieldsWithUpdated, id });
    return this.findById(id, database);
  },

  findById(id, db = null) {
    const database = db || getDatabase();
    return (
      database
        .prepare('SELECT * FROM webhook_deliveries WHERE id = ?')
        .get(id) || null
    );
  },

  getDeliveries({ status = null, limit = 50, offset = 0 } = {}, db = null) {
    const database = db || getDatabase();
    let sql = `
      SELECT d.*, e.type as event_type, e.id as event_id
      FROM webhook_deliveries d
      JOIN events e ON e.seq = d.event_seq
    `;
    const params = {};

    if (status) {
      sql += ' WHERE d.status = @status';
      params.status = status;
    }

    sql += ' ORDER BY d.created_at DESC LIMIT @limit OFFSET @offset';
    params.limit = limit;
    params.offset = offset;

    return database.prepare(sql).all(params);
  },

  countDeliveries({ status = null } = {}, db = null) {
    const database = db || getDatabase();
    let sql = 'SELECT COUNT(*) as count FROM webhook_deliveries';
    const params = {};
    if (status) {
      sql += ' WHERE status = @status';
      params.status = status;
    }
    return database.prepare(sql).get(params).count;
  },

  getStats(db = null) {
    const database = db || getDatabase();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const pending = database
      .prepare("SELECT COUNT(*) as count FROM webhook_deliveries WHERE status = 'pending'")
      .get().count;
    const failed24h = database
      .prepare(
        "SELECT COUNT(*) as count FROM webhook_deliveries WHERE status = 'failed' AND updated_at >= ?"
      )
      .get(oneDayAgo).count;
    const lastSuccess = database
      .prepare(
        "SELECT updated_at FROM webhook_deliveries WHERE status = 'delivered' ORDER BY updated_at DESC LIMIT 1"
      )
      .get();

    return {
      pending,
      failedLast24h: failed24h,
      lastSuccessAt: lastSuccess ? new Date(lastSuccess.updated_at).toISOString() : null
    };
  }
};
