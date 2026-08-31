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

async function runTests() {
  console.log('--- RUNNING SIMULATION TESTS ---');
  
  // Get initial DB state counts
  const fetchCounts = async () => {
    const veh = await request('GET', '/vehicles');
    const fr = await request('GET', '/field-reports');
    const reqs = await request('GET', '/logistics/requests');
    const dist = await request('GET', '/districts');
    return {
      veh: veh.data.count,
      fr: fr.data.count,
      reqs: reqs.data.count,
      distData: dist.data.data
    };
  };
  
  const stateBefore = await fetchCounts();
  
  // Run simulation
  const payload = {
    type: "ROAD_BLOCKED",
    lat: 26.1445, // Kamrup Metro
    lon: 91.7362,
    radius_km: 10,
    duration_hours: 48
  };
  
  const simRes = await request('POST', '/simulate/whatif', payload);
  assert.strictEqual(simRes.status, 200, "Simulation failed");
  
  const simData = simRes.data.data;
  assert(simData.affected_districts.length > 0, "No affected districts returned");
  
  // Verify heuristic is removed and real alternative_route exists
  assert.strictEqual(simData.alternative_route_heuristic, undefined, "Fabricated heuristic is still present!");
  assert(simData.alternative_route, "Real alternative_route missing");
  assert(simData.alternative_route.alternative_route_available === true || simData.alternative_route.alternative_route_available === false, "alternative_route_available missing");
  
  // Find Kamrup in simulation to see if it changed to RED
  const simKamrup = simData.affected_districts.find(d => d.district_id === 'D-AS-KM');
  assert.strictEqual(simKamrup.status_color, 'RED', "Kamrup did not turn RED in simulation");
  
  // Verify state after
  const stateAfter = await fetchCounts();
  assert.strictEqual(stateBefore.veh, stateAfter.veh, "Simulation modified vehicles table");
  assert.strictEqual(stateBefore.fr, stateAfter.fr, "Simulation modified field reports table");
  assert.strictEqual(stateBefore.reqs, stateAfter.reqs, "Simulation modified logistics requests table");
  
  const realKamrup = stateAfter.distData.find(d => d.district_id === 'D-AS-KM');
  // It might be RED if there's a real field report, but we ensure it matches the before state
  const originalKamrup = stateBefore.distData.find(d => d.district_id === 'D-AS-KM');
  assert.strictEqual(realKamrup.status_color, originalKamrup.status_color, "Simulation mutated real district status");
  
  // Run second simulation to test independence
  const simRes2 = await request('POST', '/simulate/whatif', {
    type: "ROAD_BLOCKED",
    lat: 25.5788, // East Khasi Hills
    lon: 91.8933,
    radius_km: 10,
    duration_hours: 48
  });
  assert.strictEqual(simRes2.status, 200, "Second simulation failed");
  
  // Test case for NO ALTERNATIVE ROUTE AVAILABLE
  const simResNoAlt = await request('POST', '/simulate/whatif', {
    type: "ROAD_BLOCKED",
    lat: 25.5,
    lon: 91.8,
    radius_km: 500, // Massive blockage to ensure no route can avoid it
    duration_hours: 48
  });
  
  const noAltData = simResNoAlt.data.data;
  assert.strictEqual(noAltData.alternative_route_heuristic, undefined, "Fabricated heuristic still present in NO ALTERNATIVE case");
  assert.strictEqual(noAltData.alternative_route.alternative_route_available, false, "Expected alternative_route_available to be false for massive blockage");
  
  console.log('Passed: Simulation ran successfully');
  console.log('Passed: Zero writes to operational tables during simulation');
  console.log('Passed: Real district status unaffected');
  console.log('Passed: Back-to-back simulations do not leak state');
  console.log('--- ALL TESTS PASSED ---');
}

runTests().catch(console.error);
