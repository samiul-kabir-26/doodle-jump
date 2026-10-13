import { Platform } from '../entities/platform.js';
import { Item } from '../entities/item.js';
import { Monster } from '../entities/monster.js';
import { BlackHole } from '../entities/blackHole.js';
import { getDifficulty } from './difficulty.js';
import { GAME_CONSTANTS } from '../../../shared/constants.js';

export class LevelGenerator {
  constructor(rng, gameplaySettings = {}) {
    this.rng = rng;
    this.gameplay = gameplaySettings;
    this.highestY = 0;
    this.lastBounceableY = 0;
  }

  reset() {
    this.highestY = 0;
    this.lastBounceableY = 0;
  }

  generateInitialPlatforms() {
    const platforms = [];

    // Starting platform under player feet
    const startPlat = new Platform({
      x: 151,
      y: 40,
      type: 'normal'
    });
    platforms.push(startPlat);
    this.highestY = 40;
    this.lastBounceableY = 40;

    // Generate initial screen of easy platforms
    while (this.highestY < 640) {
      const gap = 35 + this.rng.next() * 30;
      this.highestY += gap;
      const x = this.rng.next() * (GAME_CONSTANTS.LOGICAL_WIDTH - GAME_CONSTANTS.PLATFORM.WIDTH);
      platforms.push(new Platform({ x, y: this.highestY, type: 'normal' }));
      this.lastBounceableY = this.highestY;
    }

    return platforms;
  }

  generateChunk(targetTopY, currentScore, platforms, monsters, blackHoles) {
    const diffMultiplier = this.gameplay.difficultyMultiplier || 1.0;
    const powerupMultiplier = this.gameplay.powerupRateMultiplier || 1.0;
    const enabled = this.gameplay.enabled || {};

    while (this.highestY < targetTopY) {
      const diff = getDifficulty(currentScore, diffMultiplier);
      const gap = diff.minGap + this.rng.next() * (diff.maxGap - diff.minGap);
      const nextY = this.highestY + gap;
      const x = this.rng.next() * (GAME_CONSTANTS.LOGICAL_WIDTH - GAME_CONSTANTS.PLATFORM.WIDTH);

      // Pick platform type
      let type = 'normal';
      const roll = this.rng.next();
      const w = diff.weights;

      // Ensure last bounceable distance is respected
      const distFromLastBounceable = nextY - this.lastBounceableY;
      if (distFromLastBounceable >= diff.maxGap * 0.95) {
        type = 'normal';
      } else if (roll < w.moving) {
        type = 'moving';
      } else if (roll < w.moving + w.disappearing) {
        type = 'disappearing';
      } else if (currentScore > 12000 && roll < w.moving + w.disappearing + 0.1) {
        type = 'exploding';
      }

      const isVertical = type === 'moving' && currentScore > 6000 && this.rng.next() < 0.25;

      // Item roll
      let attachedItem = null;
      if (type === 'normal' || type === 'moving') {
        const itemRoll = this.rng.next();
        const r = GAME_CONSTANTS.ITEMS.RATES;

        if (enabled.spring !== false && itemRoll < r.SPRING * powerupMultiplier) {
          attachedItem = new Item({ type: 'spring' });
        } else if (enabled.trampoline !== false && itemRoll < (r.SPRING + r.TRAMPOLINE) * powerupMultiplier) {
          attachedItem = new Item({ type: 'trampoline' });
        } else if (enabled.propeller !== false && itemRoll < (r.SPRING + r.TRAMPOLINE + r.PROPELLER) * powerupMultiplier) {
          attachedItem = new Item({ type: 'propeller' });
        } else if (enabled.jetpack !== false && itemRoll < (r.SPRING + r.TRAMPOLINE + r.PROPELLER + r.JETPACK) * powerupMultiplier) {
          attachedItem = new Item({ type: 'jetpack' });
        } else if (enabled.springShoes !== false && itemRoll < (r.SPRING + r.TRAMPOLINE + r.PROPELLER + r.JETPACK + r.SPRING_SHOES) * powerupMultiplier) {
          attachedItem = new Item({ type: 'spring_shoes' });
        }
      }

      const platform = new Platform({
        x,
        y: nextY,
        type,
        verticalMoving: isVertical,
        item: attachedItem
      });

      platforms.push(platform);
      this.highestY = nextY;
      if (type !== 'breakable') {
        this.lastBounceableY = nextY;
      }

      // Decorative extra breakable platform
      if (this.rng.next() < diff.weights.breakableExtra) {
        const breakX = this.rng.next() * (GAME_CONSTANTS.LOGICAL_WIDTH - GAME_CONSTANTS.PLATFORM.WIDTH);
        const breakY = nextY - gap * 0.5;
        platforms.push(new Platform({ x: breakX, y: breakY, type: 'breakable' }));
      }

      // Hazards spawn
      if (diff.hazards.length > 0 && this.rng.next() < 0.05 * diffMultiplier) {
        const hazardType = this.rng.choice(diff.hazards);
        // Guarantee safe path: don't spawn directly in front of the platform
        let hx = (x + 180) % (GAME_CONSTANTS.LOGICAL_WIDTH - 60);
        const hy = nextY + gap * 0.4;

        if (hazardType === 'black_hole') {
          if (enabled.blackHoles !== false) {
            blackHoles.push(new BlackHole({ x: hx, y: hy }));
          }
        } else if (enabled.monsters !== false) {
          monsters.push(new Monster({ type: hazardType, x: hx, y: hy }));
        }
      }
    }
  }
}
