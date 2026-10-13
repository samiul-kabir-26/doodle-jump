export class InputHandler {
  constructor({ onPause, onMute, onShoot }) {
    this.onPause = onPause;
    this.onMute = onMute;
    this.onShoot = onShoot;

    this.keys = new Set();
    this.horizontalAxis = 0; // -1 to +1
    this.touchZoneLeft = false;
    this.touchZoneRight = false;
    this.tiltEnabled = false;
    this.tiltGamma = 0;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.onPause) this.onPause();
      } else if (e.code === 'KeyM') {
        if (this.onMute) this.onMute();
      } else if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (this.onShoot) this.onShoot({ angle: 0 }); // Straight up
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  bindCanvas(canvas, getScale) {
    // Mouse click shooting
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scale = getScale();
      const clickX = (e.clientX - rect.left) / scale;
      const clickY = (e.clientY - rect.top) / scale;

      // Mobile check: lower 40% (screenY > 640 * 0.6 = 384) is touch zone
      if (clickY > 384) {
        if (clickX < 180) {
          this.touchZoneLeft = true;
        } else {
          this.touchZoneRight = true;
        }
      } else {
        // Upper 60%: shoot toward click
        if (this.onShoot) {
          this.onShoot({ screenX: clickX, screenY: clickY });
        }
      }
    });

    const clearTouch = () => {
      this.touchZoneLeft = false;
      this.touchZoneRight = false;
    };
    canvas.addEventListener('pointerup', clearTouch);
    canvas.addEventListener('pointercancel', clearTouch);
    canvas.addEventListener('pointerleave', clearTouch);
  }

  async enableTilt() {
    if (typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm !== 'granted') return false;
        } catch {
          return false;
        }
      }

      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma !== null) {
          this.tiltGamma = e.gamma; // Range typically -90 to +90
        }
      });
      this.tiltEnabled = true;
      return true;
    }
    return false;
  }

  disableTilt() {
    this.tiltEnabled = false;
    this.tiltGamma = 0;
  }

  poll() {
    let axis = 0;

    // 1. Keyboard
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      axis -= 1;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      axis += 1;
    }

    // 2. Touch zones
    if (this.touchZoneLeft) axis -= 1;
    if (this.touchZoneRight) axis += 1;

    // 3. Tilt (deadzone 3 deg, full at 25 deg)
    if (this.tiltEnabled && axis === 0 && Math.abs(this.tiltGamma) > 3) {
      const sign = Math.sign(this.tiltGamma);
      const mag = Math.min(1, (Math.abs(this.tiltGamma) - 3) / 22);
      axis = sign * mag;
    }

    this.horizontalAxis = Math.max(-1, Math.min(1, axis));
    return this.horizontalAxis;
  }
}
