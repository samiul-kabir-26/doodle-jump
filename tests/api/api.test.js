import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';
import { runMigrations } from '../../server/db/migrate.js';
import { env } from '../../server/config/env.js';

let app;

beforeAll(() => {
  runMigrations();
  app = createApp();
});

describe('Public Game API', () => {
  it('GET /health returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /ready returns 200 ok', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/config returns published theme and gameplay', async () => {
    const res = await request(app).get('/api/v1/config');
    expect(res.status).toBe(200);
    expect(res.body.theme).toBeDefined();
    expect(res.body.gameplay).toBeDefined();
    expect(res.headers.etag).toBeDefined();
  });

  let playerToken;
  let playerId;

  it('POST /api/v1/players/identify identifies player with nickname', async () => {
    const res = await request(app)
      .post('/api/v1/players/identify')
      .send({ nickname: 'HeroJumper', deviceId: 'dev_test_123' });

    expect(res.status).toBe(200);
    expect(res.body.playerToken).toBeDefined();
    expect(res.body.player.displayName).toBe('HeroJumper');

    playerToken = res.body.playerToken;
    playerId = res.body.player.id;
  });

  let sessionId;

  it('POST /api/v1/sessions creates a session with seed', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ client: { input: 'touch' } });

    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeDefined();
    expect(typeof res.body.seed).toBe('number');

    sessionId = res.body.sessionId;
  });

  it('POST /api/v1/sessions/:sessionId/events records client events', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${sessionId}/events`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        events: [
          {
            clientEventId: 'evt_c_1',
            type: 'powerup.collected',
            clientTs: 1200,
            data: { kind: 'spring_shoes', height: 1500 }
          }
        ]
      });

    expect(res.status).toBe(202);
    expect(res.body.accepted).toBe(1);
  });

  it('POST /api/v1/sessions/:sessionId/end accepts valid run and awards rank', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        score: 5000,
        maxHeight: 10000,
        durationMs: 45000,
        reason: 'fell',
        stats: { platformsLanded: 120, shotsFired: 10 }
      });

    expect(res.status).toBe(200);
    expect(res.body.accepted).toBe(true);
    expect(res.body.personalBest.score).toBe(5000);
    expect(res.body.rank).toBeDefined();
    expect(res.body.milestones).toContain(1000);
    expect(res.body.milestones).toContain(5000);
  });

  it('POST /api/v1/sessions/:sessionId/end is idempotent on repeat', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        score: 5000,
        maxHeight: 10000,
        durationMs: 45000,
        reason: 'fell'
      });

    expect(res.status).toBe(200);
    expect(res.body.accepted).toBe(true);
  });

  it('GET /api/v1/leaderboard returns ranked entry', async () => {
    const res = await request(app).get('/api/v1/leaderboard?period=all');
    expect(res.status).toBe(200);
    expect(res.body.entries.length).toBeGreaterThanOrEqual(1);
    expect(res.body.entries[0].score).toBe(5000);
  });

  it('GET /api/v1/leaderboard/me returns personal rank', async () => {
    const res = await request(app)
      .get('/api/v1/leaderboard/me?period=all')
      .set('Authorization', `Bearer ${playerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(5000);
    expect(res.body.rank).toBe(1);
  });
});

describe('Integration API', () => {
  it('rejects requests without API key', async () => {
    const res = await request(app).get('/api/v1/events');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/events with API key returns event stream', async () => {
    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${env.INTEGRATION_API_KEY}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.events.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/event-types is public and returns catalog', async () => {
    const res = await request(app).get('/api/v1/event-types');
    expect(res.status).toBe(200);
    expect(res.body.eventTypes['score.accepted']).toBeDefined();
  });
});

describe('Admin API', () => {
  let adminCookie;

  it('POST /api/v1/admin/login sets httpOnly cookie on correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/admin/login')
      .send({
        username: env.ADMIN_USERNAME,
        password: env.ADMIN_PASSWORD
      });

    expect(res.status).toBe(204);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    adminCookie = cookies[0];
  });

  it('GET /api/v1/admin/dashboard returns metrics with cookie', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.runs).toBeGreaterThanOrEqual(1);
    expect(res.body.uniquePlayers).toBeGreaterThanOrEqual(1);
  });

  it('requires X-Requested-With: dj-admin on mutating admin requests', async () => {
    const res = await request(app)
      .post('/api/v1/admin/theme/publish')
      .set('Cookie', adminCookie)
      .send({ note: 'Test' });

    expect(res.status).toBe(403);
  });

  it('POST /api/v1/admin/theme/publish publishes new version with CSRF header', async () => {
    const res = await request(app)
      .post('/api/v1/admin/theme/publish')
      .set('Cookie', adminCookie)
      .set('X-Requested-With', 'dj-admin')
      .send({ note: 'First release' });

    expect(res.status).toBe(201);
    expect(res.body.version).toBeGreaterThanOrEqual(1);
  });
});
