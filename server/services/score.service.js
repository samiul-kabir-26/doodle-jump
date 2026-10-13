import { scoresRepo } from '../repositories/scores.repo.js';
import { settingsRepo } from '../repositories/settings.repo.js';
import { eventService } from './event.service.js';
import { scoreId } from '../utils/ids.js';
import { getDayKey, getWeekKey } from '../utils/dateKeys.js';
import { GAME_CONSTANTS } from '../../shared/constants.js';
import { getDatabase } from '../db/connection.js';

export const scoreService = {
  validateRun(session, player, { score, maxHeight, durationMs }) {
    if (player.banned_at) {
      return { valid: false, reason: 'PLAYER_BANNED' };
    }

    const antiCheat = settingsRepo.get('antiCheat') || {
      minDurationMs: GAME_CONSTANTS.ANTI_CHEAT.MIN_DURATION_MS,
      maxScoreRate: GAME_CONSTANTS.ANTI_CHEAT.DEFAULT_MAX_SCORE_RATE
    };

    if (durationMs < (antiCheat.minDurationMs || 3000)) {
      return { valid: false, reason: 'SESSION_TOO_SHORT' };
    }

    const now = Date.now();
    if (now - session.started_at > GAME_CONSTANTS.ANTI_CHEAT.MAX_SESSION_AGE_MS) {
      return { valid: false, reason: 'SESSION_EXPIRED' };
    }

    // Height bound check: score must not exceed floor(maxHeight / 2) + 1
    const maxAllowedScore = Math.floor(Math.max(0, maxHeight) / 2) + 1;
    if (score > maxAllowedScore) {
      return { valid: false, reason: 'SCORE_HEIGHT_MISMATCH' };
    }

    // Score rate check
    const durationSeconds = Math.max(1, durationMs / 1000);
    const scoreRate = score / durationSeconds;
    const maxRate = antiCheat.maxScoreRate || GAME_CONSTANTS.ANTI_CHEAT.DEFAULT_MAX_SCORE_RATE;
    if (scoreRate > maxRate) {
      return { valid: false, reason: 'SCORE_RATE_EXCEEDED' };
    }

    return { valid: true };
  },

  recordAcceptedScore(session, player, { score, maxHeight, durationMs }, db = null) {
    const database = db || getDatabase();
    const now = new Date();
    const achievedAt = now.getTime();
    const dayKey = getDayKey(now);
    const weekKey = getWeekKey(now);
    const newScoreId = scoreId();

    // Check previous best
    const previousBest = scoresRepo.getPlayerBestScore(player.id, { period: 'all' }, database);
    const previousRanks = {
      daily: scoresRepo.getPlayerRank(player.id, { period: 'daily', dayKey }, database),
      weekly: scoresRepo.getPlayerRank(player.id, { period: 'weekly', weekKey }, database),
      all: scoresRepo.getPlayerRank(player.id, { period: 'all' }, database)
    };

    // Insert score
    scoresRepo.create(
      {
        id: newScoreId,
        player_id: player.id,
        session_id: session.id,
        score,
        achieved_at: achievedAt,
        day_key: dayKey,
        week_key: weekKey,
        hidden_at: null,
        hidden_reason: null
      },
      database
    );

    // Emit score.accepted
    eventService.emit(
      'score.accepted',
      {
        player,
        sessionId: session.id,
        data: { scoreId: newScoreId, score, maxHeight, durationMs }
      },
      database
    );

    // Milestones check
    const unlockedMilestones = [];
    for (const milestone of GAME_CONSTANTS.MILESTONES) {
      if (score >= milestone) {
        unlockedMilestones.push(milestone);
        eventService.emit(
          'milestone.reached',
          {
            player,
            sessionId: session.id,
            data: { milestone, score }
          },
          database
        );
      }
    }

    // Personal best check
    const isNewPB = !previousBest || score > previousBest.score;
    if (isNewPB) {
      eventService.emit(
        'score.personal_best',
        {
          player,
          sessionId: session.id,
          data: {
            scoreId: newScoreId,
            score,
            previousBest: previousBest ? previousBest.score : null
          }
        },
        database
      );
    }

    // Compute new ranks
    const newRanks = {
      daily: scoresRepo.getPlayerRank(player.id, { period: 'daily', dayKey }, database),
      weekly: scoresRepo.getPlayerRank(player.id, { period: 'weekly', weekKey }, database),
      all: scoresRepo.getPlayerRank(player.id, { period: 'all' }, database)
    };

    // Leaderboard rank changed events
    for (const period of ['daily', 'weekly', 'all']) {
      const prevRank = previousRanks[period];
      const curRank = newRanks[period];
      if (curRank !== null && (prevRank === null || curRank < prevRank)) {
        let enteredTop = null;
        if (curRank <= 10 && (prevRank === null || prevRank > 10)) enteredTop = 10;
        else if (curRank <= 100 && (prevRank === null || prevRank > 100)) enteredTop = 100;

        eventService.emit(
          'leaderboard.rank_changed',
          {
            player,
            sessionId: session.id,
            data: {
              period,
              previousRank: prevRank,
              rank: curRank,
              score,
              enteredTop
            }
          },
          database
        );
      }
    }

    return {
      scoreId: newScoreId,
      personalBest: {
        score: Math.max(score, previousBest ? previousBest.score : 0),
        isNew: isNewPB
      },
      rank: newRanks,
      milestones: unlockedMilestones
    };
  }
};
