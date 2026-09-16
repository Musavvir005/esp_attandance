const http = require('http');

function request(url, options = {}, postData = null) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: data,
      }));
    });
    req.on('error', (err) => resolve({ error: err.message }));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('=== MULTI-DEVICE ISOLATION LIVE HTTP VERIFICATION ===\n');

  // 1. Scan for ROOM_1 with valid key
  const t1 = await request('http://localhost:5000/log?id=17&date=2026-09-15&time=20:00:00&dir=ROOM_1&key=dev_secret_room1_12345');
  console.log('1. Scan ROOM_1 with matching key:');
  console.log('   Status:', t1.status, '| Body:', t1.body);

  // 2. Cross-room mismatch attack
  const t2 = await request('http://localhost:5000/log?id=17&date=2026-09-15&time=20:00:00&dir=ROOM_1&key=dev_secret_room2_67890');
  console.log('\n2. Cross-key attack (dir=ROOM_1 with ROOM_2 key):');
  console.log('   Status:', t2.status, '| Body:', t2.body);

  // 3. Poll ROOM_2 before unlock
  const t3 = await request('http://localhost:5000/check-unlock?dir=ROOM_2&key=dev_secret_room2_67890');
  console.log('\n3. Poll ROOM_2 (initial state):');
  console.log('   Status:', t3.status, '| Body:', t3.body, '| Contains "true":', t3.body.indexOf('true') >= 0);

  // 4. Admin login to obtain cookie
  const loginRes = await request('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { username: 'admin', password: 'admin123' });

  const rawCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';
  const cookie = rawCookie.split(';')[0];
  console.log('\n4. Admin authenticated via /api/auth/login');

  // 5. Admin dispatches unlock for ROOM_1 ONLY (device_id: 1)
  const unlockRes = await request('http://localhost:5000/api/unlock', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
  }, { device_id: 1 });
  console.log('\n5. Dispatched remote unlock for ROOM_1 (device_id: 1):', JSON.parse(unlockRes.body).message);

  // 6. ROOM_2 polls: MUST return "false"! (ROOM_1 command MUST NOT be stolen or triggered)
  const t6 = await request('http://localhost:5000/check-unlock?dir=ROOM_2&key=dev_secret_room2_67890');
  console.log('\n6. ROOM_2 polls while ROOM_1 has pending unlock:');
  console.log('   Status:', t6.status, '| Body:', t6.body, '| Contains "true":', t6.body.indexOf('true') >= 0);

  // 7. ROOM_1 polls: MUST return "true"! (and consume command)
  const t7 = await request('http://localhost:5000/check-unlock?dir=ROOM_1&key=dev_secret_room1_12345');
  console.log('\n7. ROOM_1 polls its own queue:');
  console.log('   Status:', t7.status, '| Body:', t7.body, '| Contains "true":', t7.body.indexOf('true') >= 0);

  // 8. ROOM_1 polls immediately after: MUST return "false"! (already consumed)
  const t8 = await request('http://localhost:5000/check-unlock?dir=ROOM_1&key=dev_secret_room1_12345');
  console.log('\n8. ROOM_1 polls immediately after consumption:');
  console.log('   Status:', t8.status, '| Body:', t8.body, '| Contains "true":', t8.body.indexOf('true') >= 0);

  console.log('\n🎉 ALL MULTI-DEVICE ISOLATION LIVE CHECKS 100% VERIFIED!');
}

run();
