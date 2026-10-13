import { GAME_CONSTANTS } from '../../../shared/constants.js';

export class Platform {
  constructor({
    x,
    y,
    type = 'normal',
    movingSpeed = 80,
    verticalMoving = false,
    item = null
  }) {
    this.x = x;
    this.y = y;
    this.startY = y;
    this.width = GAME_CONSTANTS.PLATFORM.WIDTH; // 58
    this.height = GAME_CONSTANTS.PLATFORM.HEIGHT; // 15
    this.type = type; // 'normal' | 'moving' | 'breakable' | 'disappearing' | 'exploding'

    this.movingSpeed = movingSpeed;
    this.movingDir = 1; // 1 = right, -1 = left
    this.verticalMoving = verticalMoving;
    this.verticalOffset = 0;
    this.verticalTime = 0;

    this.item = item; // Spring, Trampoline, Propeller, etc.

    // State flags
    this.broken = false;
    this.brokenVy = 0;
    this.fading = false;
    this.fadeAlpha = 1;
    this.timeOnScreen = 0;
    this.exploded = false;
    this.hasBounced = false;
  }

  onLand() {
    if (this.type === 'breakable') {
      this.broken = true;
      this.brokenVy = -GAME_CONSTANTS.PLATFORM.BREAK_FALL_SPEED;
      return false; // Breakable gives NO bounce
    }

    if (this.type === 'disappearing') {
      this.fading = true;
      this.hasBounced = true;
      return true;
    }

    this.hasBounced = true;
    return true;
  }

  update(dt) {
    this.timeOnScreen += dt;

    // Moving horizontal
    if (this.type === 'moving' && !this.verticalMoving) {
      this.x += this.movingDir * this.movingSpeed * dt;
      if (this.x <= 0) {
        this.x = 0;
        this.movingDir = 1;
      } else if (this.x + this.width >= GAME_CONSTANTS.LOGICAL_WIDTH) {
        this.x = GAME_CONSTANTS.LOGICAL_WIDTH - this.width;
        this.movingDir = -1;
      }
    }

    // Moving vertical
    if (this.type === 'moving' && this.verticalMoving) {
      this.verticalTime += dt * 2;
      this.y = this.startY + Math.sin(this.verticalTime) * 40;
    }

    // Breakable falling
    if (this.broken) {
      this.brokenVy -= 1200 * dt;
      this.y += this.brokenVy * dt;
    }

    // Disappearing fade out
    if (this.fading) {
      this.fadeAlpha -= dt / GAME_CONSTANTS.PLATFORM.FADE_DURATION;
      if (this.fadeAlpha <= 0) {
        this.fadeAlpha = 0;
      }
    }

    // Exploding timer
    if (this.type === 'exploding' && this.timeOnScreen >= GAME_CONSTANTS.PLATFORM.EXPLODE_TIME) {
      this.exploded = true;
    }

    // Update attached item position if any
    if (this.item) {
      this.item.x = this.x + (this.width - this.item.width) / 2;
      this.item.y = this.y + this.height;
      this.item.update(dt);
    }
  }

  render(ctx, camera, assetManager) {
    if (this.exploded) return;
    if (this.fading && this.fadeAlpha <= 0) return;

    const screenX = this.x;
    const screenY = camera.toScreenY(this.y + this.height);

    ctx.save();
    if (this.fading) {
      ctx.globalAlpha = Math.max(0, this.fadeAlpha);
    }

    let slot = 'platform.normal';
    if (this.type === 'moving') {
      slot = 'platform.moving';
    } else if (this.type === 'breakable') {
      slot = this.broken ? 'platform.breakable_broken' : 'platform.breakable';
    } else if (this.type === 'disappearing') {
      slot = 'platform.disappearing';
    } else if (this.type === 'exploding') {
      slot = 'platform.exploding';
    }

    assetManager.drawSprite(ctx, slot, screenX - 3, screenY, 64, 18);

    ctx.restore();

    // Render attached item
    if (this.item && !this.broken) {
      this.item.render(ctx, camera, assetManager);
    }
  }
}
