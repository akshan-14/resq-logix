import os

filepath = 'backend/server.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Find getVehiclesHandler
start_idx = content.find('const getVehiclesHandler =')
end_idx = content.find('};', start_idx) + 2

old_handler = content[start_idx:end_idx]

new_handler = '''const getVehiclesHandler = (req, res) => {
  const { status, vehicle_type, availability } = req.query;
  let sql = 
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
    WHERE 1=1
  ;
  const params = [];

  if (status) {
    sql += ' AND v.status = ?';
    params.push(status.toUpperCase());
  }
  if (vehicle_type) {
    sql += ' AND v.vehicle_type LIKE ?';
    params.push(%%);
  }
  if (availability !== undefined) {
    sql += ' AND v.availability = ?';
    params.push(Number(availability));
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    res.status(200).json({ status: 'success', count: rows.length, data: rows });
  });
};'''

content = content.replace(old_handler, new_handler)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
