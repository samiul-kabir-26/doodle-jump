import crypto from 'crypto';
import { env } from '../config/env.js';

export function apiKeyAuth(req, res, next) {
  if (!env.INTEGRATION_API_KEY) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Integration API is not enabled',
        requestId: req.id
      }
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Missing Bearer API key in Authorization header',
        requestId: req.id
      }
    });
  }

  const token = authHeader.slice(7).trim();
  const tokenHash = crypto.createHash('sha256').update(token).digest();
  const expectedHash = crypto.createHash('sha256').update(env.INTEGRATION_API_KEY).digest();

  if (!crypto.timingSafeEqual(tokenHash, expectedHash)) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Invalid integration API key',
        requestId: req.id
      }
    });
  }

  next();
}
