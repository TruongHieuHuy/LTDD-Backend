const validator = require('validator');
const xss = require('xss');

/**
 * Middleware to sanitize user input and prevent XSS attacks
 */
const sanitizeInput = (req, res, next) => {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }

    // Sanitize query params
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }

    // Sanitize URL params
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
    }

    next();
};

/**
 * Recursively sanitize an object
 */
const sanitizeObject = (obj) => {
    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            // Remove XSS attempts
            let clean = xss(value);
            // Trim whitespace
            clean = validator.trim(clean);
            sanitized[key] = clean;
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item =>
                typeof item === 'object' ? sanitizeObject(item) : item
            );
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
};

module.exports = { sanitizeInput };
