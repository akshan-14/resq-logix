const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const seedData = () => {
  console.log('Seeding database...');
  
  const victim1Id = uuidv4();
  const victim2Id = uuidv4();

  db.serialize(() => {
    // Insert victims
    db.run("INSERT INTO victims (id, name, phone, blood_group) VALUES (?, ?, ?, ?)", 
      [victim1Id, 'Amit Sharma', '+919876543210', 'O+']);
    db.run("INSERT INTO victims (id, name, phone, blood_group) VALUES (?, ?, ?, ?)", 
      [victim2Id, 'Priya Patel', '+919876543211', 'B+']);

    // Insert SOS Messages
    const sos1Id = uuidv4();
    db.run(`
      INSERT INTO sos_messages (messageId, victimId, latitude, longitude, emergencyType, severity, timestamp, ttl, hopCount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [sos1Id, victim1Id, 28.6139, 77.2090, 'EARTHQUAKE_TRAPPED', 9, new Date().toISOString(), 3, 2, 'ACTIVE']);

    const sos2Id = uuidv4();
    db.run(`
      INSERT INTO sos_messages (messageId, victimId, latitude, longitude, emergencyType, severity, timestamp, ttl, hopCount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [sos2Id, victim2Id, 28.6239, 77.2190, 'FIRE_MEDICAL', 7, new Date().toISOString(), 5, 0, 'ACKNOWLEDGED']);

    console.log('Database seeded successfully.');
  });
};

// Allow time for DB connection
setTimeout(seedData, 500);
