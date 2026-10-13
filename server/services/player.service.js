import { playersRepo } from '../repositories/players.repo.js';
import { sessionsRepo } from '../repositories/sessions.repo.js';
import { scoresRepo } from '../repositories/scores.repo.js';
import { authService } from './auth.service.js';
import { eventService } from './event.service.js';
import { playerId } from '../utils/ids.js';
import { getDayKey, getWeekKey } from '../utils/dateKeys.js';
import { env } from '../config/env.js';
import { getDatabase } from '../db/connection.js';

// Basic list of offensive terms to filter in nicknames
const PROFANITY_LIST = [
  'admin', 'root', 'moderator', 'system', 'fuck', 'shit', 'asshole', 'bitch',
  'dick', 'pussy', 'bastard', 'cunt', 'nigger', 'faggot', 'bal', 'choda', 'magi'
];

function isProfane(text) {
  const lower = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  return PROFANITY_LIST.some((p) => lower.includes(p));
}

export const playerService = {
  async identify({ launchToken = null, nickname = null, deviceId = null }, db = null) {
    const database = db || getDatabase();
    const now = Date.now();

    if (launchToken) {
      // Host launch token identification
      const payload = await authService.verifyLaunchToken(launchToken, database);
      const externalUserId = String(payload.sub);
      const displayName = String(payload.name).trim().slice(0, 20);

      let player = playersRepo.findByExternalUserId(externalUserId, database);
      let isNew = false;

      if (!player) {
        isNew = true;
        player = {
          id: playerId(),
          mode: 'host',
          external_user_id: externalUserId,
          device_id: null,
          display_name: displayName,
          banned_at: null,
          ban_reason: null,
          created_at: now,
          last_seen_at: now
        };
        playersRepo.create(player, database);
      } else {
        // Update display_name from host token and last_seen_at
        player = playersRepo.update(
          player.id,
          { display_name: displayName, last_seen_at: now },
          database
        );
      }

      if (player.banned_at) {
        const err = new Error('Player is banned');
        err.code = 'PLAYER_BANNED';
        err.statusCode = 403;
        throw err;
      }

      const playerToken = await authService.signPlayerToken(player);
      eventService.emit(
        'player.identified',
        {
          player,
          data: { mode: 'host', isNew }
        },
        database
      );

      return {
        player: {
          id: player.id,
          displayName: player.display_name,
          externalUserId: player.external_user_id,
          mode: player.mode
        },
        playerToken,
        expiresAt: new Date(now + 24 * 3600 * 1000).toISOString()
      };
    }

    // Anonymous nickname identification
    if (!env.ALLOW_ANONYMOUS) {
      const err = new Error('Anonymous play is disabled');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }

    if (!nickname || typeof nickname !== 'string') {
      const err = new Error('Nickname is required for anonymous play');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length < 3 || trimmedNickname.length > 20) {
      const err = new Error('Nickname must be between 3 and 20 characters');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    if (isProfane(trimmedNickname)) {
      const err = new Error('Nickname contains disallowed language');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const targetDeviceId = deviceId || `dev_${Math.random().toString(36).slice(2, 12)}`;
    let player = playersRepo.findByDeviceId(targetDeviceId, database);
    let isNew = false;

    if (!player) {
      isNew = true;
      player = {
        id: playerId(),
        mode: 'anonymous',
        external_user_id: null,
        device_id: targetDeviceId,
        display_name: trimmedNickname,
        banned_at: null,
        ban_reason: null,
        created_at: now,
        last_seen_at: now
      };
      playersRepo.create(player, database);
    } else {
      player = playersRepo.update(
        player.id,
        { display_name: trimmedNickname, last_seen_at: now },
        database
      );
    }

    if (player.banned_at) {
      const err = new Error('Player is banned');
      err.code = 'PLAYER_BANNED';
      err.statusCode = 403;
      throw err;
    }

    const playerToken = await authService.signPlayerToken(player);
    eventService.emit(
      'player.identified',
      {
        player,
        data: { mode: 'anonymous', isNew }
      },
      database
    );

    return {
      player: {
        id: player.id,
        displayName: player.display_name,
        externalUserId: null,
        deviceId: targetDeviceId,
        mode: player.mode
      },
      playerToken,
      expiresAt: new Date(now + 24 * 3600 * 1000).toISOString()
    };
  },

  getStatsByExternalUserId(externalUserId, db = null) {
    const database = db || getDatabase();
    const player = playersRepo.findByExternalUserId(externalUserId, database);
    if (!player) {
      const err = new Error('Player not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }
    return this.getPlayerStats(player, database);
  },

  getPlayerStats(player, db = null) {
    const database = db || getDatabase();
    const now = new Date();
    const dayKey = getDayKey(now);
    const weekKey = getWeekKey(now);

    const bestScoreRow = scoresRepo.getPlayerBestScore(player.id, { period: 'all' }, database);
    const dailyRank = scoresRepo.getPlayerRank(player.id, { period: 'daily', dayKey }, database);
    const weeklyRank = scoresRepo.getPlayerRank(player.id, { period: 'weekly', weekKey }, database);
    const allRank = scoresRepo.getPlayerRank(player.id, { period: 'all' }, database);

    const sessionAgg = database
      .prepare(
        `SELECT COUNT(*) as totalRuns,
                COALESCE(SUM(max_height), 0) as totalHeight,
                MAX(started_at) as lastPlayedAt
         FROM game_sessions
         WHERE player_id = ?`
      )
      .get(player.id);

    return {
      player: {
        id: player.id,
        externalUserId: player.external_user_id,
        displayName: player.display_name,
        banned: Boolean(player.banned_at)
      },
      bestScore: bestScoreRow ? bestScoreRow.score : 0,
      totalRuns: sessionAgg.totalRuns,
      totalHeight: sessionAgg.totalHeight,
      rank: {
        daily: dailyRank,
        weekly: weeklyRank,
        all: allRank
      },
      lastPlayedAt: sessionAgg.lastPlayedAt ? new Date(sessionAgg.lastPlayedAt).toISOString() : null
    };
  },

  banPlayer(playerIdToBan, reason = null, db = null) {
    const database = db || getDatabase();
    const player = playersRepo.findById(playerIdToBan, database);
    if (!player) {
      const err = new Error('Player not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const updated = playersRepo.update(
      playerIdToBan,
      { banned_at: Date.now(), ban_reason: reason },
      database
    );
    eventService.emit(
      'admin.player_banned',
      {
        player: updated,
        data: { playerId: playerIdToBan, reason }
      },
      database
    );
    return updated;
  },

  unbanPlayer(playerIdToUnban, db = null) {
    const database = db || getDatabase();
    const player = playersRepo.findById(playerIdToUnban, database);
    if (!player) {
      const err = new Error('Player not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const updated = playersRepo.update(
      playerIdToUnban,
      { banned_at: null, ban_reason: null },
      database
    );
    eventService.emit(
      'admin.player_unbanned',
      {
        player: updated,
        data: { playerId: playerIdToUnban }
      },
      database
    );
    return updated;
  }
};
