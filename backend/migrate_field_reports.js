const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'resq-logix.db');
const backupPath = path.join(__dirname, 'resq-logix.db.bak');

function backup() {
    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(dbPath, backupPath);
        console.log("Created backup at resq-logix.db.bak");
    }
}

function migrate() {
    backup();
    const db = new sqlite3.Database(dbPath);
    
    const query = `
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
    `;
    
    db.run(query, (err) => {
        if (err) {
            console.error("Migration failed:", err);
        } else {
            console.log("Migration successful: field_reports table created.");
        }
        db.close();
    });
}

function undo() {
    const db = new sqlite3.Database(dbPath);
    db.run("DROP TABLE IF EXISTS field_reports;", (err) => {
        if (err) {
            console.error("Rollback failed:", err);
        } else {
            console.log("Rollback successful: field_reports table dropped.");
        }
        db.close();
    });
}

const action = process.argv[2];
if (action === 'undo') {
    undo();
} else {
    migrate();
}
