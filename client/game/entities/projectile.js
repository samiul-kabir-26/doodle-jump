import { GAME_CONSTANTS } from '../../../shared/constants.js';

export class Projectile {
  constructor({ x, y, angle = 0 }) {
    this.x = x;
    this.y = y;
    this.width = GAME_CONSTANTS.PROJECTILE.WIDTH;
    this.height = GAME_CONSTANTS.PROJECTILE.HEIGHT;

    // Angle: 0 is straight UP, positive is right, negative is left
    // Clamped to ±60 deg (PI / 3)
    const clampedAngle = Math.max(
      -GAME_CONSTANTS.PROJECTILE.MAX_AIM_ANGLE,
      Math.min(GAME_CONSTANTS.PROJECTILE.MAX_AIM_ANGLE, angle)
    );

    this.vx = Math.sin(clampedAngle) * GAME_CONSTANTS.PROJECTILE.SPEED;
    this.vy = Math.cos(clampedAngle) * GAME_CONSTANTS.PROJECTILE.SPEED;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Off screen check
    if (this.x < -20 || this.x > GAME_CONSTANTS.LOGICAL_WIDTH + 20) {
      this.dead = true;
    }
  }

  render(ctx, camera, assetManager) {
    if (this.dead) return;
    const screenX = this.x;
    const screenY = camera.toScreenY(this.y + this.height);
    assetManager.drawSprite(ctx, 'projectile', screenX, screenY, this.width, this.height);
  }
}
