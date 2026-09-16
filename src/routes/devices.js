const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

/**
 * GET /api/devices
 * Lists all registered devices with online status and stats
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        d.id,
        d.name,
        d.secret_key,
        d.location,
        d.created_at,
        d.last_seen_at,
        (SELECT COUNT(*) FROM users u WHERE u.device_id = d.id)::int as user_count,
        (SELECT COUNT(*) FROM unlock_commands uc WHERE uc.device_id = d.id AND uc.status = 'pending')::int as pending_unlocks
      FROM devices d
      ORDER BY d.id ASC
    `);

    // Add is_online indicator (heartbeat seen within last 20 seconds)
    const now = Date.now();
    const devices = result.rows.map((dev) => {
      const lastSeenTime = dev.last_seen_at ? new Date(dev.last_seen_at).getTime() : 0;
      const isOnline = (now - lastSeenTime) < 20000;
      return {
        ...dev,
        is_online: isOnline,
      };
    });

    return res.json({ devices });
  } catch (err) {
    console.error('Error fetching devices:', err);
    return res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

/**
 * POST /api/devices
 * Register a new device/room
 */
router.post('/', async (req, res) => {
  const { name, location } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Room identifier name is required' });
  }

  const cleanName = name.trim().toUpperCase().replace(/\s+/g, '_');

  try {
    const result = await db.query(
      `INSERT INTO devices (name, location)
       VALUES ($1, $2)
       RETURNING *`,
      [cleanName, location ? location.trim() : null]
    );

    return res.status(201).json({
      device: result.rows[0],
      message: 'Device created successfully',
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A room with this identifier already exists' });
    }
    console.error('Error creating device:', err);
    return res.status(500).json({ error: 'Failed to create device' });
  }
});

/**
 * PUT /api/devices/:id
 * Update device name or location
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, location } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Device name is required' });
  }

  const cleanName = name.trim().toUpperCase().replace(/\s+/g, '_');

  try {
    const result = await db.query(
      `UPDATE devices 
       SET name = $1, location = $2
       WHERE id = $3
       RETURNING *`,
      [cleanName, location ? location.trim() : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    return res.json({ device: result.rows[0], message: 'Device updated' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A device with this name already exists' });
    }
    console.error('Error updating device:', err);
    return res.status(500).json({ error: 'Failed to update device' });
  }
});

/**
 * DELETE /api/devices/:id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM devices WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    return res.json({ success: true, message: `Device '${result.rows[0].name}' deleted` });
  } catch (err) {
    console.error('Error deleting device:', err);
    return res.status(500).json({ error: 'Failed to delete device' });
  }
});

module.exports = router;
