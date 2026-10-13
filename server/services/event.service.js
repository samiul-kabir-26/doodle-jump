import { eventsRepo } from '../repositories/events.repo.js';
import { settingsRepo } from '../repositories/settings.repo.js';
import { webhooksRepo } from '../repositories/webhooks.repo.js';
import { EVENT_DEFINITIONS, validateEventPayload } from '../../shared/eventTypes.js';
import { eventId, deliveryId } from '../utils/ids.js';
import { getDatabase } from '../db/connection.js';

function matchesGlob(pattern, str) {
  if (pattern === '*' || pattern === str) return true;
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return str.startsWith(`${prefix}.`);
  }
  return false;
}

export function formatEvent(row) {
  if (!row) return null;
  let parsedData = {};
  try {
    parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  } catch {}

  return {
    id: row.id,
    seq: row.seq,
    type: row.type,
    version: row.version,
    category: row.category,
    trust: row.trust,
    occurredAt: new Date(row.occurred_at).toISOString(),
    receivedAt: new Date(row.received_at).toISOString(),
    source: { service: 'doodle-jump', instance: 'dj-1', env: process.env.NODE_ENV || 'development' },
    player: row.player_id
      ? {
          id: row.player_id,
          externalUserId: row.external_user_id || null,
          displayName: row.player_display_name || undefined
        }
      : null,
    sessionId: row.session_id || null,
    data: parsedData
  };
}

export const eventService = {
  emit(type, { player = null, sessionId = null, data = {}, trust = null, occurredAt = null, clientEventId = null }, db = null) {
    const def = EVENT_DEFINITIONS[type];
    if (!def) {
      throw new Error(`Unknown event type: ${type}`);
    }

    const validatedData = validateEventPayload(type, data);
    const now = Date.now();
    const evtId = eventId();

    const row = {
      id: evtId,
      type,
      version: def.version,
      category: def.category,
      trust: trust || def.trust,
      occurred_at: occurredAt || now,
      received_at: now,
      player_id: player?.id || null,
      external_user_id: player?.external_user_id || null,
      session_id: sessionId || null,
      client_event_id: clientEventId || null,
      data: JSON.stringify(validatedData)
    };

    const database = db || getDatabase();
    const inserted = eventsRepo.insert(row, database);

    // Check webhook enqueue
    try {
      const webhookSettings = settingsRepo.get('webhook', database);
      if (webhookSettings && webhookSettings.enabled && webhookSettings.url) {
        const filters = webhookSettings.eventTypes || ['score.*', 'milestone.*', 'leaderboard.*', 'game.ended'];
        const matches = filters.some((f) => matchesGlob(f, type));
        if (matches) {
          webhooksRepo.createDelivery(
            {
              id: deliveryId(),
              event_seq: inserted.seq,
              url: webhookSettings.url,
              status: 'pending',
              attempts: 0,
              next_attempt_at: now,
              last_status_code: null,
              last_error: null,
              last_duration_ms: null,
              created_at: now,
              updated_at: now
            },
            database
          );
        }
      }
    } catch (err) {
      console.error('Failed to enqueue webhook delivery:', err);
    }

    return formatEvent({
      ...inserted,
      player_display_name: player?.display_name
    });
  },

  query(options, db = null) {
    const rows = eventsRepo.query(options, db);
    return rows.map(formatEvent);
  },

  findById(id, db = null) {
    const row = eventsRepo.findById(id, db);
    return formatEvent(row);
  },

  findBySessionId(sessionId, db = null) {
    const rows = eventsRepo.findBySessionId(sessionId, db);
    return rows.map(formatEvent);
  },

  getStats(sinceTime, db = null) {
    return eventsRepo.getStats(sinceTime, db);
  },

  getEventsPerMinute(sinceTime, db = null) {
    return eventsRepo.getEventsPerMinute(sinceTime, db);
  }
};
