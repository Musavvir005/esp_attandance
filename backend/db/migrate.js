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
