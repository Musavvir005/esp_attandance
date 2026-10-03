const express = require('express');
const router = express.Router();
const db = require('../config/db');
const deviceAuth = require('../middleware/deviceAuth');
const { checkUnlockLimiter, logLimiter } = require('../middleware/rateLimit');

/**
 * GET /log?id=17&date=2026-09-15&time=14:32:07&dir=FUN_LAB
 * Ingests fingerprint scan event from ESP32.
 */
router.get('/log', logLimiter, deviceAuth, async (req, res) => {
  const { id, date, time } = req.query;

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

    // Auto-create all enrolled user slots (1 to fingerprintId) as "Unknown User #<ID>" if not already mapped
    if (fingerprintId <= 127) {
      await db.query(
        `INSERT INTO users (fingerprint_id, device_id, name, role, active)
         SELECT 
           s.slot,
           $1,
           'Unknown User #' || s.slot,
           CASE WHEN s.slot <= 3 THEN 'admin' ELSE 'member' END,
           true
         FROM generate_series(1, LEAST($2::int, 127)) as s(slot)
         ON CONFLICT (device_id, fingerprint_id) DO NOTHING`,
        [req.device.id, fingerprintId]
      );
    }

    return res.status(200).type('text/plain').send('OK');
  } catch (err) {
    console.error('Error recording access log:', err);
    return res.status(500).type('text/plain').send('Internal Server Error');
  }
});

/**
 * GET /check-unlock?dir=FUN_LAB
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

/**
 * GET /enroll?id=5&dir=FUN_LAB
 * Called by ESP32 immediately after a new fingerprint is enrolled into sensor flash.
 * Creates Unknown User slots for IDs 1..id so they appear in User Directory instantly
 * — without waiting for a login/scan event.
 */
router.get('/enroll', logLimiter, deviceAuth, async (req, res) => {
  const { id } = req.query;

  const fingerprintId = parseInt(id, 10);
  if (isNaN(fingerprintId) || fingerprintId < 1 || fingerprintId > 127) {
    return res.status(400).type('text/plain').send('Bad Request: Invalid fingerprint ID (must be 1-127)');
  }

  try {
    // Create Unknown User slots for IDs 1 through fingerprintId (no duplicates)
    const result = await db.query(
      `INSERT INTO users (fingerprint_id, device_id, name, role, active)
       SELECT 
         s.slot,
         $1,
         'Unknown User #' || s.slot,
         CASE WHEN s.slot <= 3 THEN 'admin' ELSE 'member' END,
         true
       FROM generate_series(1, LEAST($2::int, 127)) as s(slot)
       ON CONFLICT (device_id, fingerprint_id) DO NOTHING`,
      [req.device.id, fingerprintId]
    );

    console.log(`[Enroll] Device '${req.device.name}': synced slots 1-${fingerprintId} (${result.rowCount} new)`);
    return res.status(200).type('text/plain').send('OK');
  } catch (err) {
    console.error('Error processing enrollment sync:', err);
    return res.status(500).type('text/plain').send('Internal Server Error');
  }
});

module.exports = router;
