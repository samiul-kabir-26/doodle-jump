import { GAME_CONSTANTS } from '../../../shared/constants.js';

export class Player {
  constructor(startX = 150, startY = 80) {
    this.width = GAME_CONSTANTS.PLAYER.WIDTH;
    this.height = GAME_CONSTANTS.PLAYER.HEIGHT;
    this.x = startX;
    this.y = startY;
    this.prevY = startY;

    this.vx = 0;
    this.vy = 0;

    this.facing = 'right'; // 'left' | 'right'
    this.shootTimer = 0;
    this.squashTimer = 0;
    this.spinAngle = 0; // For trampoline

    // Power-up state
    this.activePowerup = null; // 'propeller' | 'jetpack'
    this.powerupTimer = 0;
    this.springShoesRemaining = 0;
    this.shieldTimer = 0;

    this.dead = false;
    this.deathReason = null;
  }

  reset(startX = 150, startY = 80) {
    this.x = startX;
    this.y = startY;
    this.prevY = startY;
    this.vx = 0;
    this.vy = GAME_CONSTANTS.PLAYER.JUMP_VELOCITY;
    this.facing = 'right';
    this.shootTimer = 0;
    this.squashTimer = 0;
    this.spinAngle = 0;
    this.activePowerup = null;
    this.powerupTimer = 0;
    this.springShoesRemaining = 0;
    this.shieldTimer = 0;
    this.dead = false;
    this.deathReason = null;
  }

  isImmune() {
    return this.activePowerup === 'propeller' ||
      this.activePowerup === 'jetpack' ||
      this.shieldTimer > 0;
  }

  triggerShoot() {
    this.shootTimer = GAME_CONSTANTS.PLAYER.SHOOT_DISPLAY_TIME;
  }

  bounce(customVelocity = null) {
    let vel = customVelocity || GAME_CONSTANTS.PLAYER.JUMP_VELOCITY;

    // Check spring shoes
    if (!customVelocity && this.springShoesRemaining > 0) {
      vel *= GAME_CONSTANTS.ITEMS.SPRING_SHOES_MULTIPLIER;
      this.springShoesRemaining--;
    }

    this.vy = vel;
    this.squashTimer = GAME_CONSTANTS.PLAYER.SQUASH_DURATION;
  }

  triggerSpring() {
    this.bounce(GAME_CONSTANTS.ITEMS.SPRING_VELOCITY);
  }

  triggerTrampoline() {
    this.bounce(GAME_CONSTANTS.ITEMS.TRAMPOLINE_VELOCITY);
    this.spinAngle = Math.PI * 2;
  }

  triggerPropeller() {
    if (this.activePowerup) return;
    this.activePowerup = 'propeller';
    this.powerupTimer = GAME_CONSTANTS.ITEMS.PROPELLER_DURATION;
    this.vy = GAME_CONSTANTS.ITEMS.PROPELLER_VELOCITY;
  }

  triggerJetpack() {
    if (this.activePowerup) return;
    this.activePowerup = 'jetpack';
    this.powerupTimer = GAME_CONSTANTS.ITEMS.JETPACK_DURATION;
    this.vy = 400; // Starts and ramps up
  }

  triggerSpringShoes() {
    this.springShoesRemaining = GAME_CONSTANTS.ITEMS.SPRING_SHOES_BOUNCES;
  }

  triggerShield() {
    this.shieldTimer = GAME_CONSTANTS.ITEMS.SHIELD_DURATION;
  }

  update(dt, inputAxis) {
    this.prevY = this.y;

    // 1. Horizontal movement
    if (inputAxis !== 0) {
      this.vx += inputAxis * GAME_CONSTANTS.PLAYER.HORIZ_ACCEL * dt;
      if (Math.abs(this.vx) > GAME_CONSTANTS.PLAYER.HORIZ_MAX_SPEED) {
        this.vx = Math.sign(this.vx) * GAME_CONSTANTS.PLAYER.HORIZ_MAX_SPEED;
      }
      this.facing = inputAxis < 0 ? 'left' : 'right';
    } else {
      // Decelerate
      if (Math.abs(this.vx) > 0) {
        const decel = GAME_CONSTANTS.PLAYER.HORIZ_DECEL * dt;
        if (Math.abs(this.vx) <= decel) {
          this.vx = 0;
        } else {
          this.vx -= Math.sign(this.vx) * decel;
        }
      }
    }

    this.x += this.vx * dt;

    // Screen wrapping (centre crossing screen edges)
    const centreX = this.x + this.width / 2;
    if (centreX < 0) {
      this.x = GAME_CONSTANTS.LOGICAL_WIDTH - this.width / 2;
    } else if (centreX > GAME_CONSTANTS.LOGICAL_WIDTH) {
      this.x = -this.width / 2;
    }

    // 2. Vertical movement & power-up handling
    if (this.activePowerup === 'propeller') {
      this.vy = GAME_CONSTANTS.ITEMS.PROPELLER_VELOCITY;
      this.y += this.vy * dt;
      this.powerupTimer -= dt;
      if (this.powerupTimer <= 0) {
        this.activePowerup = null;
      }
    } else if (this.activePowerup === 'jetpack') {
      // Ramp up
      if (this.vy < GAME_CONSTANTS.ITEMS.JETPACK_RAMP_VELOCITY) {
        this.vy += 600 * dt;
      }
      this.y += this.vy * dt;
      this.powerupTimer -= dt;
      if (this.powerupTimer <= 0) {
        this.activePowerup = null;
      }
    } else {
      // Midpoint gravity integration
      const halfGravityStep = 0.5 * GAME_CONSTANTS.PLAYER.GRAVITY * dt;
      const effectiveVy = this.vy - halfGravityStep;
      this.y += effectiveVy * dt;

      this.vy -= GAME_CONSTANTS.PLAYER.GRAVITY * dt;
      if (this.vy < -GAME_CONSTANTS.PLAYER.MAX_FALL_SPEED) {
        this.vy = -GAME_CONSTANTS.PLAYER.MAX_FALL_SPEED;
      }
    }

    // Timers
    if (this.shootTimer > 0) this.shootTimer -= dt;
    if (this.squashTimer > 0) this.squashTimer -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.spinAngle > 0) {
      this.spinAngle -= Math.PI * 4 * dt;
      if (this.spinAngle < 0) this.spinAngle = 0;
    }
  }

  render(ctx, camera, assetManager) {
    const screenX = this.x;
    const screenY = camera.toScreenY(this.y + this.height);

    ctx.save();

    // Trampoline spin
    if (this.spinAngle > 0) {
      ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
      ctx.rotate(this.spinAngle);
      ctx.translate(-(screenX + this.width / 2), -(screenY + this.height / 2));
    }

    // Squash effect
    const squashScaleY = this.squashTimer > 0 ? 0.85 : 1;
    const spriteSlot = this.shootTimer > 0
      ? 'player.shoot'
      : (this.facing === 'left' ? 'player.left' : 'player.right');

    assetManager.drawSprite(ctx, spriteSlot, screenX, screenY, this.width, this.height, {
      scale: 1,
      offsetY: this.squashTimer > 0 ? 5 : 0
    });

    // Overlays
    if (this.activePowerup === 'propeller') {
      assetManager.drawSprite(ctx, 'player.propeller', screenX + 10, screenY - 14, 40, 25);
    } else if (this.activePowerup === 'jetpack') {
      const offsetX = this.facing === 'left' ? 24 : -4;
      assetManager.drawSprite(ctx, 'player.jetpack', screenX + offsetX, screenY + 8, 30, 40);
    }

    if (this.springShoesRemaining > 0) {
      assetManager.drawSprite(ctx, 'player.spring_shoes', screenX + 10, screenY + 44, 40, 20);
    }

    if (this.shieldTimer > 0) {
      assetManager.drawSprite(ctx, 'item.shield', screenX + 6, screenY + 6, 48, 48, { alpha: 0.8 });
    }

    ctx.restore();
  }
}
