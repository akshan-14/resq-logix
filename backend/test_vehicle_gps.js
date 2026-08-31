const http = require('http');
const assert = require('assert');

const API_BASE = 'http://localhost:3000/api/v1';

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {}
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- RUNNING VEHICLE GPS TESTS ---');
  let vehicleId = 'V001'; // Should exist from seeds

  // 1. Test missing data
  console.log('Test 1: Submit missing coordinates');
  let res = await request('POST', `/vehicles/${vehicleId}/locations`, [{ gps_timestamp: new Date().toISOString() }]);
  assert.strictEqual(res.status, 400);
  console.log('Passed: Rejected missing coordinates');

  // 2. Test invalid vehicle
  console.log('Test 2: Submit to invalid vehicle');
  res = await request('POST', `/vehicles/INVALID_V/locations`, [{ latitude: 10, longitude: 10, gps_timestamp: new Date().toISOString() }]);
  assert.strictEqual(res.status, 400);
  console.log('Passed: Rejected invalid vehicle');

  // 3. Test valid batch submission
  console.log('Test 3: Valid batch submission');
  const now = new Date();
  const past = new Date(now.getTime() - 60000);
  const points = [
    { latitude: 25.1, longitude: 91.1, gps_timestamp: past.toISOString() },
    { latitude: 25.2, longitude: 91.2, gps_timestamp: now.toISOString() }
  ];
  res = await request('POST', `/vehicles/${vehicleId}/locations`, points);
  assert.strictEqual(res.status, 201);
  console.log('Passed: Accepted valid batch');

  // 4. Test latest reflects the latest point
  console.log('Test 4: Latest location updated');
  res = await request('GET', `/vehicles/locations/latest`);
  assert.strictEqual(res.status, 200);
  const v = res.data.data.find(x => x.vehicle_id === vehicleId);
  assert.ok(v);
  assert.strictEqual(v.latitude, 25.2);
  assert.strictEqual(v.gps_status, 'LIVE'); // We just updated it
  console.log('Passed: Latest location reflects newest gps_timestamp and is LIVE');

  console.log('--- ALL TESTS PASSED ---');
}

runTests().catch(console.error);
