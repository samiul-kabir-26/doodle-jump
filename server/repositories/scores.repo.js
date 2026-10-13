import { getDatabase } from '../db/connection.js';

export const scoresRepo = {
  create(score, db = null) {
    const database = db || getDatabase();
    database
      .prepare(
        `INSERT INTO scores (id, player_id, session_id, score, achieved_at, day_key, week_key, hidden_at, hidden_reason)
         VALUES (@id, @player_id, @session_id, @score, @achieved_at, @day_key, @week_key, @hidden_at, @hidden_reason)`
      )
      .run(score);
    return score;
  },

  findById(id, db = null) {
    const database = db || getDatabase();
    return database.prepare('SELECT * FROM scores WHERE id = ?').get(id) || null;
  },

  findBySessionId(sessionId, db = null) {
    const database = db || getDatabase();
    return database.prepare('SELECT * FROM scores WHERE session_id = ?').get(sessionId) || null;
  },

  getLeaderboard({ period = 'all', dayKey = null, weekKey = null, limit = 50, offset = 0, includeHidden = false } = {}, db = null) {
    const database = db || getDatabase();
    let periodWhere = '';
    const params = {
      includeHidden: includeHidden ? 1 : 0,
      limit,
      offset
    };

    if (period === 'daily' && dayKey) {
      periodWhere = 'AND s.day_key = @periodKey';
      params.periodKey = dayKey;
    } else if (period === 'weekly' && weekKey) {
      periodWhere = 'AND s.week_key = @periodKey';
      params.periodKey = weekKey;
    }

    const hiddenFilter = includeHidden
      ? ''
      : 'AND s.hidden_at IS NULL AND p.banned_at IS NULL';

    const sql = `
      WITH best AS (
        SELECT s.id, s.player_id, s.score, s.achieved_at, s.session_id, s.hidden_at, s.hidden_reason,
               p.display_name, p.banned_at,
               ROW_NUMBER() OVER (PARTITION BY s.player_id ORDER BY s.score DESC, s.achieved_at ASC) AS rn
        FROM scores s
        JOIN players p ON p.id = s.player_id
        WHERE 1=1 ${hiddenFilter} ${periodWhere}
      ),
      ranked AS (
        SELECT id, player_id, score, achieved_at, session_id, display_name, hidden_at, hidden_reason, banned_at,
               RANK() OVER (ORDER BY score DESC, achieved_at ASC) AS rank
        FROM best
        WHERE rn = 1
      )
      SELECT * FROM ranked
      ORDER BY rank ASC, achieved_at ASC
      LIMIT @limit OFFSET @offset
    `;

    const countSql = `
      SELECT COUNT(DISTINCT s.player_id) AS total
      FROM scores s
      JOIN players p ON p.id = s.player_id
      WHERE 1=1 ${hiddenFilter} ${periodWhere}
    `;

    const entries = database.prepare(sql).all(params);
    const countRow = database.prepare(countSql).get(params);
    return {
      entries,
      total: countRow ? countRow.total : 0
    };
  },

  getPlayerBestScore(playerId, { period = 'all', dayKey = null, weekKey = null } = {}, db = null) {
    const database = db || getDatabase();
    let sql = 'SELECT * FROM scores WHERE player_id = ? AND hidden_at IS NULL';
    const params = [playerId];

    if (period === 'daily' && dayKey) {
      sql += ' AND day_key = ?';
      params.push(dayKey);
    } else if (period === 'weekly' && weekKey) {
      sql += ' AND week_key = ?';
      params.push(weekKey);
    }

    sql += ' ORDER BY score DESC, achieved_at ASC LIMIT 1';
    return database.prepare(sql).get(...params) || null;
  },

  getPlayerRank(playerId, { period = 'all', dayKey = null, weekKey = null } = {}, db = null) {
    const database = db || getDatabase();
    const best = this.getPlayerBestScore(playerId, { period, dayKey, weekKey }, database);
    if (!best) return null;

    let periodWhere = '';
    const params = {
      score: best.score,
      achievedAt: best.achieved_at
    };

    if (period === 'daily' && dayKey) {
      periodWhere = 'AND s.day_key = @periodKey';
      params.periodKey = dayKey;
    } else if (period === 'weekly' && weekKey) {
      periodWhere = 'AND s.week_key = @periodKey';
      params.periodKey = weekKey;
    }

    const sql = `
      WITH player_bests AS (
        SELECT s.player_id, MAX(s.score) as best_score, MIN(s.achieved_at) as first_achieved
        FROM scores s
        JOIN players p ON p.id = s.player_id
        WHERE s.hidden_at IS NULL AND p.banned_at IS NULL ${periodWhere}
        GROUP BY s.player_id
      )
      SELECT COUNT(*) + 1 as rank
      FROM player_bests
      WHERE best_score > @score OR (best_score = @score AND first_achieved < @achievedAt)
    `;

    const row = database.prepare(sql).get(params);
    return row ? row.rank : 1;
  },

  getRankAroundPlayer(playerId, { period = 'all', dayKey = null, weekKey = null, range = 2 } = {}, db = null) {
    const database = db || getDatabase();
    const rank = this.getPlayerRank(playerId, { period, dayKey, weekKey }, database);
    if (!rank) return [];

    const offset = Math.max(0, rank - 1 - range);
    const limit = range * 2 + 1;
    const { entries } = this.getLeaderboard(
      { period, dayKey, weekKey, limit, offset, includeHidden: false },
      database
    );
    return entries;
  },

  hide(id, reason = null, db = null) {
    const database = db || getDatabase();
    database
      .prepare('UPDATE scores SET hidden_at = ?, hidden_reason = ? WHERE id = ?')
      .run(Date.now(), reason, id);
    return this.findById(id, database);
  },

  restore(id, db = null) {
    const database = db || getDatabase();
    database
      .prepare('UPDATE scores SET hidden_at = NULL, hidden_reason = NULL WHERE id = ?')
      .run(id);
    return this.findById(id, database);
  }
};
