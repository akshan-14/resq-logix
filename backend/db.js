const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'resq-logix.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON;');

      // Create victims table
      db.run(`
        CREATE TABLE IF NOT EXISTS victims (
          id TEXT PRIMARY KEY,
          name TEXT,
          phone TEXT,
          blood_group TEXT
        )
      `);

      // Create sos_messages table
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

      // Create relay_events table to track the route
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

      // Create vehicles table
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

      // Create warehouses table
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

      // Create resources/inventory table with reservation support
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

      // Create logistics_requests table
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

      // Create logistics_events audit table
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

      // Performance Indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_vehicles_status_avail ON vehicles(status, availability)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_resources_type_wh ON resources(resource_type, warehouse_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_logistics_requests_status_prio ON logistics_requests(status, priority)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_logistics_events_req ON logistics_events(request_id)`);

      console.log('Database tables and indexes initialized.');
    });
  }
});

module.exports = db;

