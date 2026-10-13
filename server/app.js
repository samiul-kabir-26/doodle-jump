import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { publicRouter } from './routes/public.routes.js';
import { integrationRouter } from './routes/integration.routes.js';
import { adminRouter } from './routes/admin.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  const logger = pino({
    level: env.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.secret'
      ],
      remove: true
    }
  });

  // Security Headers
  const frameAncestors = env.FRAME_ANCESTORS
    ? env.FRAME_ANCESTORS.split(/\s+/).filter(Boolean)
    : ["'self'"];

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          mediaSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          frameAncestors
        }
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  // CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.parsedCorsOrigins.length === 0 || env.parsedCorsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true
    })
  );

  // Parsers & Middleware
  app.use(requestIdMiddleware);
  if (process.env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger }));
  }

  app.use(express.json({ limit: '2mb' }));
  app.use(express.text({ type: 'text/plain', limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // Static: /default-assets
  const defaultAssetsDir = path.resolve(__dirname, '../public/default-assets');
  app.use('/default-assets', express.static(defaultAssetsDir, { maxAge: '1h' }));

  // Static: /uploads with security hardening
  if (!fs.existsSync(env.absoluteUploadDir)) {
    fs.mkdirSync(env.absoluteUploadDir, { recursive: true });
  }

  app.use(
    '/uploads',
    (req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; sandbox"
      );
      next();
    },
    express.static(env.absoluteUploadDir, { maxAge: '30d', immutable: true })
  );

  // API Routes
  app.use(publicRouter);
  app.use(integrationRouter);
  app.use(adminRouter);

  // OpenAPI Specification (GET /api/v1/openapi.json)
  app.get('/api/v1/openapi.json', (req, res) => {
    res.status(200).json({
      openapi: '3.1.0',
      info: {
        title: 'Jumpy Doodle Microservice API',
        version: '1.0.0',
        description: 'Microservice API for Jumpy Doodle platformer game, leaderboard, event stream and admin panel'
      },
      servers: [{ url: env.PUBLIC_BASE_URL + '/api/v1' }],
      paths: {
        '/config': { get: { summary: 'Get published or draft theme and gameplay settings' } },
        '/players/identify': { post: { summary: 'Identify player with host launch token or nickname' } },
        '/sessions': { post: { summary: 'Start a game session' } },
        '/sessions/{sessionId}/events': { post: { summary: 'Batch post client gameplay events' } },
        '/sessions/{sessionId}/end': { post: { summary: 'End session with score and stats' } },
        '/leaderboard': { get: { summary: 'Public leaderboard' } },
        '/events': { get: { summary: 'Integration events feed with cursor pagination' } }
      }
    });
  });

  // Client SPA static serving in production or when dist/ exists
  const distDir = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));

    // Admin & Game SPA fallback
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      if (req.path.startsWith('/api') || req.path.startsWith('/default-assets') || req.path.startsWith('/uploads')) {
        return next();
      }

      if (req.path.startsWith('/admin')) {
        const adminHtml = path.join(distDir, 'admin/index.html');
        if (fs.existsSync(adminHtml)) {
          return res.sendFile(adminHtml);
        }
      }

      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        return res.sendFile(indexHtml);
      }
      next();
    });
  }

  // Error Handler
  app.use(errorHandler);

  return app;
}
