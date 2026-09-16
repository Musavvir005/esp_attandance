const db = require('../config/db');

/**
 * Middleware to authenticate ESP32 requests via BOTH 'dir' (room name) and 'key' (secret_key)
 * This enforces strict multi-device isolation so one room can NEVER access or consume another room's queue.
 */
async function deviceAuth(req, res, next) {
  const dir = req.query.dir || req.headers['x-device-dir'];
  const key = req.query.key || req.headers['x-device-key'];

  if (!dir || !key) {
    return res.status(401).type('text/plain').send('Unauthorized: Missing room name (dir) or device key (key)');
  }

  const cleanDir = dir.trim();
  const cleanKey = key.trim();

  try {
    const result = await db.query(
      'SELECT id, name, secret_key, location FROM devices WHERE name = $1 AND secret_key = $2',
      [cleanDir, cleanKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).type('text/plain').send('Unauthorized: Room identifier (dir) or secret key mismatch');
    }

    req.device = result.rows[0];

    // Asynchronously update last_seen_at for this specific device
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
