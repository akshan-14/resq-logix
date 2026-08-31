const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'resq-logix.db');
const db = new sqlite3.Database(dbPath);

const action = process.argv[2];

if (action === 'undo') {
  console.log('Undoing demo data...');
  db.serialize(() => {
    db.run("DELETE FROM logistics_requests WHERE request_id = 'REQ-DEMO-SUCCESS'", (err) => {
      if (err) console.error(err);
      else console.log('Removed request REQ-DEMO-SUCCESS');
    });
    db.run("DELETE FROM resources WHERE resource_id = 'RES-DEMO-SUCCESS'", (err) => {
      if (err) console.error(err);
      else console.log('Removed resource RES-DEMO-SUCCESS');
    });
    db.run("DELETE FROM vehicles WHERE vehicle_id = 'V-DEMO-OFFROAD'", (err) => {
      if (err) console.error(err);
      else console.log('Removed vehicle V-DEMO-OFFROAD');
    });
    db.run("DELETE FROM warehouses WHERE warehouse_id = 'WH-DEMO'", (err) => {
      if (err) console.error(err);
      else console.log('Removed warehouse WH-DEMO');
    });
  });
  db.close();
} else {
  console.log('Seeding demo data...');
  const now = new Date().toISOString();

  db.serialize(() => {
    // 1. Warehouse
    db.get("SELECT warehouse_id FROM warehouses WHERE warehouse_id = 'WH-DEMO'", (err, row) => {
      if (err) return console.error(err);
      if (row) {
        console.log('Warehouse WH-DEMO already exists.');
      } else {
        db.run(
          `INSERT INTO warehouses (warehouse_id, name, location, latitude, longitude, state, status, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['WH-DEMO', 'Demo Emergency Warehouse', 'Demo Safe Zone', 25.0, 93.0, 'Assam', 'OPERATIONAL', now, now],
          (err) => {
            if (err) console.error('Error inserting warehouse:', err.message);
            else console.log('Inserted WH-DEMO');
          }
        );
      }
    });

    // 1.5 Vehicle (OFFROAD to bypass 50 risk limit)
    db.get("SELECT vehicle_id FROM vehicles WHERE vehicle_id = 'V-DEMO-OFFROAD'", (err, row) => {
      if (err) return console.error(err);
      if (row) {
        console.log('Vehicle V-DEMO-OFFROAD already exists.');
      } else {
        db.run(
          `INSERT INTO vehicles (vehicle_id, vehicle_type, capacity, capacity_unit, current_latitude, current_longitude, current_location, status, fuel_level, availability, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['V-DEMO-OFFROAD', 'OFFROAD', 5000, 'kg', 25.0, 93.0, 'Demo Safe Zone', 'AVAILABLE', 100, 1, now, now],
          (err) => {
            if (err) console.error('Error inserting vehicle:', err.message);
            else console.log('Inserted V-DEMO-OFFROAD');
          }
        );
      }
    });

    // 2. Resource
    db.get("SELECT resource_id FROM resources WHERE resource_id = 'RES-DEMO-SUCCESS'", (err, row) => {
      if (err) return console.error(err);
      if (row) {
        console.log('Resource RES-DEMO-SUCCESS already exists.');
      } else {
        db.run(
          `INSERT INTO resources (resource_id, warehouse_id, resource_type, quantity, reserved_quantity, unit, priority, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['RES-DEMO-SUCCESS', 'WH-DEMO', 'Emergency Rations', 2000, 0, 'kg', 'CRITICAL', now, now],
          (err) => {
            if (err) console.error('Error inserting resource:', err.message);
            else console.log('Inserted RES-DEMO-SUCCESS');
          }
        );
      }
    });

    // 3. Request
    db.get("SELECT request_id FROM logistics_requests WHERE request_id = 'REQ-DEMO-SUCCESS'", (err, row) => {
      if (err) return console.error(err);
      if (row) {
        console.log('Request REQ-DEMO-SUCCESS already exists.');
      } else {
        db.run(
          `INSERT INTO logistics_requests (request_id, destination, latitude, longitude, requested_resource, quantity, unit, priority, status, assigned_vehicle_id, source_warehouse_id, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['REQ-DEMO-SUCCESS', 'Safe Zone', 25.1, 93.1, 'Emergency Rations', 1000, 'kg', 'HIGH', 'PENDING', null, null, now, now],
          (err) => {
            if (err) console.error('Error inserting request:', err.message);
            else console.log('Inserted REQ-DEMO-SUCCESS');
          }
        );
      }
    });
  });
  
  // Wait slightly before closing to allow async db checks to finish
  setTimeout(() => db.close(), 1000);
}
