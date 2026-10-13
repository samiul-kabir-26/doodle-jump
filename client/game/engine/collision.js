import { GAME_CONSTANTS } from '../../../shared/constants.js';

export const collision = {
  // Swept test for falling player feet vs platform top
  checkFeetPlatformLanding(player, platform) {
    // Only land when falling
    if (player.vy > 0) return false;

    const feetWidth = GAME_CONSTANTS.PLAYER.FEET_WIDTH; // 28
    const feetLeft = player.x + (GAME_CONSTANTS.PLAYER.WIDTH - feetWidth) / 2;
    const feetRight = feetLeft + feetWidth;

    const platLeft = platform.x;
    const platRight = platform.x + platform.width;

    // Horizontal overlap check (>= 1 px)
    const hasHorizontalOverlap = feetRight >= platLeft + 1 && feetLeft <= platRight - 1;
    if (!hasHorizontalOverlap) return false;

    const platTop = platform.y + platform.height;
    const prevFeetY = player.prevY;
    const currFeetY = player.y;

    // Swept vertical check: feet crossed or touched platform top
    // Tolerances handle discreet time steps without tunnelling
    const crossedTop = prevFeetY >= platTop - 4 && currFeetY <= platTop + 8;
    return crossedTop;
  },

  // Box vs Box AABB overlap
  checkAABB(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  },

  // Player body hitbox vs hazard/item
  checkPlayerOverlap(player, entity) {
    const hitboxWidth = GAME_CONSTANTS.PLAYER.HITBOX_WIDTH; // 36
    const hitboxHeight = GAME_CONSTANTS.PLAYER.HITBOX_HEIGHT; // 50
    const playerHitbox = {
      x: player.x + (GAME_CONSTANTS.PLAYER.WIDTH - hitboxWidth) / 2,
      y: player.y,
      width: hitboxWidth,
      height: hitboxHeight
    };
    return this.checkAABB(playerHitbox, entity);
  },

  // Stomp check vs monster (landing on monster from above while falling)
  checkMonsterStomp(player, monster) {
    if (player.vy > 0) return false;

    const feetWidth = GAME_CONSTANTS.PLAYER.FEET_WIDTH;
    const feetLeft = player.x + (GAME_CONSTANTS.PLAYER.WIDTH - feetWidth) / 2;
    const feetRight = feetLeft + feetWidth;

    const hasHorizontalOverlap = feetRight >= monster.x && feetLeft <= monster.x + monster.width;
    if (!hasHorizontalOverlap) return false;

    const monsterTop = monster.y + monster.height;
    const crossedTop = player.prevY >= monsterTop - 6 && player.y <= monsterTop + 12;
    return crossedTop;
  },

  // Circle / Radial distance overlap (e.g. black hole)
  checkCircleOverlap(c1, c2) {
    const dx = (c1.x + c1.radius) - (c2.x + c2.radius);
    const dy = (c1.y + c1.radius) - (c2.y + c2.radius);
    const distSq = dx * dx + dy * dy;
    const radSum = c1.radius + c2.radius;
    return distSq <= radSum * radSum;
  }
};
