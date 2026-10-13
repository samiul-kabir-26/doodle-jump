import { GAME_CONSTANTS } from '../../../shared/constants.js';

export class Camera {
  constructor() {
    this.y = 0;
    this.maxHeight = 0;
    this.viewportWidth = GAME_CONSTANTS.LOGICAL_WIDTH;
    this.viewportHeight = GAME_CONSTANTS.LOGICAL_HEIGHT;
    this.followThreshold = GAME_CONSTANTS.CAMERA.FOLLOW_THRESHOLD_Y; // 288 px
    this.fallingAnimActive = false;
    this.fallingSpeed = 0;
  }

  reset() {
    this.y = 0;
    this.maxHeight = 0;
    this.fallingAnimActive = false;
    this.fallingSpeed = 0;
  }

  update(playerY, dt) {
    if (this.fallingAnimActive) {
      this.y -= this.fallingSpeed * dt;
      return;
    }

    // Camera moves up when player exceeds 45% threshold
    const targetCameraY = playerY - this.followThreshold;
    if (targetCameraY > this.y) {
      this.y = targetCameraY;
    }

    if (playerY > this.maxHeight) {
      this.maxHeight = playerY;
    }
  }

  startFallingAnimation() {
    this.fallingAnimActive = true;
    this.fallingSpeed = 800; // Scrolls down quickly for death animation
  }

  toScreenY(worldY) {
    return this.viewportHeight - (worldY - this.y);
  }

  toWorldY(screenY) {
    return (this.viewportHeight - screenY) + this.y;
  }

  isBelowCamera(worldY, height = 0, offset = GAME_CONSTANTS.CAMERA.DESPAWN_OFFSET) {
    return (worldY + height) < (this.y - offset);
  }
}
