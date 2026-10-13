import { sessionsRepo } from '../repositories/sessions.repo.js';
import { playersRepo } from '../repositories/players.repo.js';
import { themesRepo } from '../repositories/themes.repo.js';
import { scoreService } from './score.service.js';
import { eventService } from './event.service.js';
import { sessionId } from '../utils/ids.js';
import { EVENT_DEFINITIONS } from '../../shared/eventTypes.js';
import { getDatabase } from '../db/connection.js';

export const sessionService = {
  startSession(playerId, clientInfo = null, db = null) {
    const database = db || getDatabase();
    const player = playersRepo.findById(playerId, database);
    if (!player) {
      const err = new Error('Player not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (player.banned_at) {
      const err = new Error('Player is banned');
      err.code = 'PLAYER_BANNED';
      err.statusCode = 403;
      throw err;
    }

    const now = Date.now();

    // Close any previous open session for this player
    const openSessions = sessionsRepo.findOpenByPlayerId(playerId, database);
    for (const openSes of openSessions) {
      sessionsRepo.update(
        openSes.id,
        {
          status: 'abandoned',
          end_reason: 'abandoned',
          ended_at: now
        },
        database
      );

      eventService.emit(
        'game.ended',
        {
          player,
          sessionId: openSes.id,
          data: {
            score: openSes.score || 0,
            maxHeight: openSes.max_height || 0,
            durationMs: openSes.duration_ms || (now - openSes.started_at),
            reason: 'abandoned',
            accepted: false
          }
        },
        database
      );
    }

    // Seed and theme version
    const seed = Math.floor(Math.random() * 0xffffffff);
    const publishedTheme = themesRepo.getLatestPublished(database);
    const themeVersion = publishedTheme ? publishedTheme.version : 0;
    const newSessionId = sessionId();

    const sessionRow = {
      id: newSessionId,
      player_id: playerId,
      seed,
      theme_version: themeVersion,
      status: 'open',
      started_at: now,
      ended_at: null,
      score: null,
      max_height: null,
      duration_ms: null,
      end_reason: null,
      reject_reason: null,
      stats: null,
      client_info: clientInfo ? JSON.stringify(clientInfo) : null,
      client_event_count: 0,
      end_response: null
    };

    sessionsRepo.create(sessionRow, database);

    eventService.emit(
      'game.started',
      {
        player,
        sessionId: newSessionId,
        data: {
          seed,
          themeVersion,
          client: clientInfo || undefined
        }
      },
      database
    );

    return {
      sessionId: newSessionId,
      seed,
      themeVersion,
      startedAt: new Date(now).toISOString()
    };
  },

  recordClientEvents(targetSessionId, playerId, clientEvents = [], db = null) {
    const database = db || getDatabase();
    const session = sessionsRepo.findById(targetSessionId, database);
    if (!session || session.player_id !== playerId) {
      const err = new Error('Session not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const now = Date.now();
    if (session.status !== 'open' && (!session.ended_at || now - session.ended_at > 10000)) {
      const err = new Error('Session closed');
      err.code = 'SESSION_CLOSED';
      err.statusCode = 409;
      throw err;
    }

    if (session.client_event_count >= 2000) {
      return { accepted: 0, duplicates: 0 };
    }

    const player = playersRepo.findById(playerId, database);
    let accepted = 0;
    let duplicates = 0;

    for (const evt of clientEvents.slice(0, 100)) {
      if (session.client_event_count + accepted >= 2000) break;

      const def = EVENT_DEFINITIONS[evt.type];
      if (!def || def.source !== 'client') {
        const err = new Error(`Disallowed client event type: ${evt.type}`);
        err.code = 'VALIDATION_ERROR';
        err.statusCode = 400;
        throw err;
      }

      const clientTs = typeof evt.clientTs === 'number' ? evt.clientTs : 0;
      const occurredAt = Math.min(now, session.started_at + clientTs);

      try {
        eventService.emit(
          evt.type,
          {
            player,
            sessionId: targetSessionId,
            data: evt.data || {},
            trust: 'client',
            occurredAt,
            clientEventId: evt.clientEventId || null
          },
          database
        );
        accepted++;
      } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
          duplicates++;
        } else {
          throw err;
        }
      }
    }

    if (accepted > 0) {
      sessionsRepo.update(
        targetSessionId,
        { client_event_count: session.client_event_count + accepted },
        database
      );
    }

    return { accepted, duplicates };
  },

  endSession(targetSessionId, playerId, { score, maxHeight, durationMs, reason, stats = {} }, db = null) {
    const database = db || getDatabase();
    const session = sessionsRepo.findById(targetSessionId, database);
    if (!session || session.player_id !== playerId) {
      const err = new Error('Session not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // Idempotent return if already finished
    if (session.end_response) {
      try {
        return JSON.parse(session.end_response);
      } catch {}
    }

    const player = playersRepo.findById(playerId, database);
    const now = Date.now();
    const validation = scoreService.validateRun(session, player, { score, maxHeight, durationMs });

    if (!validation.valid) {
      const result = {
        accepted: false,
        reason: validation.reason
      };

      sessionsRepo.update(
        targetSessionId,
        {
          status: 'rejected',
          score,
          max_height: maxHeight,
          duration_ms: durationMs,
          end_reason: reason,
          reject_reason: validation.reason,
          stats: JSON.stringify(stats),
          ended_at: now,
          end_response: JSON.stringify(result)
        },
        database
      );

      eventService.emit(
        'game.ended',
        {
          player,
          sessionId: targetSessionId,
          data: {
            score,
            maxHeight,
            durationMs,
            reason,
            accepted: false,
            stats
          }
        },
        database
      );

      eventService.emit(
        'score.rejected',
        {
          player,
          sessionId: targetSessionId,
          data: {
            score,
            reason: validation.reason
          }
        },
        database
      );

      return result;
    }

    // Accepted run
    const recorded = scoreService.recordAcceptedScore(
      session,
      player,
      { score, maxHeight, durationMs },
      database
    );

    const result = {
      accepted: true,
      scoreId: recorded.scoreId,
      personalBest: recorded.personalBest,
      rank: recorded.rank,
      milestones: recorded.milestones
    };

    sessionsRepo.update(
      targetSessionId,
      {
        status: 'completed',
        score,
        max_height: maxHeight,
        duration_ms: durationMs,
        end_reason: reason,
        stats: JSON.stringify(stats),
        ended_at: now,
        end_response: JSON.stringify(result)
      },
      database
    );

    eventService.emit(
      'game.ended',
      {
        player,
        sessionId: targetSessionId,
        data: {
          score,
          maxHeight,
          durationMs,
          reason,
          accepted: true,
          stats
        }
      },
      database
    );

    return result;
  },

  cleanupOldSessions(db = null) {
    const database = db || getDatabase();
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const oldSessions = sessionsRepo.getOpenSessionsOlderThan(twoHoursAgo, database);

    for (const ses of oldSessions) {
      sessionsRepo.update(
        ses.id,
        {
          status: 'abandoned',
          end_reason: 'abandoned',
          ended_at: Date.now()
        },
        database
      );

      const player = playersRepo.findById(ses.player_id, database);
      eventService.emit(
        'game.ended',
        {
          player,
          sessionId: ses.id,
          data: {
            score: ses.score || 0,
            maxHeight: ses.max_height || 0,
            durationMs: ses.duration_ms || (Date.now() - ses.started_at),
            reason: 'abandoned',
            accepted: false
          }
        },
        database
      );
    }
  }
};
