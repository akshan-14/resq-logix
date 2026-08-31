const http = require('http');
const assert = require('assert');
const { exec } = require('child_process');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api/v1/field-reports`;

function makeRequest(path, method, body, callback) {
    const options = {
        hostname: 'localhost',
        port: PORT,
        path: `/api/v1/${path}`,
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            let parsed = null;
            try { if (data) parsed = JSON.parse(data); } catch(e) {}
            callback(res.statusCode, parsed);
        });
    });
    
    req.on('error', e => console.error(e));
    if (body) req.write(JSON.stringify(body));
    req.end();
}

async function runTests() {
    console.log("Starting backend Field Reports tests...");
    
    const validReport = {
        report_id: "TEST-REP-001",
        report_type: "ROAD_BLOCKAGE",
        severity: "HIGH",
        latitude: 30.5,
        longitude: 78.5,
        timestamp: new Date().toISOString(),
        created_offline: true,
        device_id: "dev-001"
    };
    
    // 1. Valid Field Report
    await new Promise(r => makeRequest('field-reports', 'POST', validReport, (status, data) => {
        try {
            assert.strictEqual(status, 201);
            assert.strictEqual(data.success, true);
            console.log("PASS: 1. Valid field report");
        } catch(e) { console.error("FAIL: 1", e); }
        r();
    }));
    
    // 7. Duplicate Report
    await new Promise(r => makeRequest('field-reports', 'POST', validReport, (status, data) => {
        try {
            assert.strictEqual(status, 409);
            console.log("PASS: 7. Duplicate report_id rejected");
        } catch(e) { console.error("FAIL: 7", e); }
        r();
    }));
    
    // 2. Invalid Report Type
    const invalidType = { ...validReport, report_id: "TEST-REP-002", report_type: "INVALID_TYPE" };
    await new Promise(r => makeRequest('field-reports', 'POST', invalidType, (status, data) => {
        try {
            assert.strictEqual(status, 400);
            assert.strictEqual(data.details, 'Invalid report type');
            console.log("PASS: 2. Invalid report type rejected");
        } catch(e) { console.error("FAIL: 2", e); }
        r();
    }));
    
    // 3. Invalid Latitude
    const invalidLat = { ...validReport, report_id: "TEST-REP-003", latitude: 100 };
    await new Promise(r => makeRequest('field-reports', 'POST', invalidLat, (status, data) => {
        try {
            assert.strictEqual(status, 400);
            console.log("PASS: 3. Invalid latitude rejected");
        } catch(e) { console.error("FAIL: 3", e); }
        r();
    }));
    
    // 4. Invalid Longitude
    const invalidLon = { ...validReport, report_id: "TEST-REP-004", longitude: 200 };
    await new Promise(r => makeRequest('field-reports', 'POST', invalidLon, (status, data) => {
        try {
            assert.strictEqual(status, 400);
            console.log("PASS: 4. Invalid longitude rejected");
        } catch(e) { console.error("FAIL: 4", e); }
        r();
    }));
    
    // 15. GET reports
    await new Promise(r => makeRequest('field-reports', 'GET', null, (status, data) => {
        try {
            assert.strictEqual(status, 200);
            assert.strictEqual(data.success, true);
            assert.ok(data.data.length >= 1);
            console.log("PASS: 15. GET all reports works");
        } catch(e) { console.error("FAIL: 15", e); }
        r();
    }));
    
    // 16. GET single report
    await new Promise(r => makeRequest('field-reports/TEST-REP-001', 'GET', null, (status, data) => {
        try {
            assert.strictEqual(status, 200);
            assert.strictEqual(data.success, true);
            assert.strictEqual(data.data.report_id, "TEST-REP-001");
            console.log("PASS: 16. GET single report works");
        } catch(e) { console.error("FAIL: 16", e); }
        r();
    }));
}

runTests().then(() => {
    console.log("Finished API tests.");
});
