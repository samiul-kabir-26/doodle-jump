import { z } from 'zod';

export const EVENT_DEFINITIONS = {
  // Player
  'player.identified': {
    category: 'player',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      mode: z.enum(['host', 'anonymous']),
      isNew: z.boolean()
    })
  },

  // Gameplay
  'game.started': {
    category: 'gameplay',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      seed: z.number(),
      themeVersion: z.number(),
      client: z.object({
        version: z.string().optional(),
        input: z.string().optional()
      }).optional()
    })
  },
  'game.ended': {
    category: 'gameplay',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      score: z.number(),
      maxHeight: z.number(),
      durationMs: z.number(),
      reason: z.enum(['fell', 'monster', 'black_hole', 'quit', 'abandoned']),
      accepted: z.boolean(),
      stats: z.record(z.string(), z.any()).optional()
    })
  },
  'game.paused': {
    category: 'gameplay',
    trust: 'client',
    source: 'client',
    version: 1,
    schema: z.object({
      height: z.number(),
      cause: z.enum(['user', 'visibility'])
    })
  },
  'game.resumed': {
    category: 'gameplay',
    trust: 'client',
    source: 'client',
    version: 1,
    schema: z.object({
      height: z.number(),
      pausedMs: z.number()
    })
  },
  'powerup.collected': {
    category: 'gameplay',
    trust: 'client',
    source: 'client',
    version: 1,
    schema: z.object({
      kind: z.enum(['propeller', 'jetpack', 'spring_shoes', 'shield']),
      height: z.number()
    })
  },
  'monster.killed': {
    category: 'gameplay',
    trust: 'client',
    source: 'client',
    version: 1,
    schema: z.object({
      monster: z.enum(['basic', 'flyer', 'big', 'ufo']),
      method: z.enum(['stomp', 'shot']),
      height: z.number()
    })
  },
  'platform.broken': {
    category: 'gameplay',
    trust: 'client',
    source: 'client',
    version: 1,
    schema: z.object({
      height: z.number()
    })
  },
  'spring.used': {
    category: 'gameplay',
    trust: 'client',
    source: 'client',
    version: 1,
    schema: z.object({
      kind: z.enum(['spring', 'trampoline']),
      height: z.number()
    })
  },

  // Score
  'score.accepted': {
    category: 'score',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      scoreId: z.string(),
      score: z.number(),
      maxHeight: z.number(),
      durationMs: z.number()
    })
  },
  'score.rejected': {
    category: 'score',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      score: z.number(),
      reason: z.enum([
        'SESSION_TOO_SHORT',
        'SESSION_EXPIRED',
        'SCORE_HEIGHT_MISMATCH',
        'SCORE_RATE_EXCEEDED',
        'PLAYER_BANNED'
      ])
    })
  },
  'score.personal_best': {
    category: 'score',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      scoreId: z.string(),
      score: z.number(),
      previousBest: z.number().nullable()
    })
  },
  'milestone.reached': {
    category: 'score',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      milestone: z.number(),
      score: z.number()
    })
  },

  // Leaderboard
  'leaderboard.rank_changed': {
    category: 'leaderboard',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      period: z.enum(['daily', 'weekly', 'all']),
      previousRank: z.number().nullable(),
      rank: z.number(),
      score: z.number(),
      enteredTop: z.number().nullable().optional()
    })
  },

  // Admin
  'admin.login': {
    category: 'admin',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      username: z.string()
    })
  },
  'admin.login_failed': {
    category: 'admin',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      usernameAttempted: z.string()
    })
  },
  'admin.theme_published': {
    category: 'admin',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      version: z.number(),
      note: z.string().nullable().optional(),
      changedSlots: z.array(z.string()).optional()
    })
  },
  'admin.asset_uploaded': {
    category: 'admin',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      assetId: z.string(),
      mime: z.string(),
      bytes: z.number()
    })
  },
  'admin.asset_deleted': {
    category: 'admin',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      assetId: z.string()
    })
  },
  'admin.score_hidden': {
    category: 'admin',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      scoreId: z.string(),
      playerId: z.string(),
      reason: z.string().nullable().optional()
    })
  },
  'admin.score_restored': {
    category: 'admin',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      scoreId: z.string(),
      playerId: z.string()
    })
  },
  'admin.player_banned': {
    category: 'admin',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      playerId: z.string(),
      reason: z.string().nullable().optional()
    })
  },
  'admin.player_unbanned': {
    category: 'admin',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      playerId: z.string(),
      reason: z.string().nullable().optional()
    })
  },
  'admin.settings_updated': {
    category: 'admin',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      changedKeys: z.array(z.string())
    })
  },

  // System
  'system.webhook_test': {
    category: 'system',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      message: z.string().default('ping')
    })
  },
  'system.started': {
    category: 'system',
    trust: 'server',
    source: 'server',
    version: 1,
    schema: z.object({
      version: z.string(),
      commit: z.string().optional()
    })
  }
};

export function validateEventPayload(type, data) {
  const def = EVENT_DEFINITIONS[type];
  if (!def) {
    throw new Error(`Unknown event type: ${type}`);
  }
  return def.schema.parse(data);
}
