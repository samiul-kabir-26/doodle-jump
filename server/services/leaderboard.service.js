import { scoresRepo } from '../repositories/scores.repo.js';
import { getDayKey, getWeekKey } from '../utils/dateKeys.js';
import { getDatabase } from '../db/connection.js';

const cache = new Map();
const TTL_MS = 5000;

function getPeriodStart(period, now = new Date()) {
  const d = new Date(now.getTime());
  if (period === 'daily') {
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (period === 'weekly') {
    const dayOfWeek = (d.getUTCDay() + 6) % 7; // Monday = 0
    d.setUTCDate(d.getUTCDate() - dayOfWeek);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }
  return null;
}

export const leaderboardService = {
  invalidateCache() {
    cache.clear();
  },

  getLeaderboard({ period = 'all', limit = 50, offset = 0, includeHidden = false } = {}, db = null) {
    const now = new Date();
    const dayKey = getDayKey(now);
    const weekKey = getWeekKey(now);

    const cacheKey = `${period}:${limit}:${offset}:${includeHidden}:${dayKey}:${weekKey}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TTL_MS) {
      return cached.data;
    }

    const database = db || getDatabase();
    const result = scoresRepo.getLeaderboard(
      { period, dayKey, weekKey, limit, offset, includeHidden },
      database
    );

    const formattedEntries = result.entries.map((r) => ({
      rank: r.rank,
      playerId: r.player_id,
      displayName: r.display_name,
      score: r.score,
      achievedAt: new Date(r.achieved_at).toISOString(),
      sessionId: r.session_id,
      hiddenAt: r.hidden_at ? new Date(r.hidden_at).toISOString() : null,
      hiddenReason: r.hidden_reason,
      banned: Boolean(r.banned_at)
    }));

    const response = {
      period,
      periodStart: getPeriodStart(period, now),
      entries: formattedEntries,
      total: result.total
    };

    cache.set(cacheKey, { data: response, timestamp: Date.now() });
    return response;
  },

  getMeLeaderboard(playerId, { period = 'all' } = {}, db = null) {
    const database = db || getDatabase();
    const now = new Date();
    const dayKey = getDayKey(now);
    const weekKey = getWeekKey(now);

    const bestScore = scoresRepo.getPlayerBestScore(playerId, { period, dayKey, weekKey }, database);
    if (!bestScore) {
      return {
        rank: null,
        score: null,
        around: []
      };
    }

    const rank = scoresRepo.getPlayerRank(playerId, { period, dayKey, weekKey }, database);
    const aroundRows = scoresRepo.getRankAroundPlayer(
      playerId,
      { period, dayKey, weekKey, range: 2 },
      database
    );

    const around = aroundRows.map((r) => ({
      rank: r.rank,
      playerId: r.player_id,
      displayName: r.display_name,
      score: r.score,
      achievedAt: new Date(r.achieved_at).toISOString(),
      isMe: r.player_id === playerId
    }));

    return {
      rank,
      score: bestScore.score,
      around
    };
  }
};
