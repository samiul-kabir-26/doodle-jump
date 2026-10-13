import { GAME_CONSTANTS } from '../../../shared/constants.js';

export class GameLoop {
  constructor({ onUpdate, onRender, onVisibilityChange }) {
    this.onUpdate = onUpdate;
    this.onRender = onRender;
    this.onVisibilityChange = onVisibilityChange;

    this.step = GAME_CONSTANTS.FIXED_TIMESTEP; // 1/60 s
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this.paused = false;
    this.rafId = null;

    this.handleVisibility = this.handleVisibility.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  handleVisibility() {
    if (document.hidden) {
      if (this.running && !this.paused) {
        if (this.onVisibilityChange) this.onVisibilityChange(true);
      }
    } else {
      this.lastTime = performance.now();
      if (this.onVisibilityChange) this.onVisibilityChange(false);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  pause() {
    this.paused = true;
  }

  resume() {
    if (this.paused) {
      this.paused = false;
      this.lastTime = performance.now();
      this.accumulator = 0;
    }
  }

  loop(currentTime) {
    if (!this.running) return;

    const frameDelta = Math.min((currentTime - this.lastTime) / 1000, 0.25);
    this.lastTime = currentTime;

    if (!this.paused) {
      this.accumulator += frameDelta;
      while (this.accumulator >= this.step) {
        this.onUpdate(this.step);
        this.accumulator -= this.step;
      }
      const alpha = this.accumulator / this.step;
      this.onRender(alpha);
    }

    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }
}
