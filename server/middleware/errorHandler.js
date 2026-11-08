import { HttpError, UpstreamError } from '../utils/errors.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'This API route does not exist.' } });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details ?? null },
    });
  }

  if (error instanceof UpstreamError) {
    const status = error.code === 'UPSTREAM_TIMEOUT' ? 504 : 502;
    return res.status(status).json({
      error: {
        code: error.code,
        message: error.message,
        provider: error.provider,
        hint: 'The provider may be temporarily unavailable. Cached or previously loaded data is unaffected; retry shortly.',
      },
    });
  }

  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' } });
  }

  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.' } });
  }

  console.error('[air-cue] Unhandled error:', error);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server. Please try again.' },
  });
}
