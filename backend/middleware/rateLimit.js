const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// Rate limiter for ESP32 /check-unlock endpoint
// Scoped per device (dir + key) so one device's high-frequency polling does not impact another
const checkUnlockLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.RATE_LIMIT_CHECK_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const dir = req.query.dir || req.headers['x-device-dir'];
    const key = req.query.key || req.headers['x-device-key'];
    if (dir && key) {
      return `${dir}:${key}`;
    }
    return req.ip;
  },
  handler: (req, res) => {
    res.status(429).type('text/plain').send('Too Many Requests');
  },
});

// Rate limiter for ESP32 /log endpoint (fingerprint scans)
const logLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_LOG_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const dir = req.query.dir || req.headers['x-device-dir'];
    const key = req.query.key || req.headers['x-device-key'];
    if (dir && key) {
      return `${dir}:${key}`;
    }
    return req.ip;
  },
  handler: (req, res) => {
    res.status(429).type('text/plain').send('Too Many Requests');
  },
});

// Rate limiter for Admin Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

module.exports = {
  checkUnlockLimiter,
  logLimiter,
  loginLimiter,
};
