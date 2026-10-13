import express from 'express';
import { eventService } from '../services/event.service.js';
import { playerService } from '../services/player.service.js';
import { apiKeyAuth } from '../middleware/apiKey.js';
import { integrationLimiter } from '../middleware/rateLimit.js';
import { EVENT_DEFINITIONS } from '../../shared/eventTypes.js';

export const integrationRouter = express.Router();

// Event Types Catalog (public)
integrationRouter.get('/api/v1/event-types', (req, res) => {
  const catalog = {};
  for (const [type, def] of Object.entries(EVENT_DEFINITIONS)) {
    catalog[type] = {
      type,
      category: def.category,
      trust: def.trust,
      source: def.source,
      version: def.version
    };
  }
  res.status(200).json({ eventTypes: catalog });
});

// Events Cursor Feed
integrationRouter.get('/api/v1/events', apiKeyAuth, integrationLimiter, (req, res, next) => {
  try {
    const after = parseInt(req.query.after, 10) || 0;
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const types = req.query.type ? req.query.type.split(',').map((s) => s.trim()) : null;
    const category = req.query.category || null;
    const trust = req.query.trust || null;
    const externalUserId = req.query.externalUserId || null;
    const since = req.query.since ? new Date(req.query.since).getTime() : null;

    // Fetch limit + 1 to determine hasMore
    const events = eventService.query({
      after,
      limit: limit + 1,
      types,
      category,
      trust,
      externalUserId,
      since,
      order: 'asc',
      excludeAdmin: category !== 'admin'
    });

    const hasMore = events.length > limit;
    const results = hasMore ? events.slice(0, limit) : events;
    const nextCursor = results.length > 0 ? results[results.length - 1].seq : after;

    res.status(200).json({
      events: results,
      nextCursor,
      hasMore
    });
  } catch (err) {
    next(err);
  }
});

// Player Stats
integrationRouter.get('/api/v1/players/:externalUserId/stats', apiKeyAuth, integrationLimiter, (req, res, next) => {
  try {
    const stats = playerService.getStatsByExternalUserId(req.params.externalUserId);
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
});
