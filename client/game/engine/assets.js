import { DEFAULT_THEME } from '../../../shared/themeSchema.js';

export class AssetManager {
  constructor() {
    this.images = new Map();
    this.theme = DEFAULT_THEME;
    this.loadedCount = 0;
    this.totalCount = 0;
  }

  setTheme(theme) {
    this.theme = theme || DEFAULT_THEME;
  }

  getSlotConfig(slot) {
    if (this.theme.sprites && this.theme.sprites[slot]) {
      return this.theme.sprites[slot];
    }
    if (DEFAULT_THEME.sprites && DEFAULT_THEME.sprites[slot]) {
      return DEFAULT_THEME.sprites[slot];
    }
    return null;
  }

  async preload(onProgress = null) {
    const slots = Object.keys({
      ...DEFAULT_THEME.sprites,
      ...(this.theme.sprites || {})
    });

    this.totalCount = slots.length;
    this.loadedCount = 0;

    const promises = slots.map(async (slot) => {
      const config = this.getSlotConfig(slot);
      if (!config?.src) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve) => {
        img.onload = () => {
          this.images.set(slot, img);
          this.loadedCount++;
          if (onProgress) onProgress(this.loadedCount / this.totalCount);
          resolve();
        };
        img.onerror = () => {
          // Fallback to default if custom src failed
          const fallbackSrc = DEFAULT_THEME.sprites[slot]?.src;
          if (fallbackSrc && fallbackSrc !== config.src) {
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              this.images.set(slot, fallbackImg);
              this.loadedCount++;
              if (onProgress) onProgress(this.loadedCount / this.totalCount);
              resolve();
            };
            fallbackImg.onerror = () => resolve();
            fallbackImg.src = fallbackSrc;
          } else {
            resolve();
          }
        };
        img.src = config.src;
      });
    });

    await Promise.all(promises);
  }

  drawSprite(ctx, slot, x, y, width, height, { scale = 1, offsetY = 0, flipX = false, alpha = 1 } = {}) {
    const img = this.images.get(slot);
    if (!img) return;

    const config = this.getSlotConfig(slot) || {};
    const slotScale = (config.scale || 1) * scale;
    const slotOffsetY = (config.offsetY || 0) + offsetY;

    ctx.save();
    if (alpha !== 1) ctx.globalAlpha = alpha;

    const drawW = width * slotScale;
    const drawH = height * slotScale;
    const drawX = x + (width - drawW) / 2;
    const drawY = y + (height - drawH) / 2 + slotOffsetY;

    if (flipX) {
      ctx.translate(drawX + drawW, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  }
}
