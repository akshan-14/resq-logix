# Field Report DB Migration

## Existing Schema
The current SQLite database (`resq-logix.db`) consists of the following tables:
- `victims` (id, name, phone, blood_group)
- `sos_messages` (messageId, victimId, latitude, longitude, emergencyType, severity, timestamp, ttl, hopCount, status)
- `relay_events`
- `vehicles`
- `warehouses`
- `resources`
- `logistics_requests`
- `logistics_events`

No existing migrations framework is in place. Existing tables strictly control the live logistics application and AI processing.

## Migration Strategy
We will create a standalone script `backend/migrate_field_reports.js` to run SQLite commands directly.
The script will perform the following actions without touching any existing tables:
1. Back up `resq-logix.db` to `resq-logix.db.bak`.
2. CREATE TABLE `field_reports` if it does not exist.
3. Ensure proper datatypes (`REAL` for coordinates, `TEXT` for enums).

## Field Reports Schema
```sql
CREATE TABLE IF NOT EXISTS field_reports (
    report_id TEXT PRIMARY KEY,
    message_id TEXT UNIQUE,
    report_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    severity TEXT NOT NULL,
    latitude REAL NOT NULL CHECK(latitude >= -90 AND latitude <= 90),
    longitude REAL NOT NULL CHECK(longitude >= -180 AND longitude <= 180),
    location_accuracy_m REAL,
    timestamp TEXT NOT NULL,
    description TEXT,
    people_affected INTEGER,
    injured_people INTEGER,
    reporter_id TEXT,
    device_id TEXT,
    created_offline INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    source TEXT NOT NULL,
    ble_hop_count INTEGER DEFAULT 0,
    verified_by TEXT,
    verified_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

## Rollback Strategy
To rollback:
`node backend/migrate_field_reports.js undo`
This will simply execute `DROP TABLE IF EXISTS field_reports;` and will NOT drop any other logistics table.
