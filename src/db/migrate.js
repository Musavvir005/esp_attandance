const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigrations() {
  if (!db.pool) {
    console.log('Skipping migrations: No DATABASE_URL provided.');
    return;
  }

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running database schema migrations on Neon Postgres...');
    await db.query(sql);
    console.log('✓ Database schema successfully applied.');

    // Seed default devices if empty
    const deviceCheck = await db.query('SELECT COUNT(*) as count FROM devices');
    if (parseInt(deviceCheck.rows[0].count, 10) === 0) {
      console.log('Seeding initial devices for multi-room testing (ROOM_1, ROOM_2, FUN_LAB)...');
      
      const r1 = await db.query(
        'INSERT INTO devices (name, secret_key, location) VALUES ($1, $2, $3) RETURNING *',
        ['ROOM_1', 'dev_secret_room1_12345', 'Design Studio 101']
      );

      const r2 = await db.query(
        'INSERT INTO devices (name, secret_key, location) VALUES ($1, $2, $3) RETURNING *',
        ['ROOM_2', 'dev_secret_room2_67890', 'Hardware Robotics Bay 202']
      );

      const r3 = await db.query(
        'INSERT INTO devices (name, secret_key, location) VALUES ($1, $2, $3) RETURNING *',
        ['FUN_LAB', 'dev_secret_funlab_99999', 'Creative Tech Lounge']
      );

      // Seed sample users per room (fingerprint_id #17 scoped per device)
      await db.query(
        'INSERT INTO users (fingerprint_id, device_id, name, role, active) VALUES ($1, $2, $3, $4, $5)',
        [17, r1.rows[0].id, 'Alice (Lead Designer)', 'admin', true]
      );
      await db.query(
        'INSERT INTO users (fingerprint_id, device_id, name, role, active) VALUES ($1, $2, $3, $4, $5)',
        [42, r1.rows[0].id, 'Jane Smith (Architect)', 'member', true]
      );
      await db.query(
        'INSERT INTO users (fingerprint_id, device_id, name, role, active) VALUES ($1, $2, $3, $4, $5)',
        [17, r2.rows[0].id, 'Bob (Robotics Tech)', 'admin', true]
      );

      console.log('✓ Seeded ROOM_1, ROOM_2, FUN_LAB with isolated secret keys and users.');
    }

    // Confirm all 4 tables exist in information_schema
    const tablesRes = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('devices', 'users', 'access_logs', 'unlock_commands')
      ORDER BY table_name;
    `);

    console.log('✓ Confirmed public tables in Neon DB:', tablesRes.rows.map(r => r.table_name).join(', '));
    return tablesRes.rows;
  } catch (err) {
    console.error('Migration error:', err.message);
    throw err;
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = {
  runMigrations,
};
