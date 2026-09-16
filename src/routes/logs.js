const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

/**
 * GET /api/logs
 * Filterable, paginated access logs with user and device details
 */
router.get('/', async (req, res) => {
  const {
    page = 1,
    limit = 50,
    device_id,
    fingerprint_id,
    date,
    date_from,
    date_to,
    search,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  try {
    const whereClauses = [];
    const params = [];
    let idx = 1;

    if (device_id) {
      whereClauses.push(`l.device_id = $${idx++}`);
      params.push(parseInt(device_id, 10));
    }

    if (fingerprint_id) {
      whereClauses.push(`l.fingerprint_id = $${idx++}`);
      params.push(parseInt(fingerprint_id, 10));
    }

    if (date) {
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(`${date}T23:59:59.999`);
      whereClauses.push(`l.timestamp >= $${idx++}`);
      params.push(dayStart);
      whereClauses.push(`l.timestamp <= $${idx++}`);
      params.push(dayEnd);
    } else {
      if (date_from) {
        whereClauses.push(`l.timestamp >= $${idx++}`);
        params.push(new Date(date_from));
      }

      if (date_to) {
        whereClauses.push(`l.timestamp <= $${idx++}`);
        params.push(new Date(date_to));
      }
    }

    if (search && search.trim()) {
      whereClauses.push(`(u.name ILIKE $${idx} OR d.name ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query
    const countSql = `
      SELECT COUNT(*) as total
      FROM access_logs l
      LEFT JOIN devices d ON l.device_id = d.id
      LEFT JOIN users u ON u.device_id = l.device_id AND u.fingerprint_id = l.fingerprint_id
      ${whereSql}
    `;
    const countRes = await db.query(countSql, params);
    const totalCount = parseInt(countRes.rows[0].total, 10);

    // Data query
    const dataSql = `
      SELECT 
        l.id,
        l.fingerprint_id,
        l.device_id,
        l.event_type,
        l.timestamp,
        l.raw_date,
        l.raw_time,
        l.created_at,
        d.name as device_name,
        d.location as device_location,
        u.id as user_id,
        u.name as user_name,
        u.role as user_role,
        u.active as user_active
      FROM access_logs l
      LEFT JOIN devices d ON l.device_id = d.id
      LEFT JOIN users u ON u.device_id = l.device_id AND u.fingerprint_id = l.fingerprint_id
      ${whereSql}
      ORDER BY l.timestamp DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limitNum, offset);

    const dataRes = await db.query(dataSql, params);

    return res.json({
      logs: dataRes.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    console.error('Error fetching logs:', err);
    return res.status(500).json({ error: 'Failed to fetch access logs' });
  }
});

/**
 * GET /api/logs/stats
 * Overview numbers for the admin dashboard header
 */
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayScansRes, totalUsersRes, devicesRes, pendingUnlocksRes] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM access_logs WHERE timestamp >= $1', [today]),
      db.query('SELECT COUNT(*) as count FROM users WHERE active = true'),
      db.query('SELECT id, last_seen_at FROM devices'),
      db.query("SELECT COUNT(*) as count FROM unlock_commands WHERE status = 'pending'"),
    ]);

    const now = Date.now();
    let onlineCount = 0;
    devicesRes.rows.forEach((d) => {
      const last = d.last_seen_at ? new Date(d.last_seen_at).getTime() : 0;
      if (now - last < 20000) onlineCount++;
    });

    return res.json({
      today_scans: parseInt(todayScansRes.rows[0].count, 10),
      active_users: parseInt(totalUsersRes.rows[0].count, 10),
      total_devices: devicesRes.rows.length,
      online_devices: onlineCount,
      pending_unlocks: parseInt(pendingUnlocksRes.rows[0].count, 10),
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

module.exports = router;
