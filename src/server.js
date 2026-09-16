const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { runMigrations } = require('./db/migrate');

// Route modules
const deviceRoutes = require('./routes/device');
const authRoutes = require('./routes/auth');
const devicesRoutes = require('./routes/devices');
const usersRoutes = require('./routes/users');
const unlockRoutes = require('./routes/unlock');
const logsRoutes = require('./routes/logs');

const app = express();

// Trust proxy on Render/cloud load balancers for rate limiting and secure cookies
app.set('trust proxy', 1);

// Middleware
app.use(morgan('dev'));
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'esp32-door-lock-backend',
  });
});

// Device-facing routes (must match existing ESP32 firmware contracts)
// GET /log?id=17&date=2026-09-15&time=14:32:07&dir=FUN_LAB&key=...
// GET /check-unlock?key=...
app.use('/', deviceRoutes);

// Admin-facing JSON API routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/unlock', unlockRoutes);
app.use('/api/logs', logsRoutes);

// Serve client frontend in production if built
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path === '/log' || req.path === '/check-unlock' || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Helpful fallback during development before frontend is built
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ESP32 Biometric Door Lock Backend</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
            .card { background: #1e293b; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: #38bdf8; margin-top: 0; font-size: 22px; }
            code { background: #334155; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #a5f3fc; }
            .badge { display: inline-block; background: #059669; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
            ul { line-height: 1.8; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">SERVER ACTIVE</span>
            <h1>ESP32 Biometric Door Lock Backend</h1>
            <p>Device routes and Admin APIs are ready:</p>
            <ul>
              <li><code>GET /check-unlock?key=...</code> - Polled by ESP32</li>
              <li><code>GET /log?id=..&date=..&time=..&dir=..&key=..</code> - Fingerprint logs</li>
              <li><code>POST /api/auth/login</code> - Admin authentication</li>
              <li><code>/api/devices</code>, <code>/api/users</code>, <code>/api/unlock</code>, <code>/api/logs</code></li>
            </ul>
            <p style="color: #94a3b8; font-size: 13px;">Frontend dashboard is compiling in <code>client/</code>...</p>
          </div>
        </body>
      </html>
    `);
  });
}

// Global 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start Server after migrations
async function startServer() {
  try {
    await runMigrations();
  } catch (err) {
    console.error('Migration failed during startup:', err.message);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 ESP32 Door Lock Backend running on port ${env.PORT}`);
    console.log(`📡 Device log URL:         http://localhost:${env.PORT}/log`);
    console.log(`🔓 Device check-unlock:    http://localhost:${env.PORT}/check-unlock`);
    console.log(`🛡️  Admin Dashboard:        http://localhost:${env.PORT}/`);
    console.log(`====================================================`);
  });

  return { app, server };
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
