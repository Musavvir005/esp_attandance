const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app } = require('../src/server');
const db = require('../src/config/db');

// Multi-device test fixture
const mockDevices = [
  { id: 1, name: 'ROOM_1', secret_key: 'key_room1_secret_abc', location: 'Design Studio 101', last_seen_at: null },
  { id: 2, name: 'ROOM_2', secret_key: 'key_room2_secret_xyz', location: 'Hardware Bay 202', last_seen_at: null },
];

const mockLogs = [];
const mockUsers = [
  { id: 1, fingerprint_id: 17, device_id: 1, name: 'Alice (Room 1 Lead)', role: 'admin', active: true },
  { id: 2, fingerprint_id: 17, device_id: 2, name: 'Bob (Room 2 Tech)', role: 'member', active: true },
];
const mockCommands = [];

// Intercept db.query during test runs
db.query = async (text, params = []) => {
  const queryStr = text.trim();

  // Multi-device device authentication (dir + key match)
  if (queryStr.includes('FROM devices WHERE name = $1 AND secret_key = $2')) {
    const dev = mockDevices.find((d) => d.name === params[0] && d.secret_key === params[1]);
    return { rows: dev ? [dev] : [] };
  }

  // Legacy fallback if secret_key alone tested
  if (queryStr.includes('FROM devices WHERE secret_key = $1')) {
    const dev = mockDevices.find((d) => d.secret_key === params[0]);
    return { rows: dev ? [dev] : [] };
  }

  // Update last_seen_at
  if (queryStr.includes('UPDATE devices SET last_seen_at = NOW()')) {
    const dev = mockDevices.find((d) => d.id === params[0]);
    if (dev) dev.last_seen_at = new Date();
    return { rows: [dev] };
  }

  // Ingest access log (scoped by device_id)
  if (queryStr.includes('INSERT INTO access_logs')) {
    const newLog = {
      id: mockLogs.length + 1,
      fingerprint_id: params[0],
      device_id: params[1],
      event_type: params[2],
      timestamp: params[3],
      raw_date: params[4],
      raw_time: params[5],
      created_at: new Date(),
    };
    mockLogs.push(newLog);
    return { rows: [newLog] };
  }

  // Atomic check-unlock: consumes pending command strictly for params[0] (device_id)
  if (queryStr.includes('UPDATE unlock_commands') && queryStr.includes("status = 'consumed'")) {
    const targetDeviceId = params[0];
    const pendingCmd = mockCommands.find(
      (c) => c.device_id === targetDeviceId && c.status === 'pending'
    );
    if (pendingCmd) {
      pendingCmd.status = 'consumed';
      pendingCmd.consumed_at = new Date();
      return { rows: [pendingCmd] };
    }
    return { rows: [] };
  }

  // Insert unlock command
  if (queryStr.includes('INSERT INTO unlock_commands')) {
    const newCmd = {
      id: mockCommands.length + 1,
      device_id: params[0],
      status: params[1],
      created_at: new Date(),
    };
    mockCommands.push(newCmd);
    return { rows: [newCmd] };
  }

  // Select device by id
  if (queryStr.includes('SELECT id, name FROM devices WHERE id = $1')) {
    const dev = mockDevices.find((d) => d.id === params[0]);
    return { rows: dev ? [dev] : [] };
  }

  // Expire stale commands
  if (queryStr.includes("SET status = 'expired'")) {
    return { rows: [] };
  }

  // List devices
  if (queryStr.includes('FROM devices d')) {
    return {
      rows: mockDevices.map((d) => ({
        ...d,
        user_count: mockUsers.filter((u) => u.device_id === d.id).length,
        pending_unlocks: mockCommands.filter((c) => c.device_id === d.id && c.status === 'pending').length,
      })),
    };
  }

  // Users query
  if (queryStr.includes('FROM users u')) {
    let rows = mockUsers.map((u) => {
      const dev = mockDevices.find((d) => d.id === u.device_id);
      return { ...u, device_name: dev ? dev.name : '' };
    });
    if (params[0]) {
      rows = rows.filter((u) => u.device_id === parseInt(params[0], 10));
    }
    return { rows };
  }

  // Logs query
  if (queryStr.includes('FROM access_logs l')) {
    let filtered = mockLogs.map((l) => {
      const dev = mockDevices.find((d) => d.id === l.device_id);
      const user = mockUsers.find((u) => u.device_id === l.device_id && u.fingerprint_id === l.fingerprint_id);
      return {
        ...l,
        device_name: dev ? dev.name : '',
        user_name: user ? user.name : null,
      };
    });
    if (params.length > 0 && typeof params[0] === 'number') {
      filtered = filtered.filter((l) => l.device_id === params[0]);
    }
    if (queryStr.includes('COUNT(*) as total')) {
      return { rows: [{ total: filtered.length }] };
    }
    return { rows: filtered };
  }

  return { rows: [] };
};

test('MULTI-DEVICE ISOLATION: Strict dir + key Authentication', async (t) => {
  await t.test('rejects request if dir is missing', async () => {
    const res = await request(app).get('/log?id=17&date=2026-09-15&time=14:32:07&key=key_room1_secret_abc');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.text.includes('Missing room name (dir)'), true);
  });

  await t.test('rejects request if key is missing', async () => {
    const res = await request(app).get('/log?id=17&date=2026-09-15&time=14:32:07&dir=ROOM_1');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.text.includes('Missing room name (dir) or device key (key)'), true);
  });

  await t.test('rejects cross-room mismatch (ROOM_1 dir with ROOM_2 key)', async () => {
    // Attempting to use ROOM_2's key on ROOM_1
    const res = await request(app)
      .get('/log?id=17&date=2026-09-15&time=14:32:07&dir=ROOM_1&key=key_room2_secret_xyz');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.text.includes('mismatch'), true);
  });

  await t.test('accepts valid scan for ROOM_1 with matching key', async () => {
    const res = await request(app)
      .get('/log?id=17&date=2026-09-15&time=14:32:07&dir=ROOM_1&key=key_room1_secret_abc');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.text, 'OK');
    assert.strictEqual(mockLogs.length, 1);
    assert.strictEqual(mockLogs[0].device_id, 1);
    assert.strictEqual(mockLogs[0].fingerprint_id, 17);
  });

  await t.test('accepts valid scan for ROOM_2 with matching key and isolates device_id', async () => {
    const res = await request(app)
      .get('/log?id=17&date=2026-09-15&time=14:35:10&dir=ROOM_2&key=key_room2_secret_xyz');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.text, 'OK');
    assert.strictEqual(mockLogs.length, 2);
    assert.strictEqual(mockLogs[1].device_id, 2);
    assert.strictEqual(mockLogs[1].fingerprint_id, 17);
  });
});

test('MULTI-DEVICE ISOLATION: Remote Unlock Polling & Queue Isolation', async (t) => {
  await t.test('both rooms return "false" initially when no unlock is pending', async () => {
    const r1 = await request(app).get('/check-unlock?dir=ROOM_1&key=key_room1_secret_abc');
    assert.strictEqual(r1.status, 200);
    assert.strictEqual(r1.text, 'false');

    const r2 = await request(app).get('/check-unlock?dir=ROOM_2&key=key_room2_secret_xyz');
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.text, 'false');
  });

  await t.test('unlock queued for ROOM_1 does NOT unlock ROOM_2', async () => {
    // Queue an unlock for ROOM_1 (device_id: 1)
    mockCommands.push({ id: 201, device_id: 1, status: 'pending', created_at: new Date() });

    // ROOM_2 polls check-unlock -> MUST return "false"! (ROOM_1 unlock is untouched)
    const r2Poll = await request(app).get('/check-unlock?dir=ROOM_2&key=key_room2_secret_xyz');
    assert.strictEqual(r2Poll.status, 200);
    assert.strictEqual(r2Poll.text, 'false');
    assert.strictEqual(r2Poll.text.indexOf('true'), -1);

    // Verify command for ROOM_1 is still pending
    const cmd = mockCommands.find((c) => c.id === 201);
    assert.strictEqual(cmd.status, 'pending');

    // ROOM_1 polls check-unlock -> MUST return "true" and consume the command
    const r1Poll = await request(app).get('/check-unlock?dir=ROOM_1&key=key_room1_secret_abc');
    assert.strictEqual(r1Poll.status, 200);
    assert.strictEqual(r1Poll.text, 'true');
    assert.strictEqual(r1Poll.text.indexOf('true') >= 0, true);
    assert.strictEqual(cmd.status, 'consumed');

    // Immediate second poll by ROOM_1 -> returns "false"
    const r1NextPoll = await request(app).get('/check-unlock?dir=ROOM_1&key=key_room1_secret_abc');
    assert.strictEqual(r1NextPoll.status, 200);
    assert.strictEqual(r1NextPoll.text, 'false');
    assert.strictEqual(r1NextPoll.text.indexOf('true'), -1);
  });
});
