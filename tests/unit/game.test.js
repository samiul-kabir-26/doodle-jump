import { describe, it, expect } from 'vitest';
import { GAME_CONSTANTS, calculateScore } from '../../shared/constants.js';
import { Player } from '../../client/game/entities/player.js';
import { Platform } from '../../client/game/entities/platform.js';
import { collision } from '../../client/game/engine/collision.js';
import { createRNG } from '../../client/game/engine/rng.js';
import { LevelGenerator } from '../../client/game/world/generator.js';

describe('Game Physics & Mechanics', () => {
  it('calculates score as floor(maxHeight / 2)', () => {
    expect(calculateScore(0)).toBe(0);
    expect(calculateScore(1)).toBe(0);
    expect(calculateScore(2)).toBe(1);
    expect(calculateScore(24900)).toBe(12450);
  });

  it('normal jump reaches apex ≈ 157 px at 60 Hz simulation step', () => {
    const player = new Player(150, 0);
    player.bounce(); // normal jump velocity 640

    const dt = 1 / 60;
    let maxY = 0;

    // Simulate jump until player starts falling
    while (player.vy > 0) {
      player.update(dt, 0);
      if (player.y > maxY) maxY = player.y;
    }

    // Apex should be close to v^2 / (2 * g) = 640^2 / (2 * 1300) ≈ 157.5
    expect(maxY).toBeGreaterThanOrEqual(155);
    expect(maxY).toBeLessThanOrEqual(160);
  });

  it('spring jump reaches apex ≈ 424 px at 60 Hz simulation step', () => {
    const player = new Player(150, 0);
    player.triggerSpring(); // spring velocity 1050

    const dt = 1 / 60;
    let maxY = 0;

    while (player.vy > 0) {
      player.update(dt, 0);
      if (player.y > maxY) maxY = player.y;
    }

    // Apex: 1050^2 / (2 * 1300) ≈ 424
    expect(maxY).toBeGreaterThanOrEqual(420);
    expect(maxY).toBeLessThanOrEqual(430);
  });

  it('screen wrap works symmetrically on left and right edges', () => {
    const player = new Player(0, 100);

    // Move left past 0
    player.x = -player.width / 2 - 1;
    player.update(1 / 60, -1);
    expect(player.x).toBeGreaterThan(GAME_CONSTANTS.LOGICAL_WIDTH / 2);

    // Move right past LOGICAL_WIDTH
    player.x = GAME_CONSTANTS.LOGICAL_WIDTH + player.width / 2 + 1;
    player.update(1 / 60, 1);
    expect(player.x).toBeLessThan(GAME_CONSTANTS.LOGICAL_WIDTH / 2);
  });

  it('player lands on platform only when falling and passing platform top', () => {
    const player = new Player(150, 100);
    const platform = new Platform({ x: 140, y: 50, type: 'normal' });

    // 1. Moving upward through platform -> should NOT land
    player.vy = 500;
    player.prevY = 40;
    player.y = 60;
    expect(collision.checkFeetPlatformLanding(player, platform)).toBe(false);

    // 2. Falling from above platform top -> SHOULD land
    player.vy = -300;
    player.prevY = 70;
    player.y = 62; // platform top is 50 + 15 = 65
    expect(collision.checkFeetPlatformLanding(player, platform)).toBe(true);
  });

  it('breakable platform gives no bounce and triggers break', () => {
    const platform = new Platform({ x: 100, y: 100, type: 'breakable' });
    const bounced = platform.onLand();
    expect(bounced).toBe(false);
    expect(platform.broken).toBe(true);
  });
});

describe('Level Generator Reachability', () => {
  it('guarantees reachability over 100 distinct random seeds', () => {
    for (let s = 1; s <= 100; s++) {
      const rng = createRNG(s * 1013);
      const generator = new LevelGenerator(rng, { difficultyMultiplier: 1.0 });
      const platforms = generator.generateInitialPlatforms();
      const monsters = [];
      const blackHoles = [];

      generator.generateChunk(10000, 5000, platforms, monsters, blackHoles);

      // Verify that every consecutive bounceable platform gap <= maxGap (133 px)
      const bounceable = platforms.filter((p) => p.type !== 'breakable');
      for (let i = 1; i < bounceable.length; i++) {
        const gap = bounceable[i].y - bounceable[i - 1].y;
        expect(gap).toBeLessThanOrEqual(GAME_CONSTANTS.PLATFORM.MAX_GAP + 2);
      }
    }
  });
});
