import express from 'express';
import multer from 'multer';
import { authService } from '../services/auth.service.js';
import { themeService } from '../services/theme.service.js';
import { assetService } from '../services/asset.service.js';
import { eventService } from '../services/event.service.js';
import { leaderboardService } from '../services/leaderboard.service.js';
import { playerService } from '../services/player.service.js';
import { settingsService } from '../services/settings.service.js';
import { webhookService } from '../services/webhook.service.js';
import { playersRepo } from '../repositories/players.repo.js';
import { sessionsRepo } from '../repositories/sessions.repo.js';
import { scoresRepo } from '../repositories/scores.repo.js';
import { webhooksRepo } from '../repositories/webhooks.repo.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { adminLoginLimiter, adminApiLimiter } from '../middleware/rateLimit.js';
import { env } from '../config/env.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB memory cap for multer before validation
});

export const adminRouter = express.Router();

// ─── Authentication ────────────────────────────────────────────────────────
adminRouter.post('/api/v1/admin/login', adminLoginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const valid = authService.verifyAdminCredentials(username, password);

    if (!valid) {
      eventService.emit('admin.login_failed', {
        data: { usernameAttempted: String(username || 'unknown').slice(0, 50) }
      });
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Invalid username or password',
          requestId: req.id
        }
      });
    }

    const token = await authService.signAdminToken(username);
    const maxAgeMs = (env.ADMIN_SESSION_HOURS || 8) * 3600 * 1000;

    res.cookie('dj_admin', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAgeMs,
      path: '/'
    });

    eventService.emit('admin.login', {
      data: { username }
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/v1/admin/logout', (req, res) => {
  res.clearCookie('dj_admin', { path: '/' });
  res.status(204).end();
});

// All routes below require Admin Auth & Rate Limiting
adminRouter.use('/api/v1/admin', adminAuth);
adminRouter.use('/api/v1/admin', adminApiLimiter);

adminRouter.get('/api/v1/admin/me', (req, res) => {
  const hours = env.ADMIN_SESSION_HOURS || 8;
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  res.status(200).json({
    username: req.admin.username,
    expiresAt
  });
});

// ─── Dashboard ─────────────────────────────────────────────────────────────
adminRouter.get('/api/v1/admin/dashboard', (req, res, next) => {
  try {
    const range = req.query.range || '24h';
    let rangeMs = 24 * 3600 * 1000;
    if (range === '7d') rangeMs = 7 * 24 * 3600 * 1000;
    if (range === '30d') rangeMs = 30 * 24 * 3600 * 1000;

    const sinceTime = Date.now() - rangeMs;
    const sessionStats = sessionsRepo.getDashboardStats(sinceTime);
    const eventsPerMin = eventService.getEventsPerMinute(Date.now() - 24 * 3600 * 1000);
    const webhookStats = webhooksRepo.getStats();
    const webhookSettings = settingsService.getSettings().webhook;

    const latestEvents = eventService.query({
      limit: 10,
      order: 'desc'
    });

    res.status(200).json({
      runs: sessionStats.runs,
      uniquePlayers: sessionStats.uniquePlayers,
      avgScore: sessionStats.avgScore,
      maxScore: sessionStats.maxScore,
      rejectedRuns: sessionStats.rejectedRuns,
      eventsPerMinute: eventsPerMin.map((r) => ({
        t: new Date(r.bucket).toISOString(),
        count: r.count
      })),
      webhook: {
        enabled: webhookSettings.enabled,
        pending: webhookStats.pending,
        failedLast24h: webhookStats.failedLast24h,
        lastSuccessAt: webhookStats.lastSuccessAt
      },
      latestEvents
    });
  } catch (err) {
    next(err);
  }
});

// ─── Theme Management ──────────────────────────────────────────────────────
adminRouter.get('/api/v1/admin/theme', (req, res, next) => {
  try {
    const data = themeService.getThemeAdmin();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/api/v1/admin/theme/draft', (req, res, next) => {
  try {
    const saved = themeService.saveDraft(req.body);
    res.status(200).json(saved);
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/api/v1/admin/theme/draft', (req, res, next) => {
  try {
    const saved = themeService.patchDraft(req.body);
    res.status(200).json(saved);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/v1/admin/theme/draft/discard', (req, res, next) => {
  try {
    const resetDraft = themeService.discardDraft();
    res.status(200).json(resetDraft);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/v1/admin/theme/publish', (req, res, next) => {
  try {
    const { note } = req.body || {};
    const result = themeService.publish(note);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/api/v1/admin/theme/versions', (req, res, next) => {
  try {
    const list = themeService.listVersions();
    res.status(200).json({ versions: list });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/api/v1/admin/theme/versions/:version', (req, res, next) => {
  try {
    const versionNum = parseInt(req.params.version, 10);
    const ver = themeService.getVersion(versionNum);
    res.status(200).json(ver);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/v1/admin/theme/rollback/:version', (req, res, next) => {
  try {
    const versionNum = parseInt(req.params.version, 10);
    const result = themeService.rollback(versionNum);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/v1/admin/theme/reset-defaults', (req, res, next) => {
  try {
    const reset = themeService.resetDefaults();
    res.status(200).json(reset);
  } catch (err) {
    next(err);
  }
});

// ─── Assets Management ─────────────────────────────────────────────────────
adminRouter.get('/api/v1/admin/assets', (req, res, next) => {
  try {
    const kind = req.query.kind || null;
    const assets = assetService.listAssets(kind);
    res.status(200).json({ assets });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/v1/admin/assets', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing file in multipart upload',
          requestId: req.id
        }
      });
    }

    const slot = req.body.slot || req.query.slot || null;
    const asset = await assetService.processAndSaveUpload({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      slot
    });

    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/api/v1/admin/assets/:id', (req, res, next) => {
  try {
    assetService.deleteAsset(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── Events Explorer & Export ──────────────────────────────────────────────
adminRouter.get('/api/v1/admin/events', (req, res, next) => {
  try {
    const after = req.query.after ? parseInt(req.query.after, 10) : null;
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const types = req.query.type ? req.query.type.split(',').map((s) => s.trim()) : null;
    const category = req.query.category || null;
    const trust = req.query.trust || null;
    const playerId = req.query.playerId || null;
    const sessionId = req.query.sessionId || null;
    const from = req.query.from ? new Date(req.query.from).getTime() : null;
    const to = req.query.to ? new Date(req.query.to).getTime() : null;
    const q = req.query.q || null;
    const order = req.query.order || 'desc';

    const events = eventService.query({
      after,
      limit,
      types,
      category,
      trust,
      playerId,
      sessionId,
      from,
      to,
      q,
      order,
      excludeAdmin: false
    });

    res.status(200).json({ events });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/api/v1/admin/events/stats', (req, res, next) => {
  try {
    const rangeMs = req.query.range === '7d' ? 7 * 24 * 3600 * 1000 : 24 * 3600 * 1000;
    const stats = eventService.getStats(Date.now() - rangeMs);
    res.status(200).json({ stats });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/api/v1/admin/events/export', (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'ndjson';
    const types = req.query.type ? req.query.type.split(',').map((s) => s.trim()) : null;
    const category = req.query.category || null;
    const trust = req.query.trust || null;
    const playerId = req.query.playerId || null;
    const sessionId = req.query.sessionId || null;
    const from = req.query.from ? new Date(req.query.from).getTime() : null;
    const to = req.query.to ? new Date(req.query.to).getTime() : null;
    const q = req.query.q || null;

    const events = eventService.query({
      limit: 10000,
      types,
      category,
      trust,
      playerId,
      sessionId,
      from,
      to,
      q,
      order: 'asc',
      excludeAdmin: false
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="events.csv"');
      res.write('seq,id,type,version,category,trust,occurredAt,playerId,sessionId,data\n');
      for (const e of events) {
        const line = [
          e.seq,
          `"${e.id}"`,
          `"${e.type}"`,
          e.version,
          `"${e.category}"`,
          `"${e.trust}"`,
          `"${e.occurredAt}"`,
          `"${e.player?.id || ''}"`,
          `"${e.sessionId || ''}"`,
          `"${JSON.stringify(e.data).replace(/"/g, '""')}"`
        ].join(',');
        res.write(line + '\n');
      }
      return res.end();
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Content-Disposition', 'attachment; filename="events.ndjson"');
    for (const e of events) {
      res.write(JSON.stringify(e) + '\n');
    }
    res.end();
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/api/v1/admin/events/:id', (req, res, next) => {
  try {
    const event = eventService.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Event not found', requestId: req.id }
      });
    }
    res.status(200).json(event);
  } catch (err) {
    next(err);
  }
});

// ─── Moderation (Leaderboard & Players) ────────────────────────────────────
adminRouter.get('/api/v1/admin/leaderboard', (req, res, next) => {
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
      includeHidden: req.query.includeHidden === 'true'
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/v1/admin/scores/:scoreId/hide', (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const score = scoresRepo.hide(req.params.scoreId, reason);
    if (!score) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Score not found', requestId: req.id }
      });
    }

    leaderboardService.invalidateCache();

    eventService.emit('admin.score_hidden', {
      data: { scoreId: score.id, playerId: score.player_id, reason }
    });

    res.status(200).json(score);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/v1/admin/scores/:scoreId/restore', (req, res, next) => {
  try {
    const score = scoresRepo.restore(req.params.scoreId);
    if (!score) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Score not found', requestId: req.id }
      });
    }

    leaderboardService.invalidateCache();

    eventService.emit('admin.score_restored', {
      data: { scoreId: score.id, playerId: score.player_id }
    });

    res.status(200).json(score);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/api/v1/admin/players', (req, res, next) => {
  try {
    const q = req.query.q || null;
    let banned = null;
    if (req.query.banned === 'true') banned = true;
    if (req.query.banned === 'false') banned = false;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const players = playersRepo.findMany({ q, banned, limit, offset });
    const total = playersRepo.count({ q, banned });

    res.status(200).json({ players, total });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/api/v1/admin/players/:id', (req, res, next) => {
  try {
    const player = playersRepo.findById(req.params.id);
    if (!player) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Player not found', requestId: req.id }
      });
    }

    const stats = playerService.getPlayerStats(player);
    const recentSessions = sessionsRepo.findRecentByPlayerId(player.id, 10);

    res.status(200).json({
      player,
      stats,
      recentSessions: recentSessions.map((s) => ({
        ...s,
        stats: s.stats ? JSON.parse(s.stats) : null
      }))
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/v1/admin/players/:id/ban', (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const updated = playerService.banPlayer(req.params.id, reason);
    leaderboardService.invalidateCache();
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/v1/admin/players/:id/unban', (req, res, next) => {
  try {
    const updated = playerService.unbanPlayer(req.params.id);
    leaderboardService.invalidateCache();
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/api/v1/admin/sessions/:id', (req, res, next) => {
  try {
    const session = sessionsRepo.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session not found', requestId: req.id }
      });
    }

    const player = playersRepo.findById(session.player_id);
    const events = eventService.findBySessionId(session.id);

    res.status(200).json({
      session: {
        ...session,
        stats: session.stats ? JSON.parse(session.stats) : null
      },
      player,
      events
    });
  } catch (err) {
    next(err);
  }
});

// ─── Settings & Webhooks ───────────────────────────────────────────────────
adminRouter.get('/api/v1/admin/settings', (req, res, next) => {
  try {
    const settings = settingsService.getSettings();
    const integrationInfo = {
      baseUrl: env.PUBLIC_BASE_URL,
      integrationKeyConfigured: Boolean(env.INTEGRATION_API_KEY),
      hostSigningSecretConfigured: Boolean(env.HOST_SIGNING_SECRET)
    };

    res.status(200).json({
      ...settings,
      integration: integrationInfo
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/api/v1/admin/settings', (req, res, next) => {
  try {
    const updated = settingsService.updateSettings(req.body);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/v1/admin/webhooks/test', async (req, res, next) => {
  try {
    const result = await webhookService.testSend();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/api/v1/admin/webhooks/deliveries', (req, res, next) => {
  try {
    const status = req.query.status || null;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const deliveries = webhooksRepo.getDeliveries({ status, limit, offset });
    const total = webhooksRepo.countDeliveries({ status });

    res.status(200).json({ deliveries, total });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/api/v1/admin/webhooks/deliveries/:id/retry', (req, res, next) => {
  try {
    webhookService.retryDelivery(req.params.id);
    res.status(200).json({ status: 'pending' });
  } catch (err) {
    next(err);
  }
});
