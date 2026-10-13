import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  const reqId = req.id || 'req_unknown';

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          issue: e.code,
          message: e.message
        })),
        requestId: reqId
      }
    });
  }

  const status = err.statusCode || err.status || 500;
  const code = err.code || (status === 500 ? 'INTERNAL' : 'ERROR');

  if (status >= 500) {
    req.log?.error ? req.log.error(err) : console.error(err);
  }

  return res.status(status).json({
    error: {
      code,
      message: err.message || 'An internal error occurred',
      requestId: reqId
    }
  });
}
