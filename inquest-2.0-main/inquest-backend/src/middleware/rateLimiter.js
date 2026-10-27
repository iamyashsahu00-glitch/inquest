const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development'
    ? 50000
    : (Number(process.env.RATE_LIMIT_MAX) || 1000),
  skip: (req) => {
    if (process.env.NODE_ENV === 'development') return true;
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
  message: { success: false, error: 'Too many requests, slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter };
