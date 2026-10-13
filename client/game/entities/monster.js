import { GAME_CONSTANTS } from '../../../shared/constants.js';

export class Monster {
  constructor({ type = 'basic', x, y }) {
    this.type = type; // 'basic' | 'flyer' | 'big' | 'ufo'
    this.x = x;
    this.y = y;
    this.startY = y;
    this.startX = x;

    if (type === 'big') {
      this.width = GAME_CONSTANTS.HAZARDS.BIG_MONSTER_WIDTH; // 70
      this.height = GAME_CONSTANTS.HAZARDS.BIG_MONSTER_HEIGHT; // 55
      this.hitsLeft = 2;
    } else if (type === 'ufo') {
      this.width = GAME_CONSTANTS.HAZARDS.UFO_WIDTH; // 60
      this.height = GAME_CONSTANTS.HAZARDS.UFO_HEIGHT; // 40
      this.hitsLeft = 1;
    } else {
      this.width = GAME_CONSTANTS.HAZARDS.MONSTER_WIDTH; // 50
      this.height = GAME_CONSTANTS.HAZARDS.MONSTER_HEIGHT; // 40
      this.hitsLeft = 1;
    }

    this.dead = false;
    this.time = 0;
    this.moveDir = 1;
    this.moveSpeed = 60;
  }

  takeDamage() {
    this.hitsLeft--;
    if (this.hitsLeft <= 0) {
      this.dead = true;
      return true; // Monster killed
    }
    return false;
  }

  update(dt) {
    if (this.dead) return;
    this.time += dt;

    if (this.type === 'basic') {
      // Small vertical wobble
      this.y = this.startY + Math.sin(this.time * 3) * 6;
    } else if (this.type === 'flyer') {
      // Horizontal patrol
      this.x += this.moveDir * this.moveSpeed * dt;
      if (this.x <= 20) {
        this.x = 20;
        this.moveDir = 1;
      } else if (this.x + this.width >= GAME_CONSTANTS.LOGICAL_WIDTH - 20) {
        this.x = GAME_CONSTANTS.LOGICAL_WIDTH - 20 - this.width;
        this.moveDir = -1;
      }
      this.y = this.startY + Math.sin(this.time * 4) * 8;
    } else if (this.type === 'ufo') {
      this.x = this.startX + Math.sin(this.time * 2) * 40;
    }
  }

  render(ctx, camera, assetManager) {
    if (this.dead) return;

    const screenX = this.x;
    const screenY = camera.toScreenY(this.y + this.height);

    let slot = 'monster.basic';
    if (this.type === 'flyer') slot = 'monster.flyer';
    else if (this.type === 'big') slot = 'monster.big';
    else if (this.type === 'ufo') slot = 'hazard.ufo';

    assetManager.drawSprite(ctx, slot, screenX, screenY, this.width, this.height);
  }
}
