const env = require('./env');

let pool = null;

if (env.DATABASE_URL) {
  if (env.DATABASE_URL.includes('neon.tech')) {
    // Neon Serverless Pool using WebSocket transport (bypasses ISP/firewall port 5432 resets)
    const { Pool, neonConfig } = require('@neondatabase/serverless');
    const ws = require('ws');
    neonConfig.webSocketConstructor = ws;

    pool = new Pool({
      connectionString: env.DATABASE_URL,
    });
    console.log('🔌 Connected to Neon Postgres (Serverless Pool)');
  } else {
    // Standard PostgreSQL Pool (pg)
    const { Pool } = require('pg');
    const isSsl = env.DATABASE_URL.includes('sslmode=require') || 
                  env.DATABASE_URL.includes('render.com') || 
                  env.DATABASE_URL.includes('supabase.co') ||
                  env.NODE_ENV === 'production';

    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: isSsl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    console.log('🔌 Connected to PostgreSQL via pg.Pool');
  }

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
} else {
  console.log('\x1b[33m%s\x1b[0m', '⚠️  DATABASE_URL is not set. Set DATABASE_URL in .env to connect to your PostgreSQL database.');
}

/**
 * Execute a SQL query with parameters
 */
const query = async (text, params = []) => {
  if (!pool) {
    throw new Error('Database not configured. Please set DATABASE_URL in your .env file.');
  }
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('Executed PostgreSQL query', { text, duration, rows: res.rowCount });
  }
  return res;
};

/**
 * Get a client from the pool for transactions
 */
const getClient = async () => {
  if (!pool) {
    throw new Error('Database not configured. Please set DATABASE_URL.');
  }
  return await pool.connect();
};

module.exports = {
  query,
  getClient,
  pool,
};
