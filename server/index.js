import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { closeDatabase } from './db/connection.js';
import { createApp } from './app.js';
import { webhookDispatcher } from './workers/webhookDispatcher.js';
import { sessionService } from './services/session.service.js';
import { eventsRepo } from './repositories/events.repo.js';
import { authService } from './services/auth.service.js';
import { eventService } from './services/event.service.js';

// 1. Run Migrations & Seeds
runMigrations();

// 2. Start Application
const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`🚀 Jumpy Doodle service listening on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`🎮 Game URL:  ${env.PUBLIC_BASE_URL}`);
  console.log(`🛠 Admin URL: ${env.PUBLIC_BASE_URL}/admin`);
});

// 3. Emit system.started
try {
  eventService.emit('system.started', {
    data: { version: '1.0.0' }
  });
} catch (err) {
  console.error('Failed to emit system.started event:', err.message);
}

// 4. Start Background Workers & Jobs
webhookDispatcher.start(1000);

// Session cleanup: every 5 minutes
const sessionCleanupInterval = setInterval(() => {
  try {
    sessionService.cleanupOldSessions();
  } catch (err) {
    console.error('Session cleanup job error:', err.message);
  }
}, 5 * 60 * 1000);

// Launch token purge: every 1 hour
const launchTokenPurgeInterval = setInterval(() => {
  try {
    authService.purgeExpiredLaunchTokens();
  } catch (err) {
    console.error('Launch token purge job error:', err.message);
  }
}, 60 * 60 * 1000);

// Retention purge: every 24 hours
const retentionInterval = setInterval(() => {
  try {
    const cutoff = Date.now() - (env.EVENT_RETENTION_DAYS || 180) * 24 * 3600 * 1000;
    eventsRepo.purgeOlderThan(cutoff);
  } catch (err) {
    console.error('Retention purge job error:', err.message);
  }
}, 24 * 60 * 60 * 1000);

// 5. Graceful Shutdown
async function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  clearInterval(sessionCleanupInterval);
  clearInterval(launchTokenPurgeInterval);
  clearInterval(retentionInterval);

  server.close(async () => {
    console.log('HTTP server closed.');
    await webhookDispatcher.stop(10000);
    console.log('Webhook worker drained.');
    closeDatabase();
    console.log('Database connection closed.');
    process.exit(0);
  });

  // Force close after 12s
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 12000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
