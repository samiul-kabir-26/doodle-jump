import crypto from 'crypto';
import { webhooksRepo } from '../repositories/webhooks.repo.js';
import { eventsRepo } from '../repositories/events.repo.js';
import { settingsService } from './settings.service.js';
import { formatEvent } from './event.service.js';
import { getDatabase } from '../db/connection.js';

// Backoff in milliseconds: 1m, 5m, 30m, 2h, 6h, 12h
const RETRY_DELAYS_MS = [
  60 * 1000,
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000
];

export const webhookService = {
  createSignature(secret, rawBody, t = Math.floor(Date.now() / 1000)) {
    if (!secret) return `t=${t},v1=`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${t}.${rawBody}`);
    const v1 = hmac.digest('hex');
    return `t=${t},v1=${v1}`;
  },

  async sendDelivery(delivery, db = null) {
    const database = db || getDatabase();
    const eventRow = eventsRepo.findBySeq(delivery.event_seq, database);
    if (!eventRow) {
      webhooksRepo.updateDelivery(
        delivery.id,
        {
          status: 'failed',
          last_error: 'Event not found',
          last_duration_ms: 0
        },
        database
      );
      return false;
    }

    const formatted = formatEvent(eventRow);
    const rawBody = JSON.stringify(formatted);
    const secret = settingsService.getWebhookSecret(database);
    const t = Math.floor(Date.now() / 1000);
    const sig = this.createSignature(secret, rawBody, t);

    const startTime = Date.now();
    let resCode = null;
    let errMessage = null;
    let success = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(delivery.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'doodle-jump-webhook/1',
          'X-DJ-Event-Id': formatted.id,
          'X-DJ-Event-Type': formatted.type,
          'X-DJ-Delivery-Id': delivery.id,
          'X-DJ-Signature': sig
        },
        body: rawBody,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      resCode = res.status;
      if (res.ok) {
        success = true;
      } else {
        errMessage = `HTTP ${res.status} ${res.statusText}`.slice(0, 500);
      }
    } catch (err) {
      errMessage = (err.name === 'AbortError' ? 'Timeout after 10s' : err.message).slice(0, 500);
    }

    const durationMs = Date.now() - startTime;
    const attempts = (delivery.attempts || 0) + 1;

    if (success) {
      webhooksRepo.updateDelivery(
        delivery.id,
        {
          status: 'delivered',
          attempts,
          last_status_code: resCode,
          last_error: null,
          last_duration_ms: durationMs
        },
        database
      );
      return true;
    }

    // Schedule retry or fail
    if (attempts <= RETRY_DELAYS_MS.length) {
      const delay = RETRY_DELAYS_MS[attempts - 1];
      webhooksRepo.updateDelivery(
        delivery.id,
        {
          status: 'pending',
          attempts,
          next_attempt_at: Date.now() + delay,
          last_status_code: resCode,
          last_error: errMessage,
          last_duration_ms: durationMs
        },
        database
      );
    } else {
      webhooksRepo.updateDelivery(
        delivery.id,
        {
          status: 'failed',
          attempts,
          last_status_code: resCode,
          last_error: errMessage,
          last_duration_ms: durationMs
        },
        database
      );
    }

    return false;
  },

  async testSend(url = null, secret = null) {
    const targetUrl = url || settingsService.getSettings().webhook.url;
    if (!targetUrl) {
      throw new Error('No webhook URL configured');
    }

    const targetSecret = secret !== null ? secret : settingsService.getWebhookSecret();
    const testEvent = {
      id: 'evt_test_01',
      seq: 0,
      type: 'system.webhook_test',
      version: 1,
      category: 'system',
      trust: 'server',
      occurredAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      source: { service: 'doodle-jump', instance: 'dj-1', env: process.env.NODE_ENV || 'development' },
      player: null,
      sessionId: null,
      data: { message: 'ping' }
    };

    const rawBody = JSON.stringify(testEvent);
    const t = Math.floor(Date.now() / 1000);
    const sig = this.createSignature(targetSecret, rawBody, t);

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'doodle-jump-webhook/1',
          'X-DJ-Event-Id': testEvent.id,
          'X-DJ-Event-Type': testEvent.type,
          'X-DJ-Delivery-Id': 'dlv_test',
          'X-DJ-Signature': sig
        },
        body: rawBody,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      return {
        status: res.ok ? 'delivered' : 'failed',
        responseCode: res.status,
        durationMs
      };
    } catch (err) {
      return {
        status: 'failed',
        responseCode: null,
        durationMs: Date.now() - startTime,
        error: err.message
      };
    }
  },

  retryDelivery(id, db = null) {
    const database = db || getDatabase();
    const delivery = webhooksRepo.findById(id, database);
    if (!delivery) {
      const err = new Error('Delivery not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    return webhooksRepo.updateDelivery(
      id,
      {
        status: 'pending',
        next_attempt_at: Date.now()
      },
      database
    );
  }
};
