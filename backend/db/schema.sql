-- ESP32 Biometric Door Lock Database Schema

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    secret_key VARCHAR(64) NOT NULL UNIQUE,
    location VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    fingerprint_id INTEGER NOT NULL CHECK (fingerprint_id >= 1 AND fingerprint_id <= 127),
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_device_fingerprint UNIQUE (device_id, fingerprint_id)
);

CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    fingerprint_id INTEGER NOT NULL,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    event_type VARCHAR(50) DEFAULT 'fingerprint_scan',
    timestamp TIMESTAMPTZ NOT NULL,
    raw_date VARCHAR(20),
    raw_time VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS unlock_commands (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'consumed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    consumed_at TIMESTAMPTZ
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_devices_secret_key ON devices(secret_key);
CREATE INDEX IF NOT EXISTS idx_devices_name ON devices(name);
CREATE INDEX IF NOT EXISTS idx_access_logs_device_timestamp ON access_logs(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_fingerprint ON access_logs(fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_unlock_commands_pending ON unlock_commands(device_id, status) WHERE status = 'pending';
