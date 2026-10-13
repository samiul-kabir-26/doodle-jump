import { settingsRepo } from '../repositories/settings.repo.js';
import { authService } from './auth.service.js';
import { eventService } from './event.service.js';
import { env } from '../config/env.js';
import { getDatabase } from '../db/connection.js';

export const settingsService = {
  getSettings(db = null) {
    const database = db || getDatabase();
    const gameplay = settingsRepo.get('gameplay', database) || {};
    const antiCheat = settingsRepo.get('antiCheat', database) || {};
    const webhook = settingsRepo.get('webhook', database) || {};

    const hasSecret = Boolean(webhook.encryptedSecret || env.WEBHOOK_SECRET);

    return {
      gameplay,
      antiCheat,
      webhook: {
        enabled: Boolean(webhook.enabled),
        url: webhook.url || env.WEBHOOK_URL || '',
        eventTypes: webhook.eventTypes || ['score.*', 'milestone.*', 'leaderboard.*', 'game.ended'],
        secretSet: hasSecret
      }
    };
  },

  updateSettings(updates, db = null) {
    const database = db || getDatabase();
    const changedKeys = [];

    if (updates.gameplay) {
      settingsRepo.set('gameplay', updates.gameplay, database);
      changedKeys.push('gameplay');
    }

    if (updates.antiCheat) {
      settingsRepo.set('antiCheat', updates.antiCheat, database);
      changedKeys.push('antiCheat');
    }

    if (updates.webhook) {
      const current = settingsRepo.get('webhook', database) || {};
      const newWebhook = {
        enabled: updates.webhook.enabled !== undefined ? updates.webhook.enabled : current.enabled,
        url: updates.webhook.url !== undefined ? updates.webhook.url : current.url,
        eventTypes: updates.webhook.eventTypes !== undefined ? updates.webhook.eventTypes : current.eventTypes,
        encryptedSecret: current.encryptedSecret
      };

      if (updates.webhook.secret) {
        newWebhook.encryptedSecret = authService.encryptSecret(updates.webhook.secret);
      }

      settingsRepo.set('webhook', newWebhook, database);
      changedKeys.push('webhook');
    }

    if (changedKeys.length > 0) {
      eventService.emit(
        'admin.settings_updated',
        {
          data: { changedKeys }
        },
        database
      );
    }

    return this.getSettings(database);
  },

  getWebhookSecret(db = null) {
    const database = db || getDatabase();
    const webhook = settingsRepo.get('webhook', database);
    if (webhook?.encryptedSecret) {
      const decrypted = authService.decryptSecret(webhook.encryptedSecret);
      if (decrypted) return decrypted;
    }
    return env.WEBHOOK_SECRET || '';
  }
};
