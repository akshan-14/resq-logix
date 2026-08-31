const http = require('http');
const assert = require("assert").strict;

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
  console.log("--- RUNNING DELIVERY CONFIRMATION TESTS ---");

  const rid = "REQ-DEL-" + Date.now();
  const vid = "VEH-DEL-" + Date.now();
  const wid = "WH-DEL-" + Date.now();

  const resList = await request("GET", "/resources");
  const waterRes = resList.data.data.find(r => r.quantity > 100);
  const actualWid = waterRes.warehouse_id;
  const actualResource = waterRes.resource_type;

  // 1. Create a logistics request
  const reqRes = await request("POST", "/logistics/requests", {
    request_id: rid,
    destination: "Test Delivery Location",
    latitude: 25.0,
    longitude: 91.0,
    requested_resource: actualResource,
    quantity: 10,
    unit: waterRes.unit,
    priority: "HIGH"
  });

  // 2. Create a vehicle
  const vehRes = await request("POST", "/vehicles", {
    vehicle_id: vid,
    vehicle_type: "TRUCK",
    capacity: 1000,
    capacity_unit: "Liters",
    current_latitude: 25.1,
    current_longitude: 91.1,
    current_location: "Test Depot"
  });

  // 3. Assign the vehicle to request (Simulate dispatcher action)
  const assignRes = await request("PATCH", `/logistics/requests/${rid}`, {
    status: "ASSIGNED",
    assigned_vehicle_id: vid,
    source_warehouse_id: actualWid
  });
  console.log("Assign Req:", assignRes);
  assert.strictEqual(assignRes.status, 200, "Failed to assign vehicle");

  const transitRes = await request("PATCH", `/logistics/requests/${rid}`, {
    status: "IN_TRANSIT"
  });
  assert.strictEqual(transitRes.status, 200, "Failed to mark in transit");

  // 3b. Try to deliver without GPS provenance (Simulate missing/denied permissions)
  const deliverMissingGpsRes = await request("PATCH", `/logistics/requests/${rid}/deliver`, {
    timestamp: new Date().toISOString()
    // latitude, longitude missing
  });
  assert.strictEqual(deliverMissingGpsRes.status, 400, "Should block delivery without GPS coordinates");
  console.log("Passed: Delivery confirmation blocked when GPS provenance is missing");

  // 4. Mark Delivered (Valid)
  const deliverRes = await request("PATCH", `/logistics/requests/${rid}/deliver`, {
    latitude: 25.01,
    longitude: 91.01,
    timestamp: new Date().toISOString()
  });
  assert.strictEqual(deliverRes.status, 200, "Failed to mark delivered");
  assert.strictEqual(deliverRes.data.status, "DELIVERED");
  assert.strictEqual(deliverRes.data.vehicle_freed, vid);

  // 5. Verify Request State
  const verifyReq = await request("GET", `/logistics/requests/${rid}`);
  assert.strictEqual(verifyReq.data.data.status, "DELIVERED", "Request status not DELIVERED");
  assert.strictEqual(verifyReq.data.data.delivery_latitude, 25.01, "Delivery GPS not saved");

  // 6. Verify Vehicle State
  const verifyVeh = await request("GET", `/vehicles/${vid}`);
  assert.strictEqual(verifyVeh.data.data.status, "AVAILABLE", "Vehicle status not AVAILABLE");

  // 7. Test blocking bad state
  const deliverResBad = await request("PATCH", `/logistics/requests/${rid}/deliver`, {
    latitude: 25.01,
    longitude: 91.01,
    timestamp: new Date().toISOString()
  });
  assert.strictEqual(deliverResBad.status, 400, "Should block duplicate delivery");

  console.log("Passed: Delivery confirmation loop successfully transitions states");
  console.log("Passed: Provenance (GPS+Time) accurately recorded");
  console.log("Passed: Vehicle automatically freed for reassignment");
  console.log("--- ALL TESTS PASSED ---");
}

runTests().catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
