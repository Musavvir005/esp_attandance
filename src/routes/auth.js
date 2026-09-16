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

  // Compare username
  const isUsernameMatch = username === env.ADMIN_USERNAME;

  // Compare password (supports plain text env var or bcrypt hash in env var)
  let isPasswordMatch = false;
  if (isUsernameMatch) {
    if (env.ADMIN_PASSWORD.startsWith('$2a$') || env.ADMIN_PASSWORD.startsWith('$2b$')) {
      isPasswordMatch = await bcrypt.compare(password, env.ADMIN_PASSWORD);
    } else {
      isPasswordMatch = (password === env.ADMIN_PASSWORD);
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
