import { GAME_CONSTANTS } from '../../../shared/constants.js';

export class BlackHole {
  constructor({ x, y }) {
    this.x = x;
    this.y = y;
    this.radius = GAME_CONSTANTS.HAZARDS.BLACK_HOLE_RADIUS; // 24
    this.pullRadius = GAME_CONSTANTS.HAZARDS.BLACK_HOLE_PULL_RADIUS; // 48
    this.width = this.radius * 2;
    this.height = this.radius * 2;
    this.rotation = 0;
  }

  update(dt) {
    this.rotation += dt * 3;
  }

  render(ctx, camera, assetManager) {
    const screenX = this.x;
    const screenY = camera.toScreenY(this.y + this.height);

    ctx.save();
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    ctx.rotate(this.rotation);
    ctx.translate(-(screenX + this.width / 2), -(screenY + this.height / 2));

    assetManager.drawSprite(ctx, 'hazard.black_hole', screenX, screenY, this.width, this.height);

    ctx.restore();
  }
}
