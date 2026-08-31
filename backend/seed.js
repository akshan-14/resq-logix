const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const seedData = () => {
  console.log('Seeding database with Northeast India disaster relief and logistics demo data...');
  const now = new Date().toISOString();

  const victim1Id = uuidv4();
  const victim2Id = uuidv4();

  db.serialize(() => {
    // Drop existing tables for clean schema migration & seed
    db.run("DROP TABLE IF EXISTS logistics_events");
    db.run("DROP TABLE IF EXISTS relay_events");
    db.run("DROP TABLE IF EXISTS sos_messages");
    db.run("DROP TABLE IF EXISTS victims");
    db.run("DROP TABLE IF EXISTS logistics_requests");
    db.run("DROP TABLE IF EXISTS resources");
    db.run("DROP TABLE IF EXISTS vehicles");
    db.run("DROP TABLE IF EXISTS warehouses");

    // Re-initialize tables with updated schema
    db.run(`
      CREATE TABLE IF NOT EXISTS victims (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        blood_group TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS sos_messages (
        messageId TEXT PRIMARY KEY,
        victimId TEXT,
        latitude REAL,
        longitude REAL,
        emergencyType TEXT,
        severity INTEGER,
        timestamp TEXT,
        ttl INTEGER,
        hopCount INTEGER,
        status TEXT DEFAULT 'ACTIVE',
        FOREIGN KEY (victimId) REFERENCES victims (id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS relay_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        messageId TEXT,
        sourceNode TEXT,
        currentNode TEXT,
        nextNode TEXT,
        ttl INTEGER,
        hopCount INTEGER,
        timestamp TEXT,
        FOREIGN KEY (messageId) REFERENCES sos_messages (messageId)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS vehicles (
        vehicle_id TEXT PRIMARY KEY,
        vehicle_type TEXT NOT NULL,
        capacity REAL NOT NULL CHECK(capacity > 0),
        capacity_unit TEXT NOT NULL,
        current_latitude REAL NOT NULL,
        current_longitude REAL NOT NULL,
        current_location TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('AVAILABLE', 'ON_ROUTE', 'BUSY', 'MAINTENANCE')),
        fuel_level REAL DEFAULT 100 CHECK(fuel_level >= 0 AND fuel_level <= 100),
        availability INTEGER DEFAULT 1 CHECK(availability IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS warehouses (
        warehouse_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        state TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPERATIONAL',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS resources (
        resource_id TEXT PRIMARY KEY,
        warehouse_id TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        quantity REAL NOT NULL CHECK(quantity >= 0),
        reserved_quantity REAL NOT NULL DEFAULT 0 CHECK(reserved_quantity >= 0),
        unit TEXT NOT NULL,
        priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses (warehouse_id) ON DELETE RESTRICT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS logistics_requests (
        request_id TEXT PRIMARY KEY,
        destination TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        requested_resource TEXT NOT NULL,
        quantity REAL NOT NULL CHECK(quantity > 0),
        unit TEXT NOT NULL,
        priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        status TEXT NOT NULL CHECK(status IN ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')),
        assigned_vehicle_id TEXT,
        source_warehouse_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles (vehicle_id) ON DELETE SET NULL,
        FOREIGN KEY (source_warehouse_id) REFERENCES warehouses (warehouse_id) ON DELETE SET NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS logistics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        request_id TEXT,
        vehicle_id TEXT,
        warehouse_id TEXT,
        resource_id TEXT,
        details TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (request_id) REFERENCES logistics_requests (request_id) ON DELETE SET NULL,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (vehicle_id) ON DELETE SET NULL,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses (warehouse_id) ON DELETE SET NULL,
        FOREIGN KEY (resource_id) REFERENCES resources (resource_id) ON DELETE SET NULL
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_vehicles_status_avail ON vehicles(status, availability)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_resources_type_wh ON resources(resource_type, warehouse_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_logistics_requests_status_prio ON logistics_requests(status, priority)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_logistics_events_req ON logistics_events(request_id)`);


    // 1. Insert Victims
    db.run("INSERT INTO victims (id, name, phone, blood_group) VALUES (?, ?, ?, ?)", 
      [victim1Id, 'Amit Sharma', '+919876543210', 'O+']);
    db.run("INSERT INTO victims (id, name, phone, blood_group) VALUES (?, ?, ?, ?)", 
      [victim2Id, 'Priya Patel', '+919876543211', 'B+']);

    // 2. Insert SOS Messages (Northeast Coordinates: Assam / Meghalaya)
    const sos1Id = uuidv4();
    db.run(`
      INSERT INTO sos_messages (messageId, victimId, latitude, longitude, emergencyType, severity, timestamp, ttl, hopCount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [sos1Id, victim1Id, 25.1764, 93.0177, 'LANDSLIDE_TRAPPED', 9, now, 3, 2, 'ACTIVE']);

    const sos2Id = uuidv4();
    db.run(`
      INSERT INTO sos_messages (messageId, victimId, latitude, longitude, emergencyType, severity, timestamp, ttl, hopCount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [sos2Id, victim2Id, 25.5788, 91.8933, 'FLOOD_MEDICAL', 7, now, 5, 0, 'ACKNOWLEDGED']);

    // 3. Insert Warehouses across Northeast India
    const warehouses = [
      { id: 'WH-GHY-01', name: 'Guwahati Central Relief Hub', location: 'Guwahati, Kamrup Metropolitan', lat: 26.1445, lng: 91.7362, state: 'Assam', status: 'OPERATIONAL' },
      { id: 'WH-SHL-02', name: 'Shillong Disaster Logistics Base', location: 'Shillong, East Khasi Hills', lat: 25.5788, lng: 91.8933, state: 'Meghalaya', status: 'OPERATIONAL' },
      { id: 'WH-IMP-03', name: 'Imphal Emergency Depot', location: 'Imphal, Imphal West', lat: 24.8170, lng: 93.9368, state: 'Manipur', status: 'OPERATIONAL' },
      { id: 'WH-AGT-04', name: 'Agartala Relief Center', location: 'Agartala, West Tripura', lat: 23.8315, lng: 91.2868, state: 'Tripura', status: 'OPERATIONAL' },
      { id: 'WH-AZL-05', name: 'Aizawl Supply Depot', location: 'Aizawl, Aizawl District', lat: 23.7307, lng: 92.7173, state: 'Mizoram', status: 'OPERATIONAL' },
      { id: 'WH-ITN-06', name: 'Itanagar Strategic Warehouse', location: 'Itanagar, Papum Pare', lat: 27.0844, lng: 93.6053, state: 'Arunachal Pradesh', status: 'OPERATIONAL' },
      { id: 'WH-KOH-07', name: 'Kohima Humanitarian Warehouse', location: 'Kohima, Kohima District', lat: 25.6751, lng: 94.1086, state: 'Nagaland', status: 'OPERATIONAL' },
      { id: 'WH-SLC-08', name: 'Silchar Valley Distribution Hub', location: 'Silchar, Cachar', lat: 24.8333, lng: 92.7789, state: 'Assam', status: 'OPERATIONAL' }
    ];

    const whStmt = db.prepare(`
      INSERT INTO warehouses (warehouse_id, name, location, latitude, longitude, state, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    warehouses.forEach(w => {
      whStmt.run([w.id, w.name, w.location, w.lat, w.lng, w.state, w.status, now, now]);
    });
    whStmt.finalize();

    // 4. Insert Vehicles across Northeast India
    const vehicles = [
      { id: 'V001', type: 'Ambulance', cap: 4, unit: 'persons', lat: 26.1445, lng: 91.7362, loc: 'Guwahati, Assam', status: 'AVAILABLE', fuel: 95, avail: 1 },
      { id: 'V002', type: 'Supply Truck', cap: 5000, unit: 'kg', lat: 25.5788, lng: 91.8933, loc: 'Shillong, Meghalaya', status: 'AVAILABLE', fuel: 88, avail: 1 },
      { id: 'V003', type: 'Rescue Vehicle', cap: 8, unit: 'persons', lat: 24.8170, lng: 93.9368, loc: 'Imphal, Manipur', status: 'ON_ROUTE', fuel: 62, avail: 0 },
      { id: 'V004', type: 'Water Tanker', cap: 10000, unit: 'liters', lat: 23.8315, lng: 91.2868, loc: 'Agartala, Tripura', status: 'AVAILABLE', fuel: 80, avail: 1 },
      { id: 'V005', type: 'Van', cap: 1500, unit: 'kg', lat: 23.7307, lng: 92.7173, loc: 'Aizawl, Mizoram', status: 'BUSY', fuel: 45, avail: 0 },
      { id: 'V006', type: 'Rescue Vehicle', cap: 6, unit: 'persons', lat: 27.0844, lng: 93.6053, loc: 'Itanagar, Arunachal Pradesh', status: 'AVAILABLE', fuel: 90, avail: 1 },
      { id: 'V007', type: 'Supply Truck', cap: 6000, unit: 'kg', lat: 24.8333, lng: 92.7789, loc: 'Silchar, Assam', status: 'MAINTENANCE', fuel: 20, avail: 0 },
      { id: 'V008', type: 'Ambulance', cap: 4, unit: 'persons', lat: 25.6751, lng: 94.1086, loc: 'Kohima, Nagaland', status: 'AVAILABLE', fuel: 85, avail: 1 },
      { id: 'V009', type: 'Supply Truck', cap: 7500, unit: 'kg', lat: 26.1550, lng: 91.7450, loc: 'Guwahati, Assam', status: 'AVAILABLE', fuel: 92, avail: 1 },
      { id: 'V010', type: 'Water Tanker', cap: 8000, unit: 'liters', lat: 25.5850, lng: 91.8800, loc: 'Shillong, Meghalaya', status: 'ON_ROUTE', fuel: 70, avail: 0 }
    ];

    const vehStmt = db.prepare(`
      INSERT INTO vehicles (vehicle_id, vehicle_type, capacity, capacity_unit, current_latitude, current_longitude, current_location, status, fuel_level, availability, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    vehicles.forEach(v => {
      vehStmt.run([v.id, v.type, v.cap, v.unit, v.lat, v.lng, v.loc, v.status, v.fuel, v.avail, now, now]);
    });
    vehStmt.finalize();

    // 5. Insert Resources / Inventory (with reserved_quantity)
    const resources = [
      // Guwahati Central
      { id: 'RES-GHY-01', wh: 'WH-GHY-01', type: 'Food', qty: 5000, rsv: 0, unit: 'packets', prio: 'CRITICAL' },
      { id: 'RES-GHY-02', wh: 'WH-GHY-01', type: 'Drinking Water', qty: 12000, rsv: 0, unit: 'liters', prio: 'HIGH' },
      { id: 'RES-GHY-03', wh: 'WH-GHY-01', type: 'Medicine', qty: 800, rsv: 0, unit: 'kits', prio: 'CRITICAL' },
      { id: 'RES-GHY-04', wh: 'WH-GHY-01', type: 'Emergency Kits', qty: 450, rsv: 0, unit: 'kits', prio: 'HIGH' },
      { id: 'RES-GHY-05', wh: 'WH-GHY-01', type: 'Blankets', qty: 1500, rsv: 0, unit: 'units', prio: 'MEDIUM' },
      { id: 'RES-GHY-06', wh: 'WH-GHY-01', type: 'Medical Supplies', qty: 600, rsv: 0, unit: 'boxes', prio: 'CRITICAL' },

      // Shillong Base (800 Food reserved for REQ-NER-003, 2500 Water reserved for REQ-NER-008)
      { id: 'RES-SHL-01', wh: 'WH-SHL-02', type: 'Food', qty: 3200, rsv: 800, unit: 'packets', prio: 'HIGH' },
      { id: 'RES-SHL-02', wh: 'WH-SHL-02', type: 'Drinking Water', qty: 8500, rsv: 2500, unit: 'liters', prio: 'HIGH' },
      { id: 'RES-SHL-03', wh: 'WH-SHL-02', type: 'Medicine', qty: 400, rsv: 0, unit: 'kits', prio: 'CRITICAL' },
      { id: 'RES-SHL-04', wh: 'WH-SHL-02', type: 'Blankets', qty: 900, rsv: 0, unit: 'units', prio: 'HIGH' },
      { id: 'RES-SHL-05', wh: 'WH-SHL-02', type: 'Emergency Kits', qty: 300, rsv: 0, unit: 'kits', prio: 'MEDIUM' },

      // Imphal Depot (300 Blankets reserved for REQ-NER-004)
      { id: 'RES-IMP-01', wh: 'WH-IMP-03', type: 'Food', qty: 2100, rsv: 0, unit: 'packets', prio: 'HIGH' },
      { id: 'RES-IMP-02', wh: 'WH-IMP-03', type: 'Drinking Water', qty: 4000, rsv: 0, unit: 'liters', prio: 'MEDIUM' },
      { id: 'RES-IMP-03', wh: 'WH-IMP-03', type: 'Medicine', qty: 250, rsv: 0, unit: 'kits', prio: 'CRITICAL' },
      { id: 'RES-IMP-04', wh: 'WH-IMP-03', type: 'Medical Supplies', qty: 180, rsv: 0, unit: 'boxes', prio: 'HIGH' },
      { id: 'RES-IMP-05', wh: 'WH-IMP-03', type: 'Blankets', qty: 600, rsv: 300, unit: 'units', prio: 'LOW' },

      // Agartala Center
      { id: 'RES-AGT-01', wh: 'WH-AGT-04', type: 'Food', qty: 1800, rsv: 0, unit: 'packets', prio: 'MEDIUM' },
      { id: 'RES-AGT-02', wh: 'WH-AGT-04', type: 'Drinking Water', qty: 6000, rsv: 0, unit: 'liters', prio: 'HIGH' },
      { id: 'RES-AGT-03', wh: 'WH-AGT-04', type: 'Medicine', qty: 300, rsv: 0, unit: 'kits', prio: 'HIGH' },
      { id: 'RES-AGT-04', wh: 'WH-AGT-04', type: 'Emergency Kits', qty: 200, rsv: 0, unit: 'kits', prio: 'MEDIUM' },

      // Aizawl Depot
      { id: 'RES-AZL-01', wh: 'WH-AZL-05', type: 'Food', qty: 1400, rsv: 0, unit: 'packets', prio: 'HIGH' },
      { id: 'RES-AZL-02', wh: 'WH-AZL-05', type: 'Drinking Water', qty: 3500, rsv: 0, unit: 'liters', prio: 'HIGH' },
      { id: 'RES-AZL-03', wh: 'WH-AZL-05', type: 'Medicine', qty: 150, rsv: 0, unit: 'kits', prio: 'CRITICAL' },
      { id: 'RES-AZL-04', wh: 'WH-AZL-05', type: 'Blankets', qty: 500, rsv: 0, unit: 'units', prio: 'MEDIUM' },

      // Itanagar Warehouse
      { id: 'RES-ITN-01', wh: 'WH-ITN-06', type: 'Food', qty: 2000, rsv: 0, unit: 'packets', prio: 'MEDIUM' },
      { id: 'RES-ITN-02', wh: 'WH-ITN-06', type: 'Drinking Water', qty: 5000, rsv: 0, unit: 'liters', prio: 'MEDIUM' },
      { id: 'RES-ITN-03', wh: 'WH-ITN-06', type: 'Medicine', qty: 320, rsv: 0, unit: 'kits', prio: 'HIGH' },
      { id: 'RES-ITN-04', wh: 'WH-ITN-06', type: 'Emergency Kits', qty: 250, rsv: 0, unit: 'kits', prio: 'HIGH' },

      // Kohima Warehouse
      { id: 'RES-KOH-01', wh: 'WH-KOH-07', type: 'Food', qty: 1600, rsv: 0, unit: 'packets', prio: 'MEDIUM' },
      { id: 'RES-KOH-02', wh: 'WH-KOH-07', type: 'Drinking Water', qty: 3000, rsv: 0, unit: 'liters', prio: 'MEDIUM' },
      { id: 'RES-KOH-03', wh: 'WH-KOH-07', type: 'Medicine', qty: 220, rsv: 0, unit: 'kits', prio: 'HIGH' },
      { id: 'RES-KOH-04', wh: 'WH-KOH-07', type: 'Medical Supplies', qty: 120, rsv: 0, unit: 'boxes', prio: 'HIGH' },

      // Silchar Distribution Hub
      { id: 'RES-SLC-01', wh: 'WH-SLC-08', type: 'Food', qty: 4000, rsv: 0, unit: 'packets', prio: 'CRITICAL' },
      { id: 'RES-SLC-02', wh: 'WH-SLC-08', type: 'Drinking Water', qty: 9000, rsv: 0, unit: 'liters', prio: 'CRITICAL' },
      { id: 'RES-SLC-03', wh: 'WH-SLC-08', type: 'Medicine', qty: 500, rsv: 0, unit: 'kits', prio: 'CRITICAL' },
      { id: 'RES-SLC-04', wh: 'WH-SLC-08', type: 'Emergency Kits', qty: 350, rsv: 0, unit: 'kits', prio: 'HIGH' }
    ];

    const resStmt = db.prepare(`
      INSERT INTO resources (resource_id, warehouse_id, resource_type, quantity, reserved_quantity, unit, priority, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    resources.forEach(r => {
      resStmt.run([r.id, r.wh, r.type, r.qty, r.rsv, r.unit, r.prio, now, now]);
    });
    resStmt.finalize();

    // 6. Insert Logistics / Delivery Requests (Disaster Scenario in Remote Northeast India)
    const requests = [
      {
        id: 'REQ-NER-001',
        destination: 'Haflong Relief Camp, Dima Hasao, Assam',
        lat: 25.1764,
        lng: 93.0177,
        res: 'Medicine',
        qty: 150,
        unit: 'kits',
        prio: 'CRITICAL',
        status: 'PENDING',
        veh: null,
        wh: null
      },
      {
        id: 'REQ-NER-002',
        destination: 'Haflong Community Center, Dima Hasao, Assam',
        lat: 25.1650,
        lng: 93.0240,
        res: 'Drinking Water',
        qty: 4000,
        unit: 'liters',
        prio: 'CRITICAL',
        status: 'PENDING',
        veh: null,
        wh: null
      },
      {
        id: 'REQ-NER-003',
        destination: 'Mahur Hill Village, Dima Hasao, Assam',
        lat: 25.1890,
        lng: 93.1180,
        res: 'Food',
        qty: 800,
        unit: 'packets',
        prio: 'HIGH',
        status: 'ASSIGNED',
        veh: 'V002',
        wh: 'WH-SHL-02'
      },
      {
        id: 'REQ-NER-004',
        destination: 'Champhai Landslide Camp, Mizoram',
        lat: 23.4735,
        lng: 93.3274,
        res: 'Blankets',
        qty: 300,
        unit: 'units',
        prio: 'HIGH',
        status: 'IN_TRANSIT',
        veh: 'V003',
        wh: 'WH-IMP-03'
      },
      {
        id: 'REQ-NER-005',
        destination: 'Moirang Flood Shelter, Bishnupur, Manipur',
        lat: 24.5000,
        lng: 93.7667,
        res: 'Medical Supplies',
        qty: 60,
        unit: 'boxes',
        prio: 'CRITICAL',
        status: 'PENDING',
        veh: null,
        wh: null
      },
      {
        id: 'REQ-NER-006',
        destination: 'Kolasib Rural Clinic, Mizoram',
        lat: 24.2246,
        lng: 92.6784,
        res: 'Medicine',
        qty: 100,
        unit: 'kits',
        prio: 'MEDIUM',
        status: 'DELIVERED',
        veh: 'V005',
        wh: 'WH-AZL-05'
      },
      {
        id: 'REQ-NER-007',
        destination: 'Umrangso Relief Outpost, Dima Hasao, Assam',
        lat: 25.5167,
        lng: 92.7833,
        res: 'Food',
        qty: 600,
        unit: 'packets',
        prio: 'HIGH',
        status: 'PENDING',
        veh: null,
        wh: null
      },
      {
        id: 'REQ-NER-008',
        destination: 'Dharmanagar Flood Shelter, North Tripura',
        lat: 24.3833,
        lng: 92.1667,
        res: 'Drinking Water',
        qty: 2500,
        unit: 'liters',
        prio: 'HIGH',
        status: 'IN_TRANSIT',
        veh: 'V010',
        wh: 'WH-SHL-02'
      }
    ];

    const reqStmt = db.prepare(`
      INSERT INTO logistics_requests (request_id, destination, latitude, longitude, requested_resource, quantity, unit, priority, status, assigned_vehicle_id, source_warehouse_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    requests.forEach(req => {
      reqStmt.run([req.id, req.destination, req.lat, req.lng, req.res, req.qty, req.unit, req.prio, req.status, req.veh, req.wh, now, now]);
    });
    reqStmt.finalize();

    // 7. Insert Initial Audit Events into logistics_events
    const eventStmt = db.prepare(`
      INSERT INTO logistics_events (event_type, request_id, vehicle_id, warehouse_id, resource_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    requests.forEach(req => {
      eventStmt.run(['REQUEST_CREATED', req.id, null, null, null, `Emergency request created for ${req.qty} ${req.unit} of ${req.res} at ${req.destination}`, now]);
    });

    // Seed specific lifecycle events
    eventStmt.run(['INVENTORY_RESERVED', 'REQ-NER-003', 'V002', 'WH-SHL-02', 'RES-SHL-01', 'Reserved 800 packets Food at Shillong Base', now]);
    eventStmt.run(['VEHICLE_ASSIGNED', 'REQ-NER-003', 'V002', 'WH-SHL-02', 'RES-SHL-01', 'Assigned Supply Truck V002 to REQ-NER-003', now]);

    eventStmt.run(['INVENTORY_RESERVED', 'REQ-NER-004', 'V003', 'WH-IMP-03', 'RES-IMP-05', 'Reserved 300 units Blankets at Imphal Depot', now]);
    eventStmt.run(['VEHICLE_ASSIGNED', 'REQ-NER-004', 'V003', 'WH-IMP-03', 'RES-IMP-05', 'Assigned Rescue Vehicle V003 to REQ-NER-004', now]);
    eventStmt.run(['REQUEST_DISPATCHED', 'REQ-NER-004', 'V003', 'WH-IMP-03', 'RES-IMP-05', 'Vehicle V003 dispatched en route to Champhai Landslide Camp', now]);

    eventStmt.run(['INVENTORY_DEDUCTED', 'REQ-NER-006', 'V005', 'WH-AZL-05', 'RES-AZL-03', 'Deducted 100 kits Medicine upon delivery to Kolasib Rural Clinic', now]);
    eventStmt.run(['REQUEST_DELIVERED', 'REQ-NER-006', 'V005', 'WH-AZL-05', 'RES-AZL-03', 'Delivery confirmed at Kolasib Rural Clinic; Van V005 marked AVAILABLE', now]);

    eventStmt.run(['INVENTORY_RESERVED', 'REQ-NER-008', 'V010', 'WH-SHL-02', 'RES-SHL-02', 'Reserved 2500 liters Drinking Water at Shillong Base', now]);
    eventStmt.run(['VEHICLE_ASSIGNED', 'REQ-NER-008', 'V010', 'WH-SHL-02', 'RES-SHL-02', 'Assigned Water Tanker V010 to REQ-NER-008', now]);
    eventStmt.run(['REQUEST_DISPATCHED', 'REQ-NER-008', 'V010', 'WH-SHL-02', 'RES-SHL-02', 'Water Tanker V010 dispatched en route to Dharmanagar Flood Shelter', now]);

    eventStmt.finalize();

    console.log('Database seeded successfully with Northeast India disaster relief and logistics records (Phase 2).');
  });
};

// Allow time for DB connection
setTimeout(seedData, 500);


