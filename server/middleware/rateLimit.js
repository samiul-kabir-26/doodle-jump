import rateLimit from 'express-rate-limit';

function makeLimiter(max, windowMs, code = 'RATE_LIMITED') {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code,
          message: 'Too many requests, please try again later',
          requestId: req.id
        }
      });
    }
  });
}

export const identifyLimiter = makeLimiter(20, 60 * 1000);
export const playerLimiter = makeLimiter(60, 60 * 1000);
export const sessionCreateLimiter = makeLimiter(30, 60 * 1000);
export const integrationLimiter = makeLimiter(600, 60 * 1000);
export const adminLoginLimiter = makeLimiter(5, 60 * 1000);
export const adminApiLimiter = makeLimiter(300, 60 * 1000);
