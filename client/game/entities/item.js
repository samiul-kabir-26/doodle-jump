export class Item {
  constructor({ type, x = 0, y = 0 }) {
    this.type = type; // 'spring' | 'trampoline' | 'propeller' | 'jetpack' | 'spring_shoes' | 'shield'
    this.x = x;
    this.y = y;
    this.used = false;

    // Dimensions
    if (type === 'spring') {
      this.width = 20;
      this.height = 16;
    } else if (type === 'trampoline') {
      this.width = 32;
      this.height = 14;
    } else if (type === 'propeller') {
      this.width = 28;
      this.height = 20;
    } else if (type === 'jetpack') {
      this.width = 24;
      this.height = 30;
    } else if (type === 'spring_shoes') {
      this.width = 30;
      this.height = 18;
    } else if (type === 'shield') {
      this.width = 28;
      this.height = 28;
    } else {
      this.width = 20;
      this.height = 20;
    }
  }

  update(dt) {}

  render(ctx, camera, assetManager) {
    const screenX = this.x;
    const screenY = camera.toScreenY(this.y + this.height);

    let slot = `item.${this.type}`;
    if (this.type === 'spring' && this.used) {
      slot = 'item.spring_used';
    }

    assetManager.drawSprite(ctx, slot, screenX, screenY, this.width, this.height);
  }
}
