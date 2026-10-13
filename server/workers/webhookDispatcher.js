import { webhooksRepo } from '../repositories/webhooks.repo.js';
import { webhookService } from '../services/webhook.service.js';

let intervalId = null;
let isRunning = false;
let inFlightCount = 0;

export const webhookDispatcher = {
  start(intervalMs = 1000) {
    if (intervalId) return;

    intervalId = setInterval(async () => {
      if (isRunning) return;
      isRunning = true;

      try {
        const pending = webhooksRepo.getPendingDeliveries(Date.now(), 20);
        if (pending.length > 0) {
          const promises = pending.map(async (delivery) => {
            inFlightCount++;
            try {
              await webhookService.sendDelivery(delivery);
            } catch (err) {
              console.error(`Webhook send error for delivery ${delivery.id}:`, err);
            } finally {
              inFlightCount--;
            }
          });
          await Promise.all(promises);
        }
      } catch (err) {
        console.error('Webhook dispatcher loop error:', err);
      } finally {
        isRunning = false;
      }
    }, intervalMs);
  },

  async stop(maxWaitMs = 10000) {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    const startWait = Date.now();
    while (inFlightCount > 0 && Date.now() - startWait < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
};
