import { describe, it, expect } from 'vitest';
import { getDayKey, getWeekKey } from '../../server/utils/dateKeys.js';
import { scoreService } from '../../server/services/score.service.js';
import { webhookService } from '../../server/services/webhook.service.js';
import { validateEventPayload } from '../../shared/eventTypes.js';
import { themeSchema, DEFAULT_THEME } from '../../shared/themeSchema.js';

describe('Server Date Keys & ISO Weeks', () => {
  it('formats UTC day keys as YYYY-MM-DD', () => {
    const d = new Date('2026-10-13T10:00:00Z');
    expect(getDayKey(d)).toBe('2026-10-13');
  });

  it('formats ISO week keys as YYYY-Www', () => {
    const d = new Date('2026-10-13T10:00:00Z');
    expect(getWeekKey(d)).toBe('2026-W42');
  });
});

describe('Anti-Cheat Score Validation', () => {
  const mockPlayer = { id: 'plr_1', banned_at: null };
  const mockSession = { id: 'ses_1', started_at: Date.now() - 60000 };

  it('accepts valid run within reasonable bounds', () => {
    const result = scoreService.validateRun(mockSession, mockPlayer, {
      score: 3000,
      maxHeight: 6000,
      durationMs: 40000
    });
    expect(result.valid).toBe(true);
  });

  it('rejects runs shorter than 3000 ms', () => {
    const result = scoreService.validateRun(mockSession, mockPlayer, {
      score: 500,
      maxHeight: 1000,
      durationMs: 2500
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('SESSION_TOO_SHORT');
  });

  it('rejects runs where score > floor(maxHeight / 2) + 1', () => {
    const result = scoreService.validateRun(mockSession, mockPlayer, {
      score: 5000,
      maxHeight: 2000,
      durationMs: 40000
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('SCORE_HEIGHT_MISMATCH');
  });

  it('rejects runs with impossible score rate (> 450 pts / s)', () => {
    const result = scoreService.validateRun(mockSession, mockPlayer, {
      score: 10000,
      maxHeight: 20000,
      durationMs: 10000 // 1000 pts/s
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('SCORE_RATE_EXCEEDED');
  });

  it('rejects runs by banned players', () => {
    const bannedPlayer = { id: 'plr_banned', banned_at: Date.now() };
    const result = scoreService.validateRun(mockSession, bannedPlayer, {
      score: 1000,
      maxHeight: 2000,
      durationMs: 20000
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('PLAYER_BANNED');
  });
});

describe('Webhook Signatures', () => {
  it('generates HMAC-SHA256 signature matching expected format', () => {
    const secret = 'test-secret';
    const body = '{"id":"evt_1"}';
    const t = 1760349782;
    const sig = webhookService.createSignature(secret, body, t);
    expect(sig).toMatch(/^t=1760349782,v1=[a-f0-9]{64}$/);
  });
});

describe('Event Schemas & Validation', () => {
  it('validates player.identified payload', () => {
    const valid = validateEventPayload('player.identified', { mode: 'host', isNew: true });
    expect(valid.mode).toBe('host');
    expect(valid.isNew).toBe(true);
  });

  it('validates game.started payload', () => {
    const valid = validateEventPayload('game.started', { seed: 12345, themeVersion: 1 });
    expect(valid.seed).toBe(12345);
  });

  it('validates score.accepted payload', () => {
    const valid = validateEventPayload('score.accepted', {
      scoreId: 'scr_1',
      score: 12450,
      maxHeight: 24900,
      durationMs: 182000
    });
    expect(valid.score).toBe(12450);
  });
});

describe('Theme Schema Validation', () => {
  it('validates default theme successfully', () => {
    const parsed = themeSchema.parse(DEFAULT_THEME);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.branding.title).toBe('Jumpy Doodle');
  });

  it('rejects external URLs in sprite slots', () => {
    expect(() => {
      themeSchema.parse({
        ...DEFAULT_THEME,
        sprites: {
          'player.left': { src: 'https://evil.com/doodler.png' }
        }
      });
    }).toThrow();
  });
});
