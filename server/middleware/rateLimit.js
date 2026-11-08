import { HttpError } from '../utils/errors.js';

/**
 * Simple fixed-window, in-memory rate limit. Enough to protect optional
 * AI calls in a single-instance hackathon deployment.
 */
export function rateLimit({ windowMs = 60_000, max = 60, scope = 'api' } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const key = `${scope}:${req.ip}`;
    const now = Date.now();
    const record = hits.get(key);

    if (!record || now - record.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      const retryAfter = Math.ceil((record.start + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return next(new HttpError(429, 'RATE_LIMITED', `Too many requests. Try again in ${retryAfter} seconds.`));
    }
    return next();
  };
}
