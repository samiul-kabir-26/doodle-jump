import express from 'express';
import { themeService } from '../services/theme.service.js';
import { playerService } from '../services/player.service.js';
import { sessionService } from '../services/session.service.js';
import { leaderboardService } from '../services/leaderboard.service.js';
import { authService } from '../services/auth.service.js';
import { playerAuth } from '../middleware/playerAuth.js';
import {
  identifyLimiter,
  playerLimiter,
  sessionCreateLimiter
} from '../middleware/rateLimit.js';

export const publicRouter = express.Router();

// Health & Ready
publicRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

publicRouter.get('/ready', (req, res) => {
  try {
    themeService.getConfig();
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// Config
publicRouter.get('/api/v1/config', async (req, res, next) => {
  try {
    const isDraft = req.query.preview === 'draft';
    let isAdmin = false;
    if (isDraft) {
      const cookie = req.cookies?.dj_admin;
      const adminPayload = cookie ? await authService.verifyAdminToken(cookie) : null;
      if (!adminPayload) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Admin authorization required for draft preview',
            requestId: req.id
          }
        });
      }
      isAdmin = true;
    }

    const config = themeService.getConfig({ previewDraft: isDraft, isAdmin });

    res.setHeader('ETag', config.etag);
    res.setHeader('Cache-Control', 'no-cache');

    if (req.headers['if-none-match'] === config.etag) {
      return res.status(304).end();
    }

    res.status(200).json({
      themeVersion: config.themeVersion,
      theme: config.theme,
      gameplay: config.gameplay,
      features: config.features
    });
  } catch (err) {
    next(err);
  }
});

// Player Identify
publicRouter.post('/api/v1/players/identify', identifyLimiter, async (req, res, next) => {
  try {
    const { launchToken, nickname, deviceId } = req.body || {};
    const result = await playerService.identify({ launchToken, nickname, deviceId });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Start Session
publicRouter.post('/api/v1/sessions', playerAuth, sessionCreateLimiter, async (req, res, next) => {
  try {
    const clientInfo = req.body?.client || null;
    const result = sessionService.startSession(req.player.id, clientInfo);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Record Client Events (supports application/json and text/plain for sendBeacon)
publicRouter.post('/api/v1/sessions/:sessionId/events', playerLimiter, async (req, res, next) => {
  try {
    // If text/plain was sent, parse JSON body
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON payload in plain text',
            requestId: req.id
          }
        });
      }
    }

    // Player auth check
    let token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : body?.playerToken;

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Missing player authorization token',
          requestId: req.id
        }
      });
    }

    const payload = await authService.verifyPlayerToken(token);
    if (!payload?.sub) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Invalid player token',
          requestId: req.id
        }
      });
    }

    const rawEvents = Array.isArray(body?.events) ? body.events : [];
    const result = sessionService.recordClientEvents(req.params.sessionId, payload.sub, rawEvents);
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});

// End Session
publicRouter.post('/api/v1/sessions/:sessionId/end', playerAuth, playerLimiter, async (req, res, next) => {
  try {
    const { score, maxHeight, durationMs, reason, stats } = req.body || {};
    if (typeof score !== 'number' || typeof maxHeight !== 'number' || typeof durationMs !== 'number' || !reason) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required session end fields (score, maxHeight, durationMs, reason)',
          requestId: req.id
        }
      });
    }

    const result = sessionService.endSession(req.params.sessionId, req.player.id, {
      score,
      maxHeight,
      durationMs,
      reason,
      stats: stats || {}
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Public Leaderboard
publicRouter.get('/api/v1/leaderboard', (req, res, next) => {
  try {
    const period = ['daily', 'weekly', 'all'].includes(req.query.period)
      ? req.query.period
      : 'all';
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const result = leaderboardService.getLeaderboard({
      period,
      limit,
      offset,
      includeHidden: false
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Player Self Leaderboard
publicRouter.get('/api/v1/leaderboard/me', playerAuth, (req, res, next) => {
  try {
    const period = ['daily', 'weekly', 'all'].includes(req.query.period)
      ? req.query.period
      : 'all';
    const result = leaderboardService.getMeLeaderboard(req.player.id, { period });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
