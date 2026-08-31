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
    if (body) options.headers['Content-Type'] = 'application/json';

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

function generateReport(id, devId, type, lat, lon) {
  return {
    report_id: id,
    report_type: type,
    severity: 'HIGH',
    latitude: lat,
    longitude: lon,
    timestamp: new Date().toISOString(),
    device_id: devId
  };
}

async function runTests() {
  console.log('--- RUNNING CROWDSOURCED INTELLIGENCE TESTS ---');
  
  // 1. Submit reports for consensus
  const baseLat = 26.0 + (Math.random() * 0.1);
  const baseLon = 91.0 + (Math.random() * 0.1);
  const tSuffix = Date.now().toString();
  
  // R1: Initial report
  let res = await request('POST', `/field-reports`, generateReport('REP-CONS-1-' + tSuffix, 'dev-1-' + tSuffix, 'ROAD_BLOCKED', baseLat, baseLon));
  assert.strictEqual(res.status, 201);
  
  // Check consensus -> Should be LOW
  res = await request('GET', '/field-reports?consensus=true');
  let rep1 = res.data.data.find(r => r.report_id === 'REP-CONS-1-' + tSuffix);
  assert.strictEqual(rep1.consensus_tier, 'LOW');
  console.log('Passed: Single unverified report is LOW consensus');
  
  // R2: Second independent report (same location, same type)
  await request('POST', `/field-reports`, generateReport('REP-CONS-2-' + tSuffix, 'dev-2-' + tSuffix, 'ROAD_BLOCKED', baseLat + 0.001, baseLon + 0.001));
  res = await request('GET', '/field-reports?consensus=true');
  rep1 = res.data.data.find(r => r.report_id === 'REP-CONS-1-' + tSuffix);
  assert.strictEqual(rep1.consensus_tier, 'MEDIUM');
  console.log('Passed: Two independent reports escalate to MEDIUM');
  
  // R3: Third independent report (same location, same type)
  await request('POST', `/field-reports`, generateReport('REP-CONS-3-' + tSuffix, 'dev-3-' + tSuffix, 'ROAD_BLOCKED', baseLat, baseLon));
  res = await request('GET', '/field-reports?consensus=true');
  rep1 = res.data.data.find(r => r.report_id === 'REP-CONS-1-' + tSuffix);
  assert.strictEqual(rep1.consensus_tier, 'HIGH');
  console.log('Passed: Three independent reports escalate to HIGH');
  
  // R4: Official Report Test (Valid Code)
  const officialPayload = generateReport('REP-OFFICIAL-1-' + tSuffix, 'dev-off-1-' + tSuffix, 'FLOODED', baseLat + 0.5, baseLon + 0.5);
  officialPayload.reporter_role = 'OFFICIAL';
  officialPayload.access_code = 'SIH26002_DEMO';
  await request('POST', `/field-reports`, officialPayload);
  
  res = await request('GET', '/field-reports?consensus=true');
  let offRep = res.data.data.find(r => r.report_id === 'REP-OFFICIAL-1-' + tSuffix);
  assert.strictEqual(offRep.consensus_tier, 'MEDIUM');
  assert.strictEqual(offRep.status, 'UNVERIFIED'); // should not auto-verify
  console.log('Passed: Single OFFICIAL report with valid code starts at MEDIUM');

  // R4b: Official Report Test (Invalid Code)
  const invalidOfficialPayload = generateReport('REP-OFFICIAL-INVALID-' + tSuffix, 'dev-off-invalid-' + tSuffix, 'FLOODED', baseLat + 0.6, baseLon + 0.6);
  invalidOfficialPayload.reporter_role = 'OFFICIAL';
  invalidOfficialPayload.access_code = 'WRONG_CODE';
  await request('POST', `/field-reports`, invalidOfficialPayload);
  
  res = await request('GET', '/field-reports?consensus=true');
  let invalidOffRep = res.data.data.find(r => r.report_id === 'REP-OFFICIAL-INVALID-' + tSuffix);
  assert.strictEqual(invalidOffRep.reporter_role, 'FIELD_RESPONDER');
  assert.strictEqual(invalidOffRep.consensus_tier, 'LOW');
  console.log('Passed: OFFICIAL report with invalid code falls back to FIELD_RESPONDER and LOW tier');

  // R5: Duplicate report from dev-3
  await request('POST', `/field-reports`, generateReport('REP-CONS-4-' + tSuffix, 'dev-3-' + tSuffix, 'ROAD_BLOCKED', baseLat, baseLon));
  res = await request('GET', '/field-reports?consensus=true');
  rep1 = res.data.data.find(r => r.report_id === 'REP-CONS-1-' + tSuffix);
  assert.strictEqual(rep1.consensus_tier, 'HIGH');
  console.log('Passed: Duplicate report from same device does not inflate consensus');
  
  // 2. Test Verification Actions
  res = await request('PATCH', `/field-reports/REP-CONS-1-${tSuffix}/verify`, { status: 'VERIFIED' });
  assert.strictEqual(res.status, 200);
  res = await request('GET', '/field-reports?consensus=true');
  rep1 = res.data.data.find(r => r.report_id === 'REP-CONS-1-' + tSuffix);
  assert.strictEqual(rep1.consensus_tier, 'VERIFIED');
  console.log('Passed: Dispatcher VERIFIED action correctly applies status');
  
  res = await request('PATCH', `/field-reports/REP-CONS-2-${tSuffix}/verify`, { status: 'REJECTED' });
  assert.strictEqual(res.status, 200);
  res = await request('GET', '/field-reports?consensus=true');
  let rep2 = res.data.data.find(r => r.report_id === 'REP-CONS-2-' + tSuffix);
  assert.strictEqual(rep2.consensus_tier, 'REJECTED');
  console.log('Passed: Dispatcher REJECTED action correctly applies status');
  
  console.log('--- ALL TESTS PASSED ---');
}

runTests().catch(console.error);
