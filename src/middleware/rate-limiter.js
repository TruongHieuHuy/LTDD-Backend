/**
 * Rate Limiting Middleware
 * Protect API endpoints from abuse and DDoS attacks
 */
const rateLimit = require('express-rate-limit');

/**
 * General API limiter - 100 requests per 15 minutes
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Auth limiter - 5 attempts per 15 minutes (stricter for login/register)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again after 15 minutes.'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Score submission limiter - 10 scores per minute
 */
const scoreLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10,
    message: {
        success: false,
        message: 'Too many score submissions, please slow down.'
    },
});

/**
 * Post creation limiter - 100 posts per hour (relaxed for testing)
 */
const postLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Increased from 20 to 100
    message: {
        success: false,
        message: 'Too many posts created, please try again later.'
    },
});

module.exports = {
    generalLimiter,
    authLimiter,
    scoreLimiter,
    postLimiter,
};
