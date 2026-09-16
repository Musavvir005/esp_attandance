require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_in_production_key_99',
  COOKIE_NAME: 'doorlock_session',
  RATE_LIMIT_CHECK_PER_MINUTE: parseInt(process.env.RATE_LIMIT_CHECK_PER_MINUTE || '180', 10),
  RATE_LIMIT_LOG_PER_MINUTE: parseInt(process.env.RATE_LIMIT_LOG_PER_MINUTE || '60', 10),
};
