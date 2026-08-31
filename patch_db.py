import os

filepath = 'backend/db.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add driver_name and expand status CHECK constraint
old_schema = '''        CREATE TABLE IF NOT EXISTS vehicles (
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
        )'''

new_schema = '''        CREATE TABLE IF NOT EXISTS vehicles (
          vehicle_id TEXT PRIMARY KEY,
          vehicle_type TEXT NOT NULL,
          driver_name TEXT DEFAULT 'Unassigned',
          capacity REAL NOT NULL CHECK(capacity > 0),
          capacity_unit TEXT NOT NULL,
          current_latitude REAL NOT NULL,
          current_longitude REAL NOT NULL,
          current_location TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('AVAILABLE', 'ON_ROUTE', 'BUSY', 'MAINTENANCE', 'MOVING', 'IDLE', 'STOPPED', 'SOS', 'ROUTE_DEVIATION', 'OFFLINE', 'DELIVERED')),
          fuel_level REAL DEFAULT 100 CHECK(fuel_level >= 0 AND fuel_level <= 100),
          availability INTEGER DEFAULT 1 CHECK(availability IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )'''

content = content.replace(old_schema, new_schema)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
