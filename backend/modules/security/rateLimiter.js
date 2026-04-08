/**
 * Rate limiting configuration for API endpoints
 */

import rateLimit from 'express-rate-limit';

/**
 * General rate limiter: 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => process.env.NODE_ENV === 'test', // Skip rate limiting in test mode
});

/**
 * Strict rate limiter for /ingest: 30 requests per 15 minutes
 */
export const ingestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many ticket submissions. Please try again later.',
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * Moderate rate limiter for general endpoints: 60 requests per 15 minutes
 */
export const moderateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please try again later.',
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * Custom rate limit handler
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware
 */
export function handleRateLimitExceeded(req, res, next) {
  return (err) => {
    if (err instanceof rateLimit.RateLimitError) {
      console.warn(`Rate limit exceeded for IP: ${req.ip}`);
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: req.rateLimit?.resetTime,
      });
    }
    next(err);
  };
}
