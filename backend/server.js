const express = require('express');
const cors = require('cors');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'ResQ-Logix Backend is running' });
});

// AI Processing helper
const processAI = (data) => {
  try {
    const aiScript = path.resolve(__dirname, '../ai/classifier.py');
    const jsonStr = JSON.stringify(data).replace(/"/g, '\\"');
    const result = execSync(`python "${aiScript}" "${jsonStr}"`, { encoding: 'utf-8' });
    return JSON.parse(result.trim());
  } catch (error) {
    console.error("AI classification failed:", error.message);
    return { severity_score: 5, severity_level: 'MEDIUM', reasons: ['AI processing failed'] };
  }
};

// --- MESH API ---

// Post a new SOS directly from the gateway
app.post('/api/v1/mesh/send', (req, res) => {
  let { messageId, victimId, latitude, longitude, emergencyType, ttl, hopCount, description, num_victims, is_trapped, is_injured, is_fire } = req.body;
  
  if (!victimId || !emergencyType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  messageId = messageId || uuidv4();
  const timestamp = new Date().toISOString();
  ttl = ttl !== undefined ? ttl : 5;
  hopCount = hopCount || 0;
  const status = 'ACTIVE';

  // Run AI Classifier
  const aiInput = {
    emergency_type: emergencyType,
    description: description || '',
    num_victims: num_victims || 1,
    is_trapped: !!is_trapped,
    is_injured: !!is_injured,
    is_fire: !!is_fire
  };
  const aiResult = processAI(aiInput);

  db.get('SELECT id FROM victims WHERE id = ?', [victimId], (err, row) => {
    if (!row) {
      db.run('INSERT INTO victims (id, name, phone, blood_group) VALUES (?, ?, ?, ?)', [victimId, 'Unknown', 'Unknown', 'Unknown'], () => insertSOS());
    } else {
      insertSOS();
    }
  });

  function insertSOS() {
    const sql = `
      INSERT INTO sos_messages (messageId, victimId, latitude, longitude, emergencyType, severity, timestamp, ttl, hopCount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [messageId, victimId, latitude, longitude, emergencyType, aiResult.severity_score, timestamp, ttl, hopCount, status];
    
    db.run(sql, params, function(err) {
      if (err) return res.status(500).json({ error: 'Database error inserting SOS' });

      // Log arrival at gateway
      db.run(`INSERT INTO relay_events (messageId, sourceNode, currentNode, nextNode, ttl, hopCount, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [messageId, victimId, 'Gateway', 'Backend', ttl, hopCount, timestamp]);

      res.status(201).json({
        status: 'created',
        data: { messageId, victimId, emergencyType, severity: aiResult.severity_score, severity_level: aiResult.severity_level, reasons: aiResult.reasons }
      });
    });
  }
});

// Log a relay event
app.post('/api/v1/mesh/relay', (req, res) => {
  const { messageId, sourceNode, currentNode, nextNode, ttl, hopCount } = req.body;
  const timestamp = new Date().toISOString();

  db.run(`INSERT INTO relay_events (messageId, sourceNode, currentNode, nextNode, ttl, hopCount, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [messageId, sourceNode, currentNode, nextNode, ttl, hopCount, timestamp], function(err) {
      if (err) return res.status(500).json({ error: 'Database error inserting relay event' });
      res.status(201).json({ status: 'success' });
  });
});

// Get routes for an SOS message
app.get('/api/v1/mesh/routes/:messageId', (req, res) => {
  const { messageId } = req.params;
  db.all('SELECT * FROM relay_events WHERE messageId = ? ORDER BY id ASC', [messageId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.status(200).json({ status: 'success', data: rows });
  });
});

// Get all routes
app.get('/api/v1/mesh/routes', (req, res) => {
  db.all('SELECT * FROM relay_events ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.status(200).json({ status: 'success', data: rows });
  });
});

// Trigger mesh simulation script
app.post('/api/v1/mesh/simulate', (req, res) => {
  try {
    const simScript = path.resolve(__dirname, '../mesh/simulation.py');
    // Run the python simulation script in background
    require('child_process').exec(`python "${simScript}"`);
    res.status(200).json({ status: 'success', message: 'Simulation started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start simulation' });
  }
});


// --- DASHBOARD API (Unchanged mostly) ---

app.get('/api/v1/victims', (req, res) => {
  db.all('SELECT * FROM victims', [], (err, rows) => res.status(200).json({ status: 'success', data: rows }));
});

app.get('/api/v1/sos', (req, res) => {
  db.all('SELECT * FROM sos_messages ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.status(200).json({ status: 'success', data: rows });
  });
});

app.get('/api/v1/sos/:messageId', (req, res) => {
  db.get('SELECT * FROM sos_messages WHERE messageId = ?', [req.params.messageId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'SOS message not found' });
    res.status(200).json({ status: 'success', data: row });
  });
});

app.patch('/api/v1/sos/:messageId/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['ACTIVE', 'ACKNOWLEDGED', 'RESCUED', 'CANCELLED'];
  if (!status || !validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  db.run('UPDATE sos_messages SET status = ? WHERE messageId = ?', [status, req.params.messageId], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(200).json({ status: 'success', message: 'Status updated' });
  });
});


// ==========================================
// --- LOGISTICS MANAGEMENT MODULE (PHASE 2) APIs ---
// ==========================================

const VALID_VEHICLE_STATUSES = ['AVAILABLE', 'ON_ROUTE', 'BUSY', 'MAINTENANCE'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VALID_REQUEST_STATUSES = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

// Helper: Log Logistics Audit Event
const logLogisticsEvent = (eventType, { requestId = null, vehicleId = null, warehouseId = null, resourceId = null, details = '' }) => {
  const timestamp = new Date().toISOString();
  db.run(
    `INSERT INTO logistics_events (event_type, request_id, vehicle_id, warehouse_id, resource_id, details, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [eventType, requestId, vehicleId, warehouseId, resourceId, details, timestamp],
    (err) => {
      if (err) console.error('Failed to log logistics event:', err.message);
    }
  );
};


// --- DISTRICTS API ---

app.get('/api/v1/districts', async (req, res) => {
  try {
    const script = path.resolve(__dirname, '../ai/run_district_eval.py');
    const { stdout, stderr } = await execAsync(`python "${script}" ALL`, { encoding: 'utf-8' });
    const result = stdout;
    const jsonStart = result.indexOf('{');
    const jsonEnd = result.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = result.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      if (parsed.error) return res.status(500).json(parsed);
      res.json(parsed);
    } else {
      throw new Error("No JSON found in Python output: " + result + " | stderr: " + stderr);
    }
  } catch (error) {
    console.error("District Evaluation failed:", error.message);
    res.status(500).json({ error: "Failed to evaluate districts. Details: " + error.message });
  }
});

app.get('/api/v1/districts/:id', async (req, res) => {
  try {
    const script = path.resolve(__dirname, '../ai/run_district_eval.py');
    const { stdout, stderr } = await execAsync(`python "${script}" "${req.params.id}"`, { encoding: 'utf-8' });
    const result = stdout;
    const jsonStart = result.indexOf('{');
    const jsonEnd = result.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = result.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      if (parsed.error) {
        if (parsed.error === 'District not found') return res.status(404).json(parsed);
        return res.status(500).json(parsed);
      }
      res.json(parsed);
    } else {
      throw new Error("No JSON found in Python output: " + result + " | stderr: " + stderr);
    }
  } catch (error) {
    console.error("District Evaluation failed:", error.message);
    res.status(500).json({ error: "Failed to evaluate district. Details: " + error.message });
  }
});



// --- SSE REAL-TIME VEHICLE STREAMING ---
let sseClients = [];
let sseInterval = null;

const broadcastVehicles = () => {
  if (sseClients.length === 0) return;
  const sql = `
    SELECT v.*, 
           lr.request_id as mission_id, 
           lr.destination as mission_destination,
           lr.latitude as destination_lat,
           lr.longitude as destination_lng,
           lr.requested_resource as cargo,
           lr.quantity as cargo_quantity,
           lr.unit as cargo_unit,
           lr.priority as cargo_priority
    FROM vehicles v
    LEFT JOIN logistics_requests lr 
      ON v.vehicle_id = lr.assigned_vehicle_id 
      AND lr.status IN ('ASSIGNED', 'IN_TRANSIT')
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return;
    const payload = JSON.stringify({ type: 'VEHICLES_UPDATE', data: rows });
    sseClients.forEach(client => client.res.write(`data: ${payload}

`));
  });
};

app.get('/api/v1/live/vehicles', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); 

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}

`);

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  if (sseClients.length === 1 && !sseInterval) {
    sseInterval = setInterval(broadcastVehicles, 1500);
  }

  req.on('close', () => {
    sseClients = sseClients.filter(client => client.id !== clientId);
    if (sseClients.length === 0 && sseInterval) {
      clearInterval(sseInterval);
      sseInterval = null;
    }
  });
});


// --- VEHICLE LOCATIONS ---

const STALE_THRESHOLD_SECONDS = 300;

app.post('/api/v1/vehicles/:id/locations', (req, res) => {
  const { id } = req.params;
  const locations = req.body;

  if (!Array.isArray(locations) || locations.length === 0) {
    return res.status(400).json({ error: 'Expected an array of location objects.' });
  }

  // 1. Verify vehicle exists
  db.get('SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?', [id], (err, vehicle) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!vehicle) return res.status(400).json({ error: 'Vehicle ID does not exist.' });

    // 2. Validate all points
    for (const loc of locations) {
      if (typeof loc.latitude !== 'number' || loc.latitude < -90 || loc.latitude > 90) {
        return res.status(400).json({ error: 'Invalid or missing latitude.' });
      }
      if (typeof loc.longitude !== 'number' || loc.longitude < -180 || loc.longitude > 180) {
        return res.status(400).json({ error: 'Invalid or missing longitude.' });
      }
      if (!loc.gps_timestamp || isNaN(new Date(loc.gps_timestamp).getTime())) {
        return res.status(400).json({ error: 'Invalid or missing gps_timestamp.' });
      }
    }

    const server_timestamp = new Date().toISOString();
    
    // Sort locations by gps_timestamp to find the latest
    const sortedLocations = [...locations].sort((a, b) => new Date(b.gps_timestamp).getTime() - new Date(a.gps_timestamp).getTime());
    const latestLocation = sortedLocations[0];

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      const insertStmt = db.prepare(`
        INSERT INTO vehicle_locations (vehicle_id, latitude, longitude, speed, heading, gps_timestamp, server_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      locations.forEach(loc => {
        insertStmt.run([
          id, loc.latitude, loc.longitude, loc.speed || null, loc.heading || null, loc.gps_timestamp, server_timestamp
        ]);
      });
      insertStmt.finalize();

      db.run(`
        UPDATE vehicles 
        SET current_latitude = ?, current_longitude = ?, updated_at = ?
        WHERE vehicle_id = ?
      `, [latestLocation.latitude, latestLocation.longitude, server_timestamp, id], (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to update vehicle location' });
        }
        db.run('COMMIT');
        res.status(201).json({ status: 'success', message: 'Locations saved', latest: latestLocation });
      });
    });
  });
});

app.get('/api/v1/vehicles/:id/locations', (req, res) => {
  const { id } = req.params;
  const { since, limit } = req.query;
  
  let sql = 'SELECT * FROM vehicle_locations WHERE vehicle_id = ?';
  const params = [id];

  if (since) {
    sql += ' AND gps_timestamp >= ?';
    params.push(since);
  }
  
  sql += ' ORDER BY gps_timestamp DESC';
  
  if (limit) {
    sql += ' LIMIT ?';
    params.push(Number(limit));
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.status(200).json({ status: 'success', data: rows });
  });
});

app.get('/api/v1/vehicles/locations/latest', (req, res) => {
  const sql = `
    SELECT v.vehicle_id, v.current_latitude, v.current_longitude, v.vehicle_type, vl.server_timestamp, vl.gps_timestamp
    FROM vehicles v
    LEFT JOIN (
      SELECT vehicle_id, server_timestamp, gps_timestamp,
             ROW_NUMBER() OVER(PARTITION BY vehicle_id ORDER BY gps_timestamp DESC) as rn
      FROM vehicle_locations
    ) vl ON v.vehicle_id = vl.vehicle_id AND vl.rn = 1
  `;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    
    const now = new Date().getTime();
    const result = rows.map(row => {
      let gps_status = 'UNAVAILABLE';
      if (row.server_timestamp) {
        const serverTime = new Date(row.server_timestamp).getTime();
        const diffSeconds = (now - serverTime) / 1000;
        gps_status = diffSeconds > STALE_THRESHOLD_SECONDS ? 'STALE' : 'LIVE';
      }
      
      return {
        vehicle_id: row.vehicle_id,
        vehicle_type: row.vehicle_type,
        latitude: row.current_latitude,
        longitude: row.current_longitude,
        server_timestamp: row.server_timestamp,
        gps_timestamp: row.gps_timestamp,
        gps_status
      };
    });
    
    res.status(200).json({ status: 'success', data: result });
  });
});


// --- VEHICLES API ---

// 1. GET /api/v1/vehicles
const getVehiclesHandler = (req, res) => {
  const { status, vehicle_type, availability } = req.query;
  let sql = `
    SELECT v.*, 
           lr.request_id as mission_id, 
           lr.destination as mission_destination,
           lr.latitude as destination_lat,
           lr.longitude as destination_lng,
           lr.requested_resource as cargo,
           lr.quantity as cargo_quantity,
           lr.unit as cargo_unit,
           lr.priority as cargo_priority
    FROM vehicles v
    LEFT JOIN logistics_requests lr 
      ON v.vehicle_id = lr.assigned_vehicle_id 
      AND lr.status IN ('ASSIGNED', 'IN_TRANSIT')
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND v.status = ?';
    params.push(status.toUpperCase());
  }
  if (vehicle_type) {
    sql += ' AND v.vehicle_type LIKE ?';
    params.push(`%${vehicle_type}%`);
  }
  if (availability !== undefined) {
    sql += ' AND v.availability = ?';
    params.push(Number(availability));
  }

  sql += ' ORDER BY v.vehicle_id ASC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error fetching vehicles', details: err.message });
    res.status(200).json({ status: 'success', count: rows.length, data: rows });
  });
};
app.get('/api/v1/vehicles', getVehiclesHandler);
app.get('/vehicles', getVehiclesHandler);

// 2. GET /api/v1/vehicles/:id
const getVehicleByIdHandler = (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM vehicles WHERE vehicle_id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    if (!row) return res.status(404).json({ error: `Vehicle with id ${id} not found` });
    res.status(200).json({ status: 'success', data: row });
  });
};
app.get('/api/v1/vehicles/:id', getVehicleByIdHandler);
app.get('/vehicles/:id', getVehicleByIdHandler);

// 3. POST /api/v1/vehicles
const createVehicleHandler = (req, res) => {
  let {
    vehicle_id,
    vehicle_type,
    capacity,
    capacity_unit,
    current_latitude,
    current_longitude,
    current_location,
    status,
    fuel_level,
    availability
  } = req.body;

  if (!vehicle_type || capacity === undefined || !capacity_unit || current_latitude === undefined || current_longitude === undefined || !current_location) {
    return res.status(400).json({ error: 'Missing required fields: vehicle_type, capacity, capacity_unit, current_latitude, current_longitude, current_location' });
  }

  const numCapacity = Number(capacity);
  if (isNaN(numCapacity) || numCapacity <= 0) {
    return res.status(400).json({ error: 'Vehicle capacity must be a positive number greater than 0' });
  }

  const lat = Number(current_latitude);
  const lng = Number(current_longitude);
  if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180' });
  }

  status = status ? status.toUpperCase() : 'AVAILABLE';
  if (!VALID_VEHICLE_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_VEHICLE_STATUSES.join(', ')}` });
  }

  const numFuel = fuel_level !== undefined ? Number(fuel_level) : 100;
  if (isNaN(numFuel) || numFuel < 0 || numFuel > 100) {
    return res.status(400).json({ error: 'Fuel level must be a number between 0 and 100' });
  }

  vehicle_id = vehicle_id || `V-${uuidv4().substring(0, 6).toUpperCase()}`;
  const numAvail = availability !== undefined ? Number(availability) : (status === 'AVAILABLE' ? 1 : 0);
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO vehicles (vehicle_id, vehicle_type, capacity, capacity_unit, current_latitude, current_longitude, current_location, status, fuel_level, availability, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [vehicle_id, vehicle_type, numCapacity, capacity_unit, lat, lng, current_location, status, numFuel, numAvail, now, now];

  db.run(sql, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE') || err.message.includes('PRIMARY KEY')) {
        return res.status(409).json({ error: `Vehicle with id ${vehicle_id} already exists` });
      }
      return res.status(500).json({ error: 'Database error creating vehicle', details: err.message });
    }

    logLogisticsEvent('VEHICLE_CREATED', { vehicleId: vehicle_id, details: `Registered ${vehicle_type} ${vehicle_id} at ${current_location}` });

    db.get('SELECT * FROM vehicles WHERE vehicle_id = ?', [vehicle_id], (err, row) => {
      res.status(201).json({ status: 'created', data: row });
    });
  });
};
app.post('/api/v1/vehicles', createVehicleHandler);
app.post('/vehicles', createVehicleHandler);

// 4. PATCH /api/v1/vehicles/:id
const updateVehicleHandler = (req, res) => {
  const { id } = req.params;
  const {
    status,
    fuel_level,
    availability,
    current_latitude,
    current_longitude,
    current_location,
    capacity,
    capacity_unit,
    vehicle_type
  } = req.body;

  db.get('SELECT * FROM vehicles WHERE vehicle_id = ?', [id], (err, existing) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    if (!existing) return res.status(404).json({ error: `Vehicle with id ${id} not found` });

    let updatedStatus = existing.status;
    if (status) {
      const upperStatus = status.toUpperCase();
      if (!VALID_VEHICLE_STATUSES.includes(upperStatus)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_VEHICLE_STATUSES.join(', ')}` });
      }
      updatedStatus = upperStatus;
    }

    let updatedAvail = availability !== undefined ? Number(availability) : (status ? (updatedStatus === 'AVAILABLE' ? 1 : 0) : existing.availability);

    let updatedFuel = existing.fuel_level;
    if (fuel_level !== undefined) {
      const numFuel = Number(fuel_level);
      if (isNaN(numFuel) || numFuel < 0 || numFuel > 100) {
        return res.status(400).json({ error: 'Fuel level must be between 0 and 100' });
      }
      updatedFuel = numFuel;
    }

    let updatedLat = existing.current_latitude;
    let updatedLng = existing.current_longitude;
    if (current_latitude !== undefined || current_longitude !== undefined) {
      const lat = current_latitude !== undefined ? Number(current_latitude) : existing.current_latitude;
      const lng = current_longitude !== undefined ? Number(current_longitude) : existing.current_longitude;
      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180' });
      }
      updatedLat = lat;
      updatedLng = lng;
    }

    let updatedCap = existing.capacity;
    if (capacity !== undefined) {
      const numCap = Number(capacity);
      if (isNaN(numCap) || numCap <= 0) {
        return res.status(400).json({ error: 'Capacity must be greater than 0' });
      }
      updatedCap = numCap;
    }

    let updatedLoc = current_location !== undefined ? current_location : existing.current_location;
    let updatedCapUnit = capacity_unit !== undefined ? capacity_unit : existing.capacity_unit;
    let updatedType = vehicle_type !== undefined ? vehicle_type : existing.vehicle_type;
    const now = new Date().toISOString();

    const sql = `
      UPDATE vehicles
      SET vehicle_type = ?, capacity = ?, capacity_unit = ?, current_latitude = ?, current_longitude = ?, current_location = ?, status = ?, fuel_level = ?, availability = ?, updated_at = ?
      WHERE vehicle_id = ?
    `;
    const params = [updatedType, updatedCap, updatedCapUnit, updatedLat, updatedLng, updatedLoc, updatedStatus, updatedFuel, updatedAvail, now, id];

    db.run(sql, params, function(err) {
      if (err) return res.status(500).json({ error: 'Database error updating vehicle', details: err.message });

      if (updatedStatus !== existing.status) {
        logLogisticsEvent('VEHICLE_STATUS_CHANGED', { vehicleId: id, details: `Vehicle status changed from ${existing.status} to ${updatedStatus}` });
      }

      db.get('SELECT * FROM vehicles WHERE vehicle_id = ?', [id], (err, updatedRow) => {
        res.status(200).json({ status: 'success', message: 'Vehicle updated successfully', data: updatedRow });
      });
    });
  });
};
app.patch('/api/v1/vehicles/:id', updateVehicleHandler);
app.patch('/vehicles/:id', updateVehicleHandler);


// --- WAREHOUSES API ---

// 1. GET /api/v1/warehouses
const getWarehousesHandler = (req, res) => {
  const { state, status } = req.query;
  let sql = 'SELECT * FROM warehouses WHERE 1=1';
  const params = [];

  if (state) {
    sql += ' AND state LIKE ?';
    params.push(`%${state}%`);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status.toUpperCase());
  }

  sql += ' ORDER BY warehouse_id ASC';

  db.all(sql, params, (err, warehouses) => {
    if (err) return res.status(500).json({ error: 'Database error fetching warehouses', details: err.message });
    
    // Fetch resource counts and reservation sums per warehouse
    db.all(`
      SELECT warehouse_id, 
             count(*) as resource_count, 
             sum(quantity) as total_units,
             sum(reserved_quantity) as total_reserved,
             sum(quantity - reserved_quantity) as total_available
      FROM resources 
      GROUP BY warehouse_id
    `, [], (err, counts) => {
      if (err) return res.status(200).json({ status: 'success', count: warehouses.length, data: warehouses });

      const countMap = {};
      counts.forEach(c => { countMap[c.warehouse_id] = c; });

      const enriched = warehouses.map(w => ({
        ...w,
        resource_types_count: countMap[w.warehouse_id]?.resource_count || 0,
        total_units_stocked: countMap[w.warehouse_id]?.total_units || 0,
        total_units_reserved: countMap[w.warehouse_id]?.total_reserved || 0,
        total_units_available: countMap[w.warehouse_id]?.total_available || 0
      }));

      res.status(200).json({ status: 'success', count: enriched.length, data: enriched });
    });
  });
};
app.get('/api/v1/warehouses', getWarehousesHandler);
app.get('/warehouses', getWarehousesHandler);

// 2. GET /api/v1/warehouses/:id
const getWarehouseByIdHandler = (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM warehouses WHERE warehouse_id = ?', [id], (err, warehouse) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    if (!warehouse) return res.status(404).json({ error: `Warehouse with id ${id} not found` });

    db.all(`
      SELECT r.*, 
             (r.quantity - r.reserved_quantity) as available_quantity
      FROM resources r 
      WHERE r.warehouse_id = ? 
      ORDER BY r.priority ASC, r.resource_type ASC
    `, [id], (err, resources) => {
      if (err) return res.status(500).json({ error: 'Database error fetching inventory', details: err.message });
      res.status(200).json({
        status: 'success',
        data: {
          ...warehouse,
          inventory: resources
        }
      });
    });
  });
};
app.get('/api/v1/warehouses/:id', getWarehouseByIdHandler);
app.get('/warehouses/:id', getWarehouseByIdHandler);


// --- RESOURCES / INVENTORY API ---

// 1. GET /api/v1/resources
const getResourcesHandler = (req, res) => {
  const { warehouse_id, resource_type, priority } = req.query;
  let sql = `
    SELECT r.*, 
           (r.quantity - r.reserved_quantity) as available_quantity,
           w.name as warehouse_name, 
           w.state as warehouse_state, 
           w.location as warehouse_location
    FROM resources r
    LEFT JOIN warehouses w ON r.warehouse_id = w.warehouse_id
    WHERE 1=1
  `;
  const params = [];

  if (warehouse_id) {
    sql += ' AND r.warehouse_id = ?';
    params.push(warehouse_id);
  }
  if (resource_type) {
    sql += ' AND r.resource_type LIKE ?';
    params.push(`%${resource_type}%`);
  }
  if (priority) {
    sql += ' AND r.priority = ?';
    params.push(priority.toUpperCase());
  }

  sql += ' ORDER BY r.warehouse_id ASC, r.resource_type ASC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error fetching resources', details: err.message });
    res.status(200).json({ status: 'success', count: rows.length, data: rows });
  });
};
app.get('/api/v1/resources', getResourcesHandler);
app.get('/resources', getResourcesHandler);

// 2. GET /api/v1/resources/:id
const getResourceByIdHandler = (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT r.*, 
           (r.quantity - r.reserved_quantity) as available_quantity,
           w.name as warehouse_name, 
           w.state as warehouse_state, 
           w.location as warehouse_location
    FROM resources r
    LEFT JOIN warehouses w ON r.warehouse_id = w.warehouse_id
    WHERE r.resource_id = ?
  `;
  db.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    if (!row) return res.status(404).json({ error: `Resource with id ${id} not found` });
    res.status(200).json({ status: 'success', data: row });
  });
};
app.get('/api/v1/resources/:id', getResourceByIdHandler);
app.get('/resources/:id', getResourceByIdHandler);

// 3. POST /api/v1/resources
const createResourceHandler = (req, res) => {
  let { resource_id, warehouse_id, resource_type, quantity, reserved_quantity, unit, priority } = req.body;

  if (!warehouse_id || !resource_type || quantity === undefined || !unit) {
    return res.status(400).json({ error: 'Missing required fields: warehouse_id, resource_type, quantity, unit' });
  }

  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty < 0) {
    return res.status(400).json({ error: 'Resource quantity must be a non-negative number' });
  }

  const numReserved = reserved_quantity !== undefined ? Number(reserved_quantity) : 0;
  if (isNaN(numReserved) || numReserved < 0 || numReserved > numQty) {
    return res.status(400).json({ error: 'Reserved quantity must be non-negative and not exceed total quantity' });
  }

  priority = priority ? priority.toUpperCase() : 'MEDIUM';
  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  resource_id = resource_id || `RES-${uuidv4().substring(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  // Check warehouse existence
  db.get('SELECT warehouse_id, name FROM warehouses WHERE warehouse_id = ?', [warehouse_id], (err, wh) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    if (!wh) return res.status(404).json({ error: `Warehouse with id ${warehouse_id} does not exist` });

    const sql = `
      INSERT INTO resources (resource_id, warehouse_id, resource_type, quantity, reserved_quantity, unit, priority, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [resource_id, warehouse_id, resource_type, numQty, numReserved, unit, priority, now, now];

    db.run(sql, params, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE') || err.message.includes('PRIMARY KEY')) {
          return res.status(409).json({ error: `Resource with id ${resource_id} already exists` });
        }
        return res.status(500).json({ error: 'Database error inserting resource', details: err.message });
      }

      logLogisticsEvent('INVENTORY_ADDED', { resourceId: resource_id, warehouseId: warehouse_id, details: `Added ${numQty} ${unit} of ${resource_type} to ${wh.name}` });

      db.get('SELECT *, (quantity - reserved_quantity) as available_quantity FROM resources WHERE resource_id = ?', [resource_id], (err, row) => {
        res.status(201).json({ status: 'created', data: row });
      });
    });
  });
};
app.post('/api/v1/resources', createResourceHandler);
app.post('/resources', createResourceHandler);

// 4. PATCH /api/v1/resources/:id
const updateResourceHandler = (req, res) => {
  const { id } = req.params;
  const { quantity, reserved_quantity, unit, priority, resource_type } = req.body;

  db.get('SELECT * FROM resources WHERE resource_id = ?', [id], (err, existing) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    if (!existing) return res.status(404).json({ error: `Resource with id ${id} not found` });

    let updatedPrio = existing.priority;
    if (priority) {
      const upper = priority.toUpperCase();
      if (!VALID_PRIORITIES.includes(upper)) {
        return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
      }
      updatedPrio = upper;
    }

    let updatedReserved = existing.reserved_quantity;
    if (reserved_quantity !== undefined) {
      const numRsv = Number(reserved_quantity);
      if (isNaN(numRsv) || numRsv < 0) {
        return res.status(400).json({ error: 'Reserved quantity must be a non-negative number' });
      }
      updatedReserved = numRsv;
    }

    let updatedQty = existing.quantity;
    if (quantity !== undefined) {
      const numQty = Number(quantity);
      if (isNaN(numQty) || numQty < 0) {
        return res.status(400).json({ error: 'Quantity must be a non-negative number' });
      }
      if (numQty < updatedReserved) {
        return res.status(400).json({
          error: 'Cannot reduce total quantity below currently reserved quantity',
          current_reserved: updatedReserved,
          attempted_quantity: numQty
        });
      }
      updatedQty = numQty;
    }

    let updatedUnit = unit !== undefined ? unit : existing.unit;
    let updatedType = resource_type !== undefined ? resource_type : existing.resource_type;
    const now = new Date().toISOString();

    const sql = `
      UPDATE resources
      SET resource_type = ?, quantity = ?, reserved_quantity = ?, unit = ?, priority = ?, updated_at = ?
      WHERE resource_id = ?
    `;
    const params = [updatedType, updatedQty, updatedReserved, updatedUnit, updatedPrio, now, id];

    db.run(sql, params, function(err) {
      if (err) return res.status(500).json({ error: 'Database error updating resource', details: err.message });

      db.get('SELECT *, (quantity - reserved_quantity) as available_quantity FROM resources WHERE resource_id = ?', [id], (err, updatedRow) => {
        res.status(200).json({ status: 'success', message: 'Resource updated successfully', data: updatedRow });
      });
    });
  });
};
app.patch('/api/v1/resources/:id', updateResourceHandler);
app.patch('/resources/:id', updateResourceHandler);


// --- LOGISTICS / DELIVERY REQUESTS API ---

// 1. GET /api/v1/logistics/requests
const getLogisticsRequestsHandler = (req, res) => {
  const { status, priority } = req.query;
  let sql = `
    SELECT lr.*, 
           v.vehicle_type as assigned_vehicle_type, 
           v.status as assigned_vehicle_status,
           w.name as source_warehouse_name
    FROM logistics_requests lr
    LEFT JOIN vehicles v ON lr.assigned_vehicle_id = v.vehicle_id
    LEFT JOIN warehouses w ON lr.source_warehouse_id = w.warehouse_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND lr.status = ?';
    params.push(status.toUpperCase());
  }
  if (priority) {
    sql += ' AND lr.priority = ?';
    params.push(priority.toUpperCase());
  }

  sql += `
    ORDER BY 
      CASE lr.priority 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        WHEN 'LOW' THEN 4 
        ELSE 5 
      END ASC,
      lr.created_at DESC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error fetching requests', details: err.message });
    res.status(200).json({ status: 'success', count: rows.length, data: rows });
  });
};
app.get('/api/v1/logistics/requests', getLogisticsRequestsHandler);
app.get('/logistics/requests', getLogisticsRequestsHandler);

// 2. GET /api/v1/logistics/requests/:id
const getLogisticsRequestByIdHandler = (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT lr.*, 
           v.vehicle_type as assigned_vehicle_type, 
           v.status as assigned_vehicle_status,
           w.name as source_warehouse_name
    FROM logistics_requests lr
    LEFT JOIN vehicles v ON lr.assigned_vehicle_id = v.vehicle_id
    LEFT JOIN warehouses w ON lr.source_warehouse_id = w.warehouse_id
    WHERE lr.request_id = ?
  `;
  db.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    if (!row) return res.status(404).json({ error: `Logistics request with id ${id} not found` });
    res.status(200).json({ status: 'success', data: row });
  });
};
app.get('/api/v1/logistics/requests/:id', getLogisticsRequestByIdHandler);
app.get('/logistics/requests/:id', getLogisticsRequestByIdHandler);

// 3. POST /api/v1/logistics/requests
const createLogisticsRequestHandler = (req, res) => {
  let {
    request_id,
    destination,
    latitude,
    longitude,
    requested_resource,
    quantity,
    unit,
    priority,
    status
  } = req.body;

  if (!destination || typeof destination !== 'string' || destination.trim() === '') {
    return res.status(400).json({ error: 'Invalid destination: destination must be a non-empty string' });
  }

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing coordinates: latitude and longitude are required' });
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180' });
  }

  if (!requested_resource || typeof requested_resource !== 'string' || requested_resource.trim() === '') {
    return res.status(400).json({ error: 'Invalid requested_resource: requested resource name is required' });
  }

  if (quantity === undefined) {
    return res.status(400).json({ error: 'Missing quantity: quantity is required' });
  }
  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty <= 0) {
    return res.status(400).json({ error: 'Invalid quantity: quantity must be a positive number greater than 0' });
  }

  if (!unit || typeof unit !== 'string' || unit.trim() === '') {
    return res.status(400).json({ error: 'Missing unit: unit is required' });
  }

  priority = priority ? priority.toUpperCase() : 'HIGH';
  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority: '${priority}'. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  // Requests must start as PENDING upon creation
  status = status ? status.toUpperCase() : 'PENDING';
  if (status !== 'PENDING') {
    return res.status(400).json({ error: "New requests must be created with status 'PENDING'. Use PATCH to assign or dispatch." });
  }

  request_id = request_id || `REQ-NER-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO logistics_requests (request_id, destination, latitude, longitude, requested_resource, quantity, unit, priority, status, assigned_vehicle_id, source_warehouse_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [request_id, destination.trim(), lat, lng, requested_resource.trim(), numQty, unit.trim(), priority, 'PENDING', null, null, now, now];

  db.run(sql, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE') || err.message.includes('PRIMARY KEY')) {
        return res.status(409).json({ error: `Request with id ${request_id} already exists` });
      }
      return res.status(500).json({ error: 'Database error creating logistics request', details: err.message });
    }

    logLogisticsEvent('REQUEST_CREATED', {
      requestId: request_id,
      details: `Created emergency relief request for ${numQty} ${unit} of ${requested_resource} at ${destination}`
    });

    db.get('SELECT * FROM logistics_requests WHERE request_id = ?', [request_id], (err, row) => {
      res.status(201).json({ status: 'created', data: row });
    });
  });
};
app.post('/api/v1/logistics/requests', createLogisticsRequestHandler);
app.post('/logistics/requests', createLogisticsRequestHandler);

// 4. PATCH /api/v1/logistics/requests/:id (State Machine & Inventory Management)
const updateLogisticsRequestHandler = (req, res) => {
  const { id } = req.params;
  const { status, priority, assigned_vehicle_id, source_warehouse_id, quantity, unit, destination } = req.body;

  db.get('SELECT * FROM logistics_requests WHERE request_id = ?', [id], (err, existing) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    if (!existing) return res.status(404).json({ error: `Logistics request with id ${id} not found` });

    const currentStatus = existing.status;
    let targetStatus = status ? status.toUpperCase() : currentStatus;

    if (status && !VALID_REQUEST_STATUSES.includes(targetStatus)) {
      return res.status(400).json({ error: `Invalid status '${status}'. Must be one of: ${VALID_REQUEST_STATUSES.join(', ')}` });
    }

    // Strict Lifecycle Validation
    if (status && targetStatus !== currentStatus) {
      if (currentStatus === 'DELIVERED') {
        return res.status(400).json({ error: 'Cannot modify a request that is already DELIVERED' });
      }
      if (currentStatus === 'CANCELLED') {
        return res.status(400).json({ error: 'Cannot modify a request that is already CANCELLED' });
      }

      const allowedTransitions = {
        'PENDING': ['ASSIGNED', 'CANCELLED'],
        'ASSIGNED': ['IN_TRANSIT', 'CANCELLED'],
        'IN_TRANSIT': ['DELIVERED', 'CANCELLED']
      };

      if (!allowedTransitions[currentStatus]?.includes(targetStatus)) {
        return res.status(400).json({
          error: `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowedTransitions[currentStatus]?.join(', ') || 'None'}`
        });
      }
    }

    const now = new Date().toISOString();

    // =========================================================================
    // CASE A: TRANSITION TO ASSIGNED (Resource Reservation & Vehicle Booking)
    // =========================================================================
    if (targetStatus === 'ASSIGNED' && currentStatus === 'PENDING') {
      const vehicleId = assigned_vehicle_id || existing.assigned_vehicle_id;
      const warehouseId = source_warehouse_id || existing.source_warehouse_id;

      if (!vehicleId) {
        return res.status(400).json({ error: 'An assigned_vehicle_id is required to assign a request' });
      }
      if (!warehouseId) {
        return res.status(400).json({ error: 'A source_warehouse_id is required to assign a request' });
      }

      // Step 1: Validate Vehicle
      db.get('SELECT * FROM vehicles WHERE vehicle_id = ?', [vehicleId], (err, vehicle) => {
        if (err) return res.status(500).json({ error: 'Database error validating vehicle', details: err.message });
        if (!vehicle) return res.status(404).json({ error: `Vehicle with id ${vehicleId} not found` });
        if (vehicle.status !== 'AVAILABLE' || vehicle.availability !== 1) {
          return res.status(400).json({
            error: `Vehicle ${vehicleId} is currently unavailable (${vehicle.status}). Only AVAILABLE vehicles can be assigned.`,
            vehicle_id: vehicleId,
            current_status: vehicle.status
          });
        }

        // Step 2: Validate Warehouse
        db.get('SELECT * FROM warehouses WHERE warehouse_id = ?', [warehouseId], (err, warehouse) => {
          if (err) return res.status(500).json({ error: 'Database error validating warehouse', details: err.message });
          if (!warehouse) return res.status(404).json({ error: `Warehouse with id ${warehouseId} not found` });
          if (warehouse.status !== 'OPERATIONAL') {
            return res.status(400).json({ error: `Warehouse ${warehouseId} is not operational (${warehouse.status})` });
          }

          // Step 3: Validate Resource & Check Available Quantity
          db.get(
            'SELECT *, (quantity - reserved_quantity) as available_quantity FROM resources WHERE warehouse_id = ? AND resource_type = ?',
            [warehouseId, existing.requested_resource],
            (err, resource) => {
              if (err) return res.status(500).json({ error: 'Database error validating inventory', details: err.message });
              if (!resource) {
                return res.status(400).json({
                  error: `Requested resource '${existing.requested_resource}' is not stocked at warehouse '${warehouse.name}' (${warehouseId})`,
                  requested_resource: existing.requested_resource,
                  warehouse_id: warehouseId
                });
              }

              if (resource.available_quantity < existing.quantity) {
                return res.status(400).json({
                  error: 'Insufficient inventory to fulfill delivery request',
                  requested_resource: existing.requested_resource,
                  warehouse_id: warehouseId,
                  warehouse_name: warehouse.name,
                  requested_quantity: existing.quantity,
                  available_quantity: resource.available_quantity,
                  unit: resource.unit
                });
              }

              // Step 4: Perform Atomic State Updates (Reserve Inventory + Assign Vehicle + Update Request)
              db.serialize(() => {
                // Reserve Inventory
                db.run(
                  'UPDATE resources SET reserved_quantity = reserved_quantity + ?, updated_at = ? WHERE resource_id = ?',
                  [existing.quantity, now, resource.resource_id]
                );

                // Book Vehicle
                db.run(
                  'UPDATE vehicles SET status = "ON_ROUTE", availability = 0, updated_at = ? WHERE vehicle_id = ?',
                  [now, vehicleId]
                );

                // Update Request
                db.run(
                  `UPDATE logistics_requests 
                   SET status = 'ASSIGNED', assigned_vehicle_id = ?, source_warehouse_id = ?, updated_at = ?
                   WHERE request_id = ?`,
                  [vehicleId, warehouseId, now, id],
                  function(err) {
                    if (err) return res.status(500).json({ error: 'Database error updating request', details: err.message });

                    logLogisticsEvent('INVENTORY_RESERVED', {
                      requestId: id,
                      warehouseId,
                      resourceId: resource.resource_id,
                      vehicleId,
                      details: `Reserved ${existing.quantity} ${existing.unit} of ${existing.requested_resource} at ${warehouse.name}`
                    });

                    logLogisticsEvent('VEHICLE_ASSIGNED', {
                      requestId: id,
                      warehouseId,
                      vehicleId,
                      details: `Assigned vehicle ${vehicle.vehicle_type} (${vehicleId}) from ${warehouse.name} to request ${id}`
                    });

                    db.get('SELECT * FROM logistics_requests WHERE request_id = ?', [id], (err, updatedRow) => {
                      res.status(200).json({ status: 'success', message: 'Request assigned and inventory reserved successfully', data: updatedRow });
                    });
                  }
                );
              });
            }
          );
        });
      });
      return;
    }

    // =========================================================================
    // CASE B: TRANSITION TO IN_TRANSIT (Dispatch)
    // =========================================================================
    if (targetStatus === 'IN_TRANSIT' && currentStatus === 'ASSIGNED') {
      const vehicleId = existing.assigned_vehicle_id;
      db.serialize(() => {
        if (vehicleId) {
          db.run('UPDATE vehicles SET status = "ON_ROUTE", availability = 0, updated_at = ? WHERE vehicle_id = ?', [now, vehicleId]);
        }

        db.run(
          'UPDATE logistics_requests SET status = "IN_TRANSIT", updated_at = ? WHERE request_id = ?',
          [now, id],
          function(err) {
            if (err) return res.status(500).json({ error: 'Database error dispatching request', details: err.message });

            logLogisticsEvent('REQUEST_DISPATCHED', {
              requestId: id,
              vehicleId,
              warehouseId: existing.source_warehouse_id,
              details: `Dispatched vehicle ${vehicleId || 'N/A'} in transit to ${existing.destination}`
            });

            db.get('SELECT * FROM logistics_requests WHERE request_id = ?', [id], (err, updatedRow) => {
              res.status(200).json({ status: 'success', message: 'Request dispatched and marked IN_TRANSIT', data: updatedRow });
            });
          }
        );
      });
      return;
    }

    // =========================================================================
    // CASE C: TRANSITION TO DELIVERED (Deduct Total Inventory & Free Vehicle)
    // =========================================================================
    if (targetStatus === 'DELIVERED' && currentStatus === 'IN_TRANSIT') {
      const vehicleId = existing.assigned_vehicle_id;
      const warehouseId = existing.source_warehouse_id;

      db.serialize(() => {
        // 1. Deduct Inventory (reduce quantity and reserved_quantity)
        if (warehouseId && existing.requested_resource) {
          db.run(
            `UPDATE resources 
             SET quantity = MAX(0, quantity - ?), 
                 reserved_quantity = MAX(0, reserved_quantity - ?), 
                 updated_at = ? 
             WHERE warehouse_id = ? AND resource_type = ?`,
            [existing.quantity, existing.quantity, now, warehouseId, existing.requested_resource]
          );
        }

        // 2. Free Vehicle (make AVAILABLE again)
        if (vehicleId) {
          db.run('UPDATE vehicles SET status = "AVAILABLE", availability = 1, updated_at = ? WHERE vehicle_id = ?', [now, vehicleId]);
        }

        // 3. Mark Request DELIVERED
        db.run(
          'UPDATE logistics_requests SET status = "DELIVERED", updated_at = ? WHERE request_id = ?',
          [now, id],
          function(err) {
            if (err) return res.status(500).json({ error: 'Database error completing delivery', details: err.message });

            logLogisticsEvent('INVENTORY_DEDUCTED', {
              requestId: id,
              warehouseId,
              vehicleId,
              details: `Deducted ${existing.quantity} ${existing.unit} of ${existing.requested_resource} from warehouse ${warehouseId} upon delivery`
            });

            logLogisticsEvent('REQUEST_DELIVERED', {
              requestId: id,
              warehouseId,
              vehicleId,
              details: `Delivery confirmed at ${existing.destination}. Vehicle ${vehicleId} marked AVAILABLE.`
            });

            db.get('SELECT * FROM logistics_requests WHERE request_id = ?', [id], (err, updatedRow) => {
              res.status(200).json({ status: 'success', message: 'Delivery completed. Inventory deducted and vehicle released.', data: updatedRow });
            });
          }
        );
      });
      return;
    }

    // =========================================================================
    // CASE D: TRANSITION TO CANCELLED (Release Reserved Inventory & Free Vehicle)
    // =========================================================================
    if (targetStatus === 'CANCELLED') {
      const vehicleId = existing.assigned_vehicle_id;
      const warehouseId = existing.source_warehouse_id;

      db.serialize(() => {
        // If it was assigned or in transit, release the reservation
        if ((currentStatus === 'ASSIGNED' || currentStatus === 'IN_TRANSIT') && warehouseId && existing.requested_resource) {
          db.run(
            `UPDATE resources 
             SET reserved_quantity = MAX(0, reserved_quantity - ?), updated_at = ? 
             WHERE warehouse_id = ? AND resource_type = ?`,
            [existing.quantity, now, warehouseId, existing.requested_resource]
          );
        }

        // Free vehicle if assigned
        if (vehicleId && (currentStatus === 'ASSIGNED' || currentStatus === 'IN_TRANSIT')) {
          db.run('UPDATE vehicles SET status = "AVAILABLE", availability = 1, updated_at = ? WHERE vehicle_id = ?', [now, vehicleId]);
        }

        db.run(
          'UPDATE logistics_requests SET status = "CANCELLED", updated_at = ? WHERE request_id = ?',
          [now, id],
          function(err) {
            if (err) return res.status(500).json({ error: 'Database error cancelling request', details: err.message });

            logLogisticsEvent('REQUEST_CANCELLED', {
              requestId: id,
              warehouseId,
              vehicleId,
              details: `Request ${id} cancelled. Reserved resources released and vehicle freed.`
            });

            db.get('SELECT * FROM logistics_requests WHERE request_id = ?', [id], (err, updatedRow) => {
              res.status(200).json({ status: 'success', message: 'Request cancelled successfully', data: updatedRow });
            });
          }
        );
      });
      return;
    }

    // =========================================================================
    // CASE E: Minor Field Updates (Priority, Destination)
    // =========================================================================
    let updatedPriority = existing.priority;
    if (priority) {
      const upperPrio = priority.toUpperCase();
      if (!VALID_PRIORITIES.includes(upperPrio)) {
        return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
      }
      updatedPriority = upperPrio;
    }

    let updatedDest = destination !== undefined ? destination : existing.destination;

    db.run(
      'UPDATE logistics_requests SET priority = ?, destination = ?, updated_at = ? WHERE request_id = ?',
      [updatedPriority, updatedDest, now, id],
      function(err) {
        if (err) return res.status(500).json({ error: 'Database error updating request', details: err.message });

        db.get('SELECT * FROM logistics_requests WHERE request_id = ?', [id], (err, updatedRow) => {
          res.status(200).json({ status: 'success', message: 'Logistics request updated successfully', data: updatedRow });
        });
      }
    );
  });
};
  app.patch('/api/v1/logistics/requests/:id', updateLogisticsRequestHandler);
  app.patch('/logistics/requests/:id', updateLogisticsRequestHandler);
  
  // 5. PATCH /api/v1/logistics/requests/:id/deliver (Delivery Confirmation Loop)
  const deliverLogisticsRequestHandler = (req, res) => {
    const { id } = req.params;
    const { latitude, longitude, timestamp } = req.body;
  
    if (latitude === undefined || longitude === undefined || !timestamp) {
      return res.status(400).json({ error: 'Missing GPS or timestamp for delivery confirmation' });
    }
  
    db.get('SELECT * FROM logistics_requests WHERE request_id = ?', [id], (err, existing) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      if (!existing) return res.status(404).json({ error: `Logistics request ${id} not found` });
      if (existing.status === 'DELIVERED') return res.status(400).json({ error: 'Request is already delivered' });
      if (existing.status !== 'IN_TRANSIT' && existing.status !== 'ASSIGNED') {
        return res.status(400).json({ error: `Cannot mark delivered from status ${existing.status}` });
      }
  
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const now = new Date().toISOString();
        db.run(`
          UPDATE logistics_requests 
          SET status = 'DELIVERED', updated_at = ?, delivery_latitude = ?, delivery_longitude = ?, delivery_timestamp = ?
          WHERE request_id = ?
        `, [now, latitude, longitude, timestamp, id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to update request' });
          }
          
          // Free the vehicle
          if (existing.assigned_vehicle_id) {
            db.run(`
              UPDATE vehicles SET status = 'AVAILABLE', updated_at = ? WHERE vehicle_id = ?
            `, [now, existing.assigned_vehicle_id], function(err2) {
              if (err2) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to free vehicle' });
              }
              db.run('COMMIT');
              res.status(200).json({ success: true, request_id: id, status: 'DELIVERED', vehicle_freed: existing.assigned_vehicle_id });
            });
          } else {
            db.run('COMMIT');
            res.status(200).json({ success: true, request_id: id, status: 'DELIVERED' });
          }
        });
      });
    });
  };
  app.patch('/api/v1/logistics/requests/:id/deliver', deliverLogisticsRequestHandler);
  app.patch('/logistics/requests/:id/deliver', deliverLogisticsRequestHandler);


// --- AUDIT & EVENT HISTORY API ---

// 1. GET /api/v1/logistics/events (List all events)
const getLogisticsEventsHandler = (req, res) => {
  const { event_type, request_id, vehicle_id, limit = 50 } = req.query;
  let sql = 'SELECT * FROM logistics_events WHERE 1=1';
  const params = [];

  if (event_type) {
    sql += ' AND event_type = ?';
    params.push(event_type.toUpperCase());
  }
  if (request_id) {
    sql += ' AND request_id = ?';
    params.push(request_id);
  }
  if (vehicle_id) {
    sql += ' AND vehicle_id = ?';
    params.push(vehicle_id);
  }

  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(Number(limit));

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error fetching logistics events', details: err.message });
    res.status(200).json({ status: 'success', count: rows.length, data: rows });
  });
};
app.get('/api/v1/logistics/events', getLogisticsEventsHandler);
app.get('/logistics/events', getLogisticsEventsHandler);

// 2. GET /api/v1/logistics/events/:requestId (Events for specific request)
const getRequestEventsHandler = (req, res) => {
  const { requestId } = req.params;
  db.all('SELECT * FROM logistics_events WHERE request_id = ? ORDER BY id ASC', [requestId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error fetching request events', details: err.message });
    res.status(200).json({ status: 'success', count: rows.length, data: rows });
  });
};
app.get('/api/v1/logistics/events/request/:requestId', getRequestEventsHandler);
app.get('/logistics/events/request/:requestId', getRequestEventsHandler);


// --- SUMMARY & AI CONTEXT APIs ---

// 1. GET /api/v1/logistics/summary (Dashboard KPIs)
const getLogisticsSummaryHandler = (req, res) => {
  db.serialize(() => {
    const summary = {
      vehicles: { total: 0, available: 0, on_route: 0, busy: 0, maintenance: 0 },
      warehouses: { total: 0, operational: 0 },
      requests: { total: 0, pending: 0, assigned: 0, in_transit: 0, active_deliveries: 0, delivered: 0, cancelled: 0, critical: 0 },
      inventory: { total_categories: 0, total_units: 0, total_reserved_units: 0, total_available_units: 0, low_stock_items_count: 0, low_stock_resources: [] }
    };

    // 1. Vehicles count
    db.all('SELECT status, count(*) as count FROM vehicles GROUP BY status', [], (err, vRows) => {
      if (!err && vRows) {
        vRows.forEach(r => {
          summary.vehicles.total += r.count;
          const key = r.status.toLowerCase();
          if (summary.vehicles[key] !== undefined) summary.vehicles[key] = r.count;
        });
      }

      // 2. Warehouses count
      db.all('SELECT status, count(*) as count FROM warehouses GROUP BY status', [], (err, wRows) => {
        if (!err && wRows) {
          wRows.forEach(r => {
            summary.warehouses.total += r.count;
            if (r.status === 'OPERATIONAL') summary.warehouses.operational += r.count;
          });
        }

        // 3. Requests count
        db.all('SELECT status, priority, count(*) as count FROM logistics_requests GROUP BY status, priority', [], (err, reqRows) => {
          if (!err && reqRows) {
            reqRows.forEach(r => {
              summary.requests.total += r.count;
              const key = r.status.toLowerCase();
              if (summary.requests[key] !== undefined) summary.requests[key] += r.count;
              if (r.priority === 'CRITICAL' && r.status !== 'DELIVERED' && r.status !== 'CANCELLED') {
                summary.requests.critical += r.count;
              }
            });
            summary.requests.active_deliveries = summary.requests.assigned + summary.requests.in_transit;
          }

          // 4. Inventory summary (with reservations and low-stock detection)
          db.all(`
            SELECT r.*, 
                   (r.quantity - r.reserved_quantity) as available_quantity,
                   w.name as warehouse_name
            FROM resources r
            LEFT JOIN warehouses w ON r.warehouse_id = w.warehouse_id
          `, [], (err, resRows) => {
            if (!err && resRows) {
              summary.inventory.total_categories = resRows.length;
              resRows.forEach(r => {
                summary.inventory.total_units += r.quantity;
                summary.inventory.total_reserved_units += r.reserved_quantity;
                summary.inventory.total_available_units += r.available_quantity;

                // Flag low-stock items (< 300 units available)
                if (r.available_quantity < 300) {
                  summary.inventory.low_stock_items_count++;
                  summary.inventory.low_stock_resources.push({
                    resource_id: r.resource_id,
                    warehouse_id: r.warehouse_id,
                    warehouse_name: r.warehouse_name,
                    resource_type: r.resource_type,
                    available_quantity: r.available_quantity,
                    total_quantity: r.quantity,
                    reserved_quantity: r.reserved_quantity,
                    unit: r.unit,
                    priority: r.priority
                  });
                }
              });
            }

            res.status(200).json({ status: 'success', data: summary });
          });
        });
      });
    });
  });
};
app.get('/api/v1/logistics/summary', getLogisticsSummaryHandler);
app.get('/logistics/summary', getLogisticsSummaryHandler);

// 2. GET /api/v1/logistics/ai-context (Standardized Data Contract for Future AI Decision Engine)
const getLogisticsAIContextHandler = (req, res) => {
  db.all('SELECT vehicle_id, vehicle_type, capacity, capacity_unit, current_latitude, current_longitude, current_location, status, fuel_level, availability FROM vehicles', [], (err, vehicles) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });

    db.all('SELECT warehouse_id, name, location, latitude, longitude, state, status FROM warehouses', [], (err, warehouses) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });

      db.all(`
        SELECT r.resource_id, 
               r.warehouse_id, 
               w.name as warehouse_name,
               r.resource_type, 
               r.quantity as total_quantity, 
               r.reserved_quantity, 
               (r.quantity - r.reserved_quantity) as available_quantity,
               r.unit, 
               r.priority
        FROM resources r
        LEFT JOIN warehouses w ON r.warehouse_id = w.warehouse_id
        ORDER BY r.warehouse_id ASC, r.resource_type ASC
      `, [], (err, resources) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });

        db.all(`
          SELECT request_id, 
                 destination, 
                 latitude, 
                 longitude, 
                 requested_resource, 
                 quantity, 
                 unit, 
                 priority, 
                 status, 
                 assigned_vehicle_id, 
                 source_warehouse_id
          FROM logistics_requests 
          ORDER BY CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 END ASC, created_at DESC
        `, [], (err, requests) => {
          if (err) return res.status(500).json({ error: 'Database error', details: err.message });

          res.status(200).json({
            status: 'success',
            description: 'Standardized data pipeline input for future AI Decision Engine (Resource Allocation & Route Recommendation)',
            timestamp: new Date().toISOString(),
            data: {
              vehicles: vehicles,
              warehouses: warehouses,
              resources: resources,
              requests: requests
            }
          });
        });
      });
    });
  });
};
app.get('/api/v1/logistics/ai-context', getLogisticsAIContextHandler);
app.get('/logistics/ai-context', getLogisticsAIContextHandler);

// 3. GET /api/v1/logistics/ai-recommend/:id (Runs Phase 6 Decision Engine)
const util = require('util');
const execAsync = util.promisify(require('child_process').exec);

app.get('/api/v1/logistics/ai-recommend/:id', async (req, res) => {
  const reqId = req.params.id;
  try {
    const script = path.resolve(__dirname, '../ai/run_decision.py');
    const { stdout, stderr } = await execAsync(`python "${script}" "${reqId}"`, { encoding: 'utf-8' });
    const result = stdout;
    const jsonStart = result.indexOf('{');
    const jsonEnd = result.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = result.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      res.json(parsed);
    } else {
      throw new Error("No JSON found in Python output: " + result + " | stderr: " + stderr);
    }
  } catch (error) {
    console.error("AI Decision failed:", error.message);
    res.status(500).json({ error: "Failed to generate AI recommendation. Details: " + error.message });
  }
});


// --- FIELD REPORTS (MOBILE SYNC) APIs ---
app.post('/api/v1/field-reports', (req, res) => {
  const { report_id, report_type, severity, latitude, longitude, timestamp, description, people_affected, injured_people, reporter_id, device_id, message_id, created_offline, reporter_role, access_code } = req.body;

  if (!report_id || !report_type || latitude === undefined || longitude === undefined || !severity || !timestamp) {
    return res.status(400).json({ success: false, error: 'INVALID_FIELD_REPORT', details: 'Missing required fields' });
  }
  
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ success: false, error: 'INVALID_FIELD_REPORT', details: 'Invalid coordinates' });
  }
  
  const validTypes = ['ROAD_BLOCKAGE', 'BRIDGE_CONDITION', 'FLOOD_OBSERVATION', 'LANDSLIDE_OBSERVATION', 'MEDICAL_EMERGENCY', 'INJURED_PEOPLE', 'SHELTER_DEMAND', 'FOOD_SHORTAGE', 'WATER_SHORTAGE', 'MEDICINE_SHORTAGE', 'GENERAL_SOS', 'ROAD_CLEAR', 'DIFFICULT_TO_PASS', 'ROAD_BLOCKED', 'FLOODED', 'LANDSLIDE', 'BRIDGE_DAMAGED'];
  if (!validTypes.includes(report_type)) {
    return res.status(400).json({ success: false, error: 'INVALID_FIELD_REPORT', details: 'Invalid report type' });
  }

  const validRoles = ['GENERAL_PUBLIC', 'FIELD_RESPONDER', 'OFFICIAL'];
  let safeRole = validRoles.includes(reporter_role) ? reporter_role : 'GENERAL_PUBLIC';

  if (safeRole === 'OFFICIAL' && access_code !== 'SIH26002_DEMO') {
    safeRole = 'FIELD_RESPONDER';
  }

  const stmt = db.prepare(`
    INSERT INTO field_reports (report_id, message_id, report_type, severity, latitude, longitude, timestamp, description, people_affected, injured_people, reporter_id, device_id, created_offline, source, reporter_role, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MOBILE_APP', ?, ?, ?)
  `);
  
  const now = new Date().toISOString();
  stmt.run(report_id, message_id || null, report_type, severity, latitude, longitude, timestamp, description || null, people_affected || 0, injured_people || 0, reporter_id || null, device_id || null, created_offline ? 1 : 0, safeRole, now, now, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ success: false, error: 'DUPLICATE_REPORT', details: 'Report or message ID already exists' });
      }
      return res.status(500).json({ success: false, error: 'DATABASE_ERROR', details: 'Failed to insert report' });
    }
    res.status(201).json({ success: true, report_id: report_id, status: 'SYNCED', reporter_role: safeRole });
  });
  stmt.finalize();
});

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

app.get('/api/v1/field-reports', (req, res) => {
  const { consensus } = req.query;
  db.all('SELECT * FROM field_reports ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: 'DATABASE_ERROR' });
    
    if (consensus === 'true') {
      const data = rows.map(r => {
        let consensus_tier = 'UNVERIFIED'; // Default
        
        if (r.status === 'VERIFIED') consensus_tier = 'VERIFIED';
        else if (r.status === 'REJECTED') consensus_tier = 'REJECTED';
        else {
          // Calculate UNVERIFIED consensus
          const rTime = new Date(r.timestamp).getTime();
          let uniqueDevices = new Set();
          uniqueDevices.add(r.device_id || r.reporter_id || r.report_id); // Fallback identifiers
          
          rows.forEach(o => {
            if (o.report_id !== r.report_id && o.report_type === r.report_type && o.status !== 'REJECTED') {
              const oTime = new Date(o.timestamp).getTime();
              if (Math.abs(oTime - rTime) <= 6 * 3600 * 1000) {
                if (distanceKm(r.latitude, r.longitude, o.latitude, o.longitude) <= 2.0) {
                  uniqueDevices.add(o.device_id || o.reporter_id || o.report_id);
                }
              }
            }
          });
          
          let score = uniqueDevices.size;
          if (r.reporter_role === 'OFFICIAL') {
            score += 1; // OFFICIAL starts equivalent to 2 independent reports (MEDIUM)
          }
          
          if (score >= 3) consensus_tier = 'HIGH';
          else if (score === 2) consensus_tier = 'MEDIUM';
          else consensus_tier = 'LOW';
        }
        
        return { ...r, consensus_tier };
      });
      return res.status(200).json({ success: true, count: data.length, data });
    }
    
    res.status(200).json({ success: true, count: rows.length, data: rows });
  });
});

app.get('/api/v1/field-reports/:id', (req, res) => {
  db.get('SELECT * FROM field_reports WHERE report_id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: 'DATABASE_ERROR' });
    if (!row) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    res.status(200).json({ success: true, data: row });
  });
});

app.patch('/api/v1/field-reports/:id/verify', (req, res) => {
  const { status } = req.body;
  if (!['VERIFIED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid verification status' });
  }
  
  db.run('UPDATE field_reports SET status = ?, verified_at = ? WHERE report_id = ?', 
    [status, new Date().toISOString(), req.params.id], function(err) {
      if (err) return res.status(500).json({ success: false, error: 'DATABASE_ERROR' });
      if (this.changes === 0) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      res.json({ success: true, report_id: req.params.id, status });
  });
});

// --- WHAT-IF SIMULATION API ---
app.post('/api/v1/simulate/whatif', async (req, res) => {
  const { type, lat, lon, radius_km, duration_hours } = req.body;
  if (!type || lat === undefined || lon === undefined || !radius_km) return res.status(400).json({ error: 'Missing simulation params' });
  
  try {
    const simulationOverride = { type, lat, lon, radius_km, duration_hours };
    const script = path.resolve(__dirname, '../ai/run_district_eval.py');
    
    // Escape quotes for command line
    const jsonStr = JSON.stringify(simulationOverride);
    const escapedJsonStr = process.platform === 'win32' ? jsonStr.replace(/"/g, '\\"') : `'${jsonStr}'`;
    
    const { stdout } = await execAsync(`python "${script}" ALL "${escapedJsonStr}"`, { encoding: 'utf-8' });
    
    const jsonStart = stdout.indexOf('{');
    const jsonEnd = stdout.lastIndexOf('}');
    let distData = { data: [] };
    if (jsonStart !== -1 && jsonEnd !== -1) {
      distData = JSON.parse(stdout.substring(jsonStart, jsonEnd + 1));
    }
    
    const vehs = await new Promise((resolve, reject) => db.all('SELECT * FROM vehicles', [], (e,r) => e?reject(e):resolve(r)));
    const reqs = await new Promise((resolve, reject) => db.all('SELECT * FROM logistics_requests WHERE status NOT IN ("DELIVERED", "CANCELLED")', [], (e,r) => e?reject(e):resolve(r)));
    
    const affectedVehicles = vehs.filter(v => distanceKm(lat, lon, v.current_latitude, v.current_longitude) <= radius_km);
    const affectedRequests = reqs.filter(r => distanceKm(lat, lon, r.latitude, r.longitude) <= radius_km);
    
    // Calculate REAL alternative route via OSRM
    let start_lat = 26.1445; // Guwahati Hub
    let start_lon = 91.7362;
    let end_lat = 24.8333;   // Silchar
    let end_lon = 92.7789;
    
    if (affectedRequests.length > 0) {
      end_lat = affectedRequests[0].latitude;
      end_lon = affectedRequests[0].longitude;
    }

    const routingScript = path.resolve(__dirname, '../ai/data_pipeline/fetchers/routing_api.py');
    const { stdout: routeStdout } = await execAsync(`python "${routingScript}" ${start_lat} ${start_lon} ${end_lat} ${end_lon} ${lat} ${lon} ${radius_km}`, { encoding: 'utf-8' });
    
    let altRouteData = { alternative_route_available: false };
    try {
      const parsed = JSON.parse(routeStdout.trim());
      if (parsed.status === 'SUCCESS') {
        altRouteData = parsed.data;
      }
    } catch(e) {
      console.error("Failed to parse routing output:", routeStdout);
    }
    
    res.json({
      success: true,
      data: {
        affected_districts: distData.data,
        affected_vehicles: affectedVehicles,
        affected_requests: affectedRequests,
        alternative_route: altRouteData
      }
    });
  } catch(e) {
    console.error("Simulation error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`Backend API listening on port ${port}`);
});


