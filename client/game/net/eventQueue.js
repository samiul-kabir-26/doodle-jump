import { api } from './api.js';

export class EventQueue {
  constructor() {
    this.sessionId = null;
    this.playerToken = null;
    this.queue = [];
    this.clientSeq = 0;
    this.flushInterval = null;
    this.lastBrokenTime = 0;
    this.lastSpringTime = 0;

    this.handleUnload = this.handleUnload.bind(this);
    window.addEventListener('pagehide', this.handleUnload);
    window.addEventListener('beforeunload', this.handleUnload);
  }

  startSession(sessionId, playerToken) {
    this.flush(); // Flush any remaining
    this.sessionId = sessionId;
    this.playerToken = playerToken;
    this.queue = [];
    this.clientSeq = 0;
    this.lastBrokenTime = 0;
    this.lastSpringTime = 0;

    if (this.flushInterval) clearInterval(this.flushInterval);
    this.flushInterval = setInterval(() => this.flush(), 2000); // Flush every 2s
  }

  stopSession() {
    this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.sessionId = null;
    this.playerToken = null;
  }

  push(type, data = {}, clientTs = 0) {
    if (!this.sessionId || !this.playerToken) return;

    const now = Date.now();

    // Sampling: max 1 platform.broken per 10s per session
    if (type === 'platform.broken') {
      if (now - this.lastBrokenTime < 10000) return;
      this.lastBrokenTime = now;
    }

    // Sampling: max 1 spring.used per 10s per session
    if (type === 'spring.used') {
      if (now - this.lastSpringTime < 10000) return;
      this.lastSpringTime = now;
    }

    this.clientSeq++;
    this.queue.push({
      clientEventId: `c_${this.sessionId}_${this.clientSeq}`,
      seq: this.clientSeq,
      type,
      clientTs,
      data
    });

    if (this.queue.length >= 50) {
      this.flush();
    }
  }

  async flush() {
    if (!this.sessionId || !this.playerToken || this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      await api.postSessionEvents(this.sessionId, this.playerToken, batch);
    } catch (err) {
      console.warn('Failed to flush event queue:', err.message);
    }
  }

  handleUnload() {
    if (!this.sessionId || !this.playerToken || this.queue.length === 0) return;

    const payload = JSON.stringify({
      playerToken: this.playerToken,
      events: this.queue
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
      navigator.sendBeacon(`/api/v1/sessions/${this.sessionId}/events`, blob);
    }
    this.queue = [];
  }

  destroy() {
    this.stopSession();
    window.removeEventListener('pagehide', this.handleUnload);
    window.removeEventListener('beforeunload', this.handleUnload);
  }
}
