const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'resq-logix.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
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
      console.log('Database tables initialized.');
    });
  }
});

module.exports = db;
