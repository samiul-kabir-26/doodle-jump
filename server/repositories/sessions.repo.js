import { getDatabase } from '../db/connection.js';

export const sessionsRepo = {
  findById(id, db = null) {
    const database = db || getDatabase();
    return database.prepare('SELECT * FROM game_sessions WHERE id = ?').get(id) || null;
  },

  create(session, db = null) {
    const database = db || getDatabase();
    database
      .prepare(
        `INSERT INTO game_sessions (
          id, player_id, seed, theme_version, status, started_at, ended_at,
          score, max_height, duration_ms, end_reason, reject_reason, stats,
          client_info, client_event_count, end_response
        ) VALUES (
          @id, @player_id, @seed, @theme_version, @status, @started_at, @ended_at,
          @score, @max_height, @duration_ms, @end_reason, @reject_reason, @stats,
          @client_info, @client_event_count, @end_response
        )`
      )
      .run(session);
    return session;
  },

  update(id, fields, db = null) {
    const database = db || getDatabase();
    const keys = Object.keys(fields);
    if (keys.length === 0) return this.findById(id, database);

    const setClauses = keys.map((k) => `${k} = @${k}`).join(', ');
    database
      .prepare(`UPDATE game_sessions SET ${setClauses} WHERE id = @id`)
      .run({ ...fields, id });
    return this.findById(id, database);
  },

  findOpenByPlayerId(playerId, db = null) {
    const database = db || getDatabase();
    return (
      database
        .prepare('SELECT * FROM game_sessions WHERE player_id = ? AND status = ?')
        .all(playerId, 'open')
    );
  },

  findRecentByPlayerId(playerId, limit = 10, db = null) {
    const database = db || getDatabase();
    return database
      .prepare('SELECT * FROM game_sessions WHERE player_id = ? ORDER BY started_at DESC LIMIT ?')
      .all(playerId, limit);
  },

  closeAbandonedSessions(cutoffTime, db = null) {
    const database = db || getDatabase();
    return database
      .prepare(
        `UPDATE game_sessions
         SET status = 'abandoned', end_reason = 'abandoned', ended_at = ?
         WHERE status = 'open' AND started_at < ?`
      )
      .run(Date.now(), cutoffTime);
  },

  getOpenSessionsOlderThan(cutoffTime, db = null) {
    const database = db || getDatabase();
    return database
      .prepare('SELECT * FROM game_sessions WHERE status = ? AND started_at < ?')
      .all('open', cutoffTime);
  },

  getDashboardStats(sinceTime, db = null) {
    const database = db || getDatabase();
    const row = database
      .prepare(
        `SELECT
          COUNT(*) as runs,
          COUNT(DISTINCT player_id) as uniquePlayers,
          COALESCE(AVG(CASE WHEN status = 'completed' THEN score END), 0) as avgScore,
          COALESCE(MAX(CASE WHEN status = 'completed' THEN score END), 0) as maxScore,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejectedRuns
         FROM game_sessions
         WHERE started_at >= ?`
      )
      .get(sinceTime);
    return {
      runs: row.runs,
      uniquePlayers: row.uniquePlayers,
      avgScore: Math.round(row.avgScore),
      maxScore: row.maxScore,
      rejectedRuns: row.rejectedRuns
    };
  }
};
