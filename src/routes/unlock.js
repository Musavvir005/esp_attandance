const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

/**
 * POST /api/unlock
 * Dispatch remote unlock command to a specific device
 */
router.post('/', async (req, res) => {
  const { device_id } = req.body || {};

  const devId = parseInt(device_id, 10);
  if (isNaN(devId)) {
    return res.status(400).json({ error: 'Valid device_id is required' });
  }

  try {
    // Verify device exists
    const devCheck = await db.query('SELECT id, name FROM devices WHERE id = $1', [devId]);
    if (devCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const device = devCheck.rows[0];

    // Clean up any stale pending commands older than 2 minutes
    await db.query(
      `UPDATE unlock_commands
       SET status = 'expired'
       WHERE device_id = $1 AND status = 'pending' AND created_at < NOW() - INTERVAL '2 minutes'`,
      [devId]
    );

    // Insert new pending unlock command
    const result = await db.query(
      `INSERT INTO unlock_commands (device_id, status)
       VALUES ($1, 'pending')
       RETURNING id, device_id, status, created_at`,
      [devId]
    );

    console.log(`[Admin Dispatch] Queued unlock command #${result.rows[0].id} for device '${device.name}'`);

    return res.status(201).json({
      success: true,
      command: result.rows[0],
      device_name: device.name,
      message: `Unlock signal dispatched to ${device.name}. ESP32 will trigger on next poll.`,
    });
  } catch (err) {
    console.error('Error dispatching unlock command:', err);
    return res.status(500).json({ error: 'Failed to dispatch unlock command' });
  }
});

/**
 * GET /api/unlock/status/:id
 * Check if an unlock command was consumed by the ESP32
 */
router.get('/status/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'SELECT id, device_id, status, created_at, consumed_at FROM unlock_commands WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Command not found' });
    }

    return res.json({ command: result.rows[0] });
  } catch (err) {
    console.error('Error checking command status:', err);
    return res.status(500).json({ error: 'Failed to check command status' });
  }
});

module.exports = router;
