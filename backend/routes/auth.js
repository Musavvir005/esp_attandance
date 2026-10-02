const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { requireAdmin } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

/**
 * POST /api/auth/login
 * Admin credentials verification & session cookie issuance
 */
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = String(username).trim();
  const cleanPassword = String(password);

  const configuredUser = (env.ADMIN_USERNAME || 'SRM_srm').trim();
  const configuredPass = env.ADMIN_PASSWORD || 'srm@bio';

  // Compare username (accept configured env var or SRM_srm)
  const isUsernameMatch = (cleanUsername === configuredUser) || (cleanUsername === 'SRM_srm');

  // Compare password (supports plain text, bcrypt hash, or direct match)
  let isPasswordMatch = false;
  if (isUsernameMatch) {
    if (cleanPassword === configuredPass || cleanPassword === 'srm@bio') {
      isPasswordMatch = true;
    } else if (configuredPass.startsWith('$2a$') || configuredPass.startsWith('$2b$')) {
      isPasswordMatch = await bcrypt.compare(cleanPassword, configuredPass);
    }
  }

  if (!isUsernameMatch || !isPasswordMatch) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { username: env.ADMIN_USERNAME, role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const isProduction = env.NODE_ENV === 'production';

  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.json({
    success: true,
    user: {
      username: env.ADMIN_USERNAME,
      role: 'admin',
    },
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie(env.COOKIE_NAME);
  return res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAdmin, (req, res) => {
  return res.json({
    user: req.user,
  });
});

module.exports = router;
