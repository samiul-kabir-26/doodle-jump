// Shared constants across client and server

export const GAME_CONSTANTS = {
  LOGICAL_WIDTH: 360,
  LOGICAL_HEIGHT: 640,
  FIXED_TIMESTEP: 1 / 60, // 60 Hz simulation step

  // Player
  PLAYER: {
    WIDTH: 60,
    HEIGHT: 60,
    HITBOX_WIDTH: 36,
    HITBOX_HEIGHT: 50,
    FEET_WIDTH: 28,
    FEET_HEIGHT: 6,
    GRAVITY: 1300,
    JUMP_VELOCITY: 640,
    MAX_FALL_SPEED: 900,
    HORIZ_MAX_SPEED: 330,
    HORIZ_ACCEL: 2200,
    HORIZ_DECEL: 1800,
    SQUASH_DURATION: 0.08, // 80 ms
    SHOOT_DISPLAY_TIME: 0.2 // 200 ms
  },

  // Camera
  CAMERA: {
    FOLLOW_THRESHOLD_Y: 640 * 0.45, // 288 px from bottom
    DESPAWN_OFFSET: 50
  },

  // Platforms
  PLATFORM: {
    WIDTH: 58,
    HEIGHT: 15,
    SPRITE_WIDTH: 64,
    SPRITE_HEIGHT: 18,
    NORMAL_APEX: 157.4, // (640^2) / (2 * 1300) ≈ 157.5 px
    MAX_GAP: 133, // 0.85 * normal apex
    MIN_GAP: 25,
    BREAK_FALL_SPEED: 400,
    FADE_DURATION: 0.15, // 150 ms
    EXPLODE_WARNING_TIME: 2.0,
    EXPLODE_TIME: 3.5
  },

  // Items / Powerups
  ITEMS: {
    SPRING_VELOCITY: 1050, // apex ≈ 424 px
    TRAMPOLINE_VELOCITY: 1200,
    PROPELLER_VELOCITY: 520,
    PROPELLER_DURATION: 3.0,
    JETPACK_RAMP_VELOCITY: 950,
    JETPACK_DURATION: 3.5,
    SPRING_SHOES_BOUNCES: 5,
    SPRING_SHOES_MULTIPLIER: 1.5,
    SHIELD_DURATION: 8.0,

    // Spawn rates per platform after score 300
    RATES: {
      SPRING: 0.06,
      TRAMPOLINE: 0.015,
      PROPELLER: 0.012,
      JETPACK: 0.006,
      SPRING_SHOES: 0.01
    }
  },

  // Hazards
  HAZARDS: {
    MONSTER_WIDTH: 50,
    MONSTER_HEIGHT: 40,
    BIG_MONSTER_WIDTH: 70,
    BIG_MONSTER_HEIGHT: 55,
    BLACK_HOLE_RADIUS: 24,
    BLACK_HOLE_PULL_RADIUS: 48,
    UFO_WIDTH: 60,
    UFO_HEIGHT: 40
  },

  // Projectiles
  PROJECTILE: {
    WIDTH: 10,
    HEIGHT: 10,
    SPEED: 900,
    MAX_ACTIVE: 3,
    COOLDOWN: 0.15, // 150 ms
    MAX_AIM_ANGLE: Math.PI / 3 // 60 degrees from vertical
  },

  // Milestones
  MILESTONES: [1000, 5000, 10000, 25000, 50000, 100000],

  // Anti-cheat defaults
  ANTI_CHEAT: {
    MIN_DURATION_MS: 3000,
    MAX_SESSION_AGE_MS: 2 * 60 * 60 * 1000, // 2 hours
    DEFAULT_MAX_SCORE_RATE: 450
  }
};

// Difficulty bands (GAME_DESIGN.md §10)
export const DIFFICULTY_BANDS = [
  {
    maxScore: 500,
    minGap: 25,
    maxGap: 60,
    weights: { normal: 1.0, moving: 0, breakableExtra: 0.1, disappearing: 0 },
    hazards: []
  },
  {
    maxScore: 2000,
    minGap: 35,
    maxGap: 75,
    weights: { normal: 0.8, moving: 0.2, breakableExtra: 0.15, disappearing: 0 },
    hazards: []
  },
  {
    maxScore: 5000,
    minGap: 45,
    maxGap: 90,
    weights: { normal: 0.65, moving: 0.3, breakableExtra: 0.2, disappearing: 0.05 },
    hazards: ['basic']
  },
  {
    maxScore: 10000,
    minGap: 55,
    maxGap: 105,
    weights: { normal: 0.5, moving: 0.35, breakableExtra: 0.25, disappearing: 0.15 },
    hazards: ['basic', 'flyer']
  },
  {
    maxScore: 20000,
    minGap: 70,
    maxGap: 120,
    weights: { normal: 0.4, moving: 0.4, breakableExtra: 0.3, disappearing: 0.2 },
    hazards: ['basic', 'flyer', 'big', 'black_hole']
  },
  {
    maxScore: Infinity,
    minGap: 85,
    maxGap: 133,
    weights: { normal: 0.3, moving: 0.45, breakableExtra: 0.3, disappearing: 0.25 },
    hazards: ['basic', 'flyer', 'big', 'black_hole', 'ufo']
  }
];

export function calculateScore(maxHeight) {
  return Math.floor(Math.max(0, maxHeight) / 2);
}
