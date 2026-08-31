const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('resq-logix.db');
db.all("SELECT name, sql FROM sqlite_master WHERE type='table';", (err, rows) => {
  rows.forEach(r => {
    console.log('TABLE:', r.name);
    console.log(r.sql);
    console.log('---');
  });
});
