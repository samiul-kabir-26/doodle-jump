export class HostBridge {
  constructor({ onInit, onPause, onResume, onRestart, onSetMuted, onPreviewTheme }) {
    this.onInit = onInit;
    this.onPause = onPause;
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.onSetMuted = onSetMuted;
    this.onPreviewTheme = onPreviewTheme;

    this.isEmbedded = window.parent !== window;
    this.targetOrigin = '*';

    this.handleMessage = this.handleMessage.bind(this);
    window.addEventListener('message', this.handleMessage);
  }

  handleMessage(event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // Check for admin theme preview postMessage
    if (data.type === 'dj:preview_theme' && data.payload) {
      if (this.onPreviewTheme) this.onPreviewTheme(data.payload);
      return;
    }

    if (data.source !== 'host') return;

    switch (data.type) {
      case 'dj:init':
        if (this.onInit) this.onInit(data.payload);
        break;
      case 'dj:pause':
        if (this.onPause) this.onPause();
        break;
      case 'dj:resume':
        if (this.onResume) this.onResume();
        break;
      case 'dj:restart':
        if (this.onRestart) this.onRestart();
        break;
      case 'dj:set_muted':
        if (this.onSetMuted) this.onSetMuted(data.payload?.muted);
        break;
    }
  }

  post(type, payload = {}) {
    if (!this.isEmbedded) return;
    try {
      window.parent.postMessage(
        {
          source: 'doodle-jump',
          type,
          payload
        },
        this.targetOrigin
      );
    } catch (e) {
      console.warn('postMessage failed:', e);
    }
  }

  destroy() {
    window.removeEventListener('message', this.handleMessage);
  }
}
