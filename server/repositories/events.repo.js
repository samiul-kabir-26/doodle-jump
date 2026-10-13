import { getDatabase } from '../db/connection.js';

export const eventsRepo = {
  insert(event, db = null) {
    const database = db || getDatabase();
    const info = database
      .prepare(
        `INSERT INTO events (
          id, type, version, category, trust, occurred_at, received_at,
          player_id, external_user_id, session_id, client_event_id, data
        ) VALUES (
          @id, @type, @version, @category, @trust, @occurred_at, @received_at,
          @player_id, @external_user_id, @session_id, @client_event_id, @data
        )`
      )
      .run(event);

    return {
      ...event,
      seq: Number(info.lastInsertRowid)
    };
  },

  insertBatch(events, db = null) {
    const database = db || getDatabase();
    const insertStmt = database.prepare(
      `INSERT INTO events (
        id, type, version, category, trust, occurred_at, received_at,
        player_id, external_user_id, session_id, client_event_id, data
      ) VALUES (
        @id, @type, @version, @category, @trust, @occurred_at, @received_at,
        @player_id, @external_user_id, @session_id, @client_event_id, @data
      )`
    );

    const inserted = [];
    const tx = database.transaction((items) => {
      for (const item of items) {
        try {
          const info = insertStmt.run(item);
          inserted.push({
            ...item,
            seq: Number(info.lastInsertRowid)
          });
        } catch (err) {
          // If unique constraint violation on (session_id, client_event_id), skip as duplicate
          if (err.message && err.message.includes('UNIQUE constraint failed')) {
            continue;
          }
          throw err;
        }
      }
    });

    tx(events);
    return inserted;
  },

  query({
    after = 0,
    limit = 100,
    types = null,
    category = null,
    trust = null,
    externalUserId = null,
    playerId = null,
    sessionId = null,
    since = null,
    from = null,
    to = null,
    q = null,
    order = 'asc',
    excludeAdmin = false
  } = {}, db = null) {
    const database = db || getDatabase();
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params = {};

    if (after !== null && after !== undefined && after > 0) {
      sql += ' AND seq > @after';
      params.after = after;
    }

    if (types && types.length > 0) {
      const typeClauses = types.map((t, idx) => {
        if (t.endsWith('.*')) {
          const prefix = t.slice(0, -2);
          params[`type_prefix_${idx}`] = `${prefix}.%`;
          return `type LIKE @type_prefix_${idx}`;
        }
        params[`type_${idx}`] = t;
        return `type = @type_${idx}`;
      });
      sql += ` AND (${typeClauses.join(' OR ')})`;
    }

    if (category) {
      sql += ' AND category = @category';
      params.category = category;
    } else if (excludeAdmin) {
      sql += " AND category != 'admin'";
    }

    if (trust) {
      sql += ' AND trust = @trust';
      params.trust = trust;
    }

    if (externalUserId) {
      sql += ' AND external_user_id = @externalUserId';
      params.externalUserId = externalUserId;
    }

    if (playerId) {
      sql += ' AND player_id = @playerId';
      params.playerId = playerId;
    }

    if (sessionId) {
      sql += ' AND session_id = @sessionId';
      params.sessionId = sessionId;
    }

    if (since) {
      sql += ' AND occurred_at >= @since';
      params.since = since;
    }

    if (from) {
      sql += ' AND occurred_at >= @from';
      params.from = from;
    }

    if (to) {
      sql += ' AND occurred_at <= @to';
      params.to = to;
    }

    if (q) {
      sql += ' AND data LIKE @q';
      params.q = `%${q}%`;
    }

    const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    sql += ` ORDER BY seq ${sortOrder} LIMIT @limit`;
    params.limit = limit;

    return database.prepare(sql).all(params);
  },

  findById(id, db = null) {
    const database = db || getDatabase();
    return database.prepare('SELECT * FROM events WHERE id = ?').get(id) || null;
  },

  findBySeq(seq, db = null) {
    const database = db || getDatabase();
    return database.prepare('SELECT * FROM events WHERE seq = ?').get(seq) || null;
  },

  findBySessionId(sessionId, db = null) {
    const database = db || getDatabase();
    return database
      .prepare('SELECT * FROM events WHERE session_id = ? ORDER BY seq ASC')
      .all(sessionId);
  },

  getStats(sinceTime, db = null) {
    const database = db || getDatabase();
    return database
      .prepare(
        'SELECT type, COUNT(*) as count FROM events WHERE occurred_at >= ? GROUP BY type ORDER BY count DESC'
      )
      .all(sinceTime);
  },

  getEventsPerMinute(sinceTime, db = null) {
    const database = db || getDatabase();
    // Bucket by 60,000 ms (1 minute)
    return database
      .prepare(
        `SELECT (occurred_at / 60000) * 60000 as bucket, COUNT(*) as count
         FROM events
         WHERE occurred_at >= ?
         GROUP BY bucket
         ORDER BY bucket ASC`
      )
      .all(sinceTime);
  },

  purgeOlderThan(cutoffTime, limit = 10000, db = null) {
    const database = db || getDatabase();
    return database
      .prepare(
        `DELETE FROM events
         WHERE seq IN (
           SELECT seq FROM events WHERE received_at < ? LIMIT ?
         )`
      )
      .run(cutoffTime, limit);
  }
};
