const express = require('express');
const cors = require('cors');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');
const path = require('path');

const app = express();
const port = 3000;

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

app.listen(port, () => {
  console.log(`Backend API listening on port ${port}`);
});
