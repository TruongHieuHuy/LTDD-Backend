/**
 * Rate Limiting Configuration
 * Prevents API abuse and brute-force attacks
 */
const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for trusted IPs (optional)
  skip: (req) => {
    // Add your trusted IPs here if needed
    // return req.ip === '127.0.0.1';
    return false;
  }
});

/**
 * Auth rate limiter (login/register)
 * 5 requests per 15 minutes to prevent brute-force
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Track by IP + email to prevent account enumeration
  keyGenerator: (req) => {
    return `${req.ip}-${req.body.email || ''}`;
  }
});

/**
 * Score submission rate limiter
 * Max 10 games per minute per user
 */
const scoreRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    message: 'Too many game submissions. Please wait before playing again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Track by userId (from auth token)
  keyGenerator: (req) => {
    return req.userId || req.ip;
  }
});

/**
 * Post/Comment creation rate limiter
 * Max 20 posts/comments per 10 minutes
 */
const contentCreationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: {
    success: false,
    message: 'Too many posts/comments. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip;
  }
});

/**
 * Friend request rate limiter
 * Max 30 friend requests per hour
 */
const friendRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: {
    success: false,
    message: 'Too many friend requests. Please wait before sending more.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip;
  }
});

/**
 * Password reset rate limiter
 * Max 3 password reset requests per hour per email
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `reset-${req.body.email || req.ip}`;
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  scoreRateLimiter,
  contentCreationLimiter,
  friendRequestLimiter,
  passwordResetLimiter
};
