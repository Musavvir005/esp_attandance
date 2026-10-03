const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

/**
 * GET /api/users
 * Returns list of users mapped to fingerprint IDs and devices
 */
router.get('/', async (req, res) => {
  const { device_id } = req.query;

  try {
    // Automatically backfill any scanned IDs and all sequential slots (1..MAX) from access_logs
    try {
      await db.query(`
        INSERT INTO users (fingerprint_id, device_id, name, role, active)
        SELECT 
          s.slot as fingerprint_id,
          m.device_id,
          'Unknown User #' || s.slot as name,
          CASE WHEN s.slot <= 3 THEN 'admin' ELSE 'member' END as role,
          true as active
        FROM (
          SELECT device_id, GREATEST(MAX(fingerprint_id), 1) as max_slot
          FROM access_logs
          WHERE fingerprint_id >= 1 AND fingerprint_id <= 127
          GROUP BY device_id
        ) m
        CROSS JOIN LATERAL generate_series(1, LEAST(m.max_slot, 127)) as s(slot)
        ON CONFLICT (device_id, fingerprint_id) DO NOTHING
      `);
    } catch (backfillErr) {
      console.warn('Notice: user backfill from access_logs skipped or failed:', backfillErr.message);
    }

    let sql = `
      SELECT 
        u.id,
        u.fingerprint_id,
        u.device_id,
        u.name,
        u.role,
        u.active,
        u.created_at,
        d.name as device_name,
        d.location as device_location
      FROM users u
      LEFT JOIN devices d ON u.device_id = d.id
    `;
    const params = [];

    if (device_id) {
      sql += ' WHERE u.device_id = $1';
      params.push(device_id);
    }

    sql += ' ORDER BY u.device_id ASC, u.fingerprint_id ASC';

    const result = await db.query(sql, params);
    return res.json({ users: result.rows });
  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * POST /api/users/prefill
 * Pre-populate slot IDs (e.g. slots 1 to count) as "Unknown User #ID" for a device
 */
router.post('/prefill', async (req, res) => {
  const { device_id, count = 10, start = 1 } = req.body || {};
  const devId = parseInt(device_id, 10);
  const total = Math.min(127, Math.max(1, parseInt(count, 10) || 10));
  const startSlot = Math.min(127, Math.max(1, parseInt(start, 10) || 1));

  if (isNaN(devId)) {
    return res.status(400).json({ error: 'Valid device_id is required' });
  }

  try {
    const endSlot = Math.min(127, startSlot + total - 1);
    let createdCount = 0;

    for (let slot = startSlot; slot <= endSlot; slot++) {
      const defaultRole = slot <= 3 ? 'admin' : 'member';
      const defaultName = `Unknown User #${slot}`;
      const r = await db.query(
        `INSERT INTO users (fingerprint_id, device_id, name, role, active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (device_id, fingerprint_id) DO NOTHING
         RETURNING id`,
        [slot, devId, defaultName, defaultRole]
      );
      if (r.rows && r.rows.length > 0) {
        createdCount++;
      }
    }

    return res.json({
      message: `Pre-filled slots #${startSlot} to #${endSlot}. Added ${createdCount} new slot(s).`,
      added: createdCount,
    });
  } catch (err) {
    console.error('Error pre-filling users:', err);
    return res.status(500).json({ error: 'Failed to pre-fill user slots' });
  }
});

/**
 * POST /api/users
 * Map a new fingerprint_id to a user
 */
router.post('/', async (req, res) => {
  const { fingerprint_id, device_id, name, role, active } = req.body || {};

  const fpId = parseInt(fingerprint_id, 10);
  const devId = parseInt(device_id, 10);

  if (isNaN(fpId) || fpId < 1 || fpId > 127) {
    return res.status(400).json({ error: 'Fingerprint ID must be an integer between 1 and 127' });
  }

  if (isNaN(devId)) {
    return res.status(400).json({ error: 'Valid device_id is required' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'User name is required' });
  }

  const userRole = role === 'admin' ? 'admin' : 'member';
  const isActive = active !== undefined ? Boolean(active) : true;

  try {
    const result = await db.query(
      `INSERT INTO users (fingerprint_id, device_id, name, role, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [fpId, devId, name.trim(), userRole, isActive]
    );

    return res.status(201).json({
      user: result.rows[0],
      message: 'Fingerprint mapping created successfully',
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        error: `Fingerprint ID #${fpId} is already assigned to another user on this device.`,
      });
    }
    console.error('Error creating user mapping:', err);
    return res.status(500).json({ error: 'Failed to create user mapping' });
  }
});

/**
 * PUT /api/users/:id
 * Update user mapping details
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { fingerprint_id, device_id, name, role, active } = req.body || {};

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (role !== undefined) {
      fields.push(`role = $${idx++}`);
      values.push(role === 'admin' ? 'admin' : 'member');
    }
    if (active !== undefined) {
      fields.push(`active = $${idx++}`);
      values.push(Boolean(active));
    }
    if (fingerprint_id !== undefined) {
      const fpId = parseInt(fingerprint_id, 10);
      if (isNaN(fpId) || fpId < 1 || fpId > 127) {
        return res.status(400).json({ error: 'Fingerprint ID must be between 1 and 127' });
      }
      fields.push(`fingerprint_id = $${idx++}`);
      values.push(fpId);
    }
    if (device_id !== undefined) {
      fields.push(`device_id = $${idx++}`);
      values.push(parseInt(device_id, 10));
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

    const result = await db.query(sql, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: result.rows[0], message: 'User updated successfully' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Fingerprint ID is already assigned on this device' });
    }
    console.error('Error updating user:', err);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ success: true, message: `User '${result.rows[0].name}' removed` });
  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
