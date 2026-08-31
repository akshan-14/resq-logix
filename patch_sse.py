import os

filepath = 'backend/server.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

sse_logic = """
// --- SSE REAL-TIME VEHICLE STREAMING ---
let sseClients = [];
let sseInterval = null;

const broadcastVehicles = () => {
  if (sseClients.length === 0) return;
  const sql = `
    SELECT v.*, 
           lr.request_id as mission_id, 
           lr.destination as mission_destination,
           lr.latitude as destination_lat,
           lr.longitude as destination_lng,
           lr.requested_resource as cargo,
           lr.quantity as cargo_quantity,
           lr.unit as cargo_unit,
           lr.priority as cargo_priority
    FROM vehicles v
    LEFT JOIN logistics_requests lr 
      ON v.vehicle_id = lr.assigned_vehicle_id 
      AND lr.status IN ('ASSIGNED', 'IN_TRANSIT')
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return;
    const payload = JSON.stringify({ type: 'VEHICLES_UPDATE', data: rows });
    sseClients.forEach(client => client.res.write(`data: ${payload}\n\n`));
  });
};

app.get('/api/v1/live/vehicles', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); 

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  if (sseClients.length === 1 && !sseInterval) {
    sseInterval = setInterval(broadcastVehicles, 1500);
  }

  req.on('close', () => {
    sseClients = sseClients.filter(client => client.id !== clientId);
    if (sseClients.length === 0 && sseInterval) {
      clearInterval(sseInterval);
      sseInterval = null;
    }
  });
});
"""

target = '// --- VEHICLE LOCATIONS ---'
content = content.replace(target, sse_logic + '\n\n' + target)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
