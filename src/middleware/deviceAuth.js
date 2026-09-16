const db = require('../config/db');

/**
 * Middleware to authenticate ESP32 requests via 'dir' (room name).
 * Scopes each scan and unlock action to the specific room/device.
 */
async function deviceAuth(req, res, next) {
  const dir = req.query.dir || req.headers['x-device-dir'];

  if (!dir || !dir.trim()) {
    return res.status(400).type('text/plain').send('Bad Request: Missing room identifier (dir parameter)');
  }

  const cleanDir = dir.trim().toUpperCase().replace(/\s+/g, '_');

  try {
    // Find existing device or auto-register if this is a new room name
    let result = await db.query(
      'SELECT id, name, location FROM devices WHERE name = $1',
      [cleanDir]
    );

    if (result.rows.length === 0) {
      result = await db.query(
        `INSERT INTO devices (name, location)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET last_seen_at = NOW()
         RETURNING id, name, location`,
        [cleanDir, 'Auto-Registered Unit']
      );
    }

    req.device = result.rows[0];

    // Asynchronously update last_seen_at heartbeat
    db.query('UPDATE devices SET last_seen_at = NOW() WHERE id = $1', [req.device.id]).catch((err) => {
      console.error(`Failed to update device ${req.device.name} last_seen_at:`, err.message);
    });

    next();
  } catch (err) {
    console.error('Device auth database error:', err);
    return res.status(500).type('text/plain').send('Internal Server Error');
  }
}

module.exports = deviceAuth;

