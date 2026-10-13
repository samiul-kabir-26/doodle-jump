import { requestId } from '../utils/ids.js';

export function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || requestId();
  res.setHeader('X-Request-Id', req.id);
  next();
}
