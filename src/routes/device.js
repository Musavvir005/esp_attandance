const express = require('express');
const router = express.Router();
const db = require('../config/db');
const deviceAuth = require('../middleware/deviceAuth');
const { checkUnlockLimiter, logLimiter } = require('../middleware/rateLimit');

/**
 * GET /log?id=17&date=2026-09-15&time=14:32:07&dir=FUN_LAB&key=DEVICE_SECRET
 * Ingests fingerprint scan event from ESP32.
 */
router.get('/log', logLimiter, deviceAuth, async (req, res) => {
  const { id, date, time, dir } = req.query;

  const fingerprintId = parseInt(id, 10);
  if (isNaN(fingerprintId) || fingerprintId < 1) {
    return res.status(400).type('text/plain').send('Bad Request: Invalid fingerprint ID');
  }

  // Parse timestamp from ESP32 payload or fallback to current server time
  let eventTimestamp = new Date();
  if (date && time) {
    const candidate = new Date(`${date}T${time}`);
    if (!isNaN(candidate.getTime())) {
      eventTimestamp = candidate;
    }
  }

  try {
    // Insert into access_logs
    await db.query(
      `INSERT INTO access_logs (fingerprint_id, device_id, event_type, timestamp, raw_date, raw_time)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        fingerprintId,
        req.device.id,
        'fingerprint_scan',
        eventTimestamp,
        date || null,
        time || null,
      ]
    );

    // If dir is provided and differs from device.name, note it in logs
    if (dir && dir !== req.device.name) {
      console.warn(`[Device Warning] Device key ${req.device.id} sent dir='${dir}', expected '${req.device.name}'`);
    }

    return res.status(200).type('text/plain').send('OK');
  } catch (err) {
    console.error('Error recording access log:', err);
    return res.status(500).type('text/plain').send('Internal Server Error');
  }
});

/**
 * GET /check-unlock?key=DEVICE_SECRET
 * Polled by ESP32 every 0.5s - 2s.
 * Returns literal text "true" if an unlock command is pending (and immediately consumes it),
 * or literal text "false" if no pending unlock command exists.
 */
router.get('/check-unlock', checkUnlockLimiter, deviceAuth, async (req, res) => {
  try {
    // Atomically find and consume the earliest pending unlock command for this device
    const result = await db.query(
      `UPDATE unlock_commands
       SET status = 'consumed', consumed_at = NOW()
       WHERE id = (
         SELECT id FROM unlock_commands
         WHERE device_id = $1 AND status = 'pending'
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id`,
      [req.device.id]
    );

    if (result.rows.length > 0) {
      console.log(`[Unlock Executed] Consumed command #${result.rows[0].id} for device '${req.device.name}'`);
      // Plain text literal "true"
      return res.status(200).type('text/plain').send('true');
    }

    // Plain text literal "false"
    return res.status(200).type('text/plain').send('false');
  } catch (err) {
    console.error('Error checking unlock status:', err);
    // On server/DB error, return false so the door doesn't accidentally unlock
    return res.status(200).type('text/plain').send('false');
  }
});

module.exports = router;
