import { rateLimit } from 'express-rate-limit';

// Counters live in this process's memory, which is fine for a single server instance: they
// reset on restart and are not shared between instances. Behind a proxy (production), the
// client address comes from `trust proxy`, which server.js sets.

const tooManyRequests = (message) => (req, res) => {
    res.status(429).render('errors/429', { title: 'Too Many Requests', message });
};

const baseOptions = {
    standardHeaders: true, // sends the standard RateLimit-* headers
    legacyHeaders: false   // skips the old X-RateLimit-* headers
};

/**
 * Limits password guessing: 10 failed logins per address per 15 minutes.
 * Successful logins (the redirect after login) are not counted.
 */
const loginLimiter = rateLimit({
    ...baseOptions,
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    handler: tooManyRequests('Too many failed login attempts. Please wait 15 minutes and try again.')
});

/**
 * Limits account creation: 10 attempts per address per hour. Registration runs the password
 * hasher, which is deliberately slow, so an unlimited public endpoint could be used to tie up the server.
 */
const registerLimiter = rateLimit({
    ...baseOptions,
    windowMs: 60 * 60 * 1000,
    limit: 10,
    handler: tooManyRequests('Too many registration attempts. Please wait an hour and try again.')
});

export { loginLimiter, registerLimiter };
