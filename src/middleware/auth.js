const jwt = require('jsonwebtoken');
const env = require('../config/env');

function requireAdmin(req, res, next) {
  const token = req.cookies[env.COOKIE_NAME] || 
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
      ? req.headers.authorization.split(' ')[1] 
      : null);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie(env.COOKIE_NAME);
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

module.exports = {
  requireAdmin,
};
