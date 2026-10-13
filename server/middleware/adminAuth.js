import { authService } from '../services/auth.service.js';

export async function adminAuth(req, res, next) {
  const token = req.cookies?.dj_admin;
  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Admin authentication required',
        requestId: req.id
      }
    });
  }

  const payload = await authService.verifyAdminToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Invalid or expired admin session',
        requestId: req.id
      }
    });
  }

  // CSRF defence-in-depth: check X-Requested-With header on mutating requests
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
  if (isMutating) {
    const requestedWith = req.headers['x-requested-with'];
    if (requestedWith !== 'dj-admin') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Missing or invalid X-Requested-With header',
          requestId: req.id
        }
      });
    }
  }

  req.admin = payload;
  next();
}
