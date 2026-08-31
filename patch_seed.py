import os

filepath = 'backend/seed.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_vehicles = '''    const vehicles = [
      { id: 'V001', type: 'Ambulance', cap: 4, unit: 'persons', lat: 26.1445, lng: 91.7362, loc: 'Guwahati, Assam', status: 'AVAILABLE', fuel: 95, avail: 1 },
      { id: 'V002', type: 'Supply Truck', cap: 5000, unit: 'kg', lat: 25.5788, lng: 91.8933, loc: 'Shillong, Meghalaya', status: 'AVAILABLE', fuel: 88, avail: 1 },
      { id: 'V003', type: 'Rescue Vehicle', cap: 8, unit: 'persons', lat: 24.8170, lng: 93.9368, loc: 'Imphal, Manipur', status: 'ON_ROUTE', fuel: 62, avail: 0 },
      { id: 'V004', type: 'Water Tanker', cap: 10000, unit: 'liters', lat: 23.8315, lng: 91.2868, loc: 'Agartala, Tripura', status: 'AVAILABLE', fuel: 80, avail: 1 },
      { id: 'V005', type: 'Van', cap: 1500, unit: 'kg', lat: 23.7307, lng: 92.7173, loc: 'Aizawl, Mizoram', status: 'BUSY', fuel: 45, avail: 0 },
      { id: 'V006', type: 'Rescue Vehicle', cap: 6, unit: 'persons', lat: 27.0844, lng: 93.6053, loc: 'Itanagar, Arunachal Pradesh', status: 'AVAILABLE', fuel: 90, avail: 1 },
      { id: 'V007', type: 'Supply Truck', cap: 6000, unit: 'kg', lat: 24.8333, lng: 92.7789, loc: 'Silchar, Assam', status: 'MAINTENANCE', fuel: 20, avail: 0 },
      { id: 'V008', type: 'Ambulance', cap: 4, unit: 'persons', lat: 25.6751, lng: 94.1086, loc: 'Kohima, Nagaland', status: 'AVAILABLE', fuel: 85, avail: 1 },
      { id: 'V009', type: 'Supply Truck', cap: 7500, unit: 'kg', lat: 26.1550, lng: 91.7450, loc: 'Guwahati, Assam', status: 'AVAILABLE', fuel: 92, avail: 1 },
      { id: 'V010', type: 'Water Tanker', cap: 8000, unit: 'liters', lat: 25.5850, lng: 91.8800, loc: 'Shillong, Meghalaya', status: 'ON_ROUTE', fuel: 70, avail: 0 }
    ];

    const vehStmt = db.prepare(
      INSERT INTO vehicles (vehicle_id, vehicle_type, capacity, capacity_unit, current_latitude, current_longitude, current_location, status, fuel_level, availability, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    );
    vehicles.forEach(v => {
      vehStmt.run([v.id, v.type, v.cap, v.unit, v.lat, v.lng, v.loc, v.status, v.fuel, v.avail, now, now]);
    });
    vehStmt.finalize();'''

new_vehicles = '''    const vehicles = [
      { id: 'V001', type: 'Ambulance', driver: 'Dr. Rahul', cap: 4, unit: 'persons', lat: 26.1445, lng: 91.7362, loc: 'Guwahati, Assam', status: 'AVAILABLE', fuel: 95, avail: 1 },
      { id: 'V002', type: 'Supply Truck', driver: 'Amit Singh', cap: 5000, unit: 'kg', lat: 25.5788, lng: 91.8933, loc: 'Shillong, Meghalaya', status: 'AVAILABLE', fuel: 88, avail: 1 },
      { id: 'V003', type: 'Rescue Vehicle', driver: 'Major Raj', cap: 8, unit: 'persons', lat: 24.8170, lng: 93.9368, loc: 'Imphal, Manipur', status: 'MOVING', fuel: 62, avail: 0 },
      { id: 'V004', type: 'Water Tanker', driver: 'Bikash', cap: 10000, unit: 'liters', lat: 23.8315, lng: 91.2868, loc: 'Agartala, Tripura', status: 'AVAILABLE', fuel: 80, avail: 1 },
      { id: 'V005', type: 'Van', driver: 'Sonam', cap: 1500, unit: 'kg', lat: 23.7307, lng: 92.7173, loc: 'Aizawl, Mizoram', status: 'IDLE', fuel: 45, avail: 0 },
      { id: 'V006', type: 'Rescue Vehicle', driver: 'NDRF Team 4', cap: 6, unit: 'persons', lat: 27.0844, lng: 93.6053, loc: 'Itanagar, Arunachal Pradesh', status: 'AVAILABLE', fuel: 90, avail: 1 },
      { id: 'V007', type: 'Supply Truck', driver: 'Karan', cap: 6000, unit: 'kg', lat: 24.8333, lng: 92.7789, loc: 'Silchar, Assam', status: 'MAINTENANCE', fuel: 20, avail: 0 },
      { id: 'V008', type: 'Ambulance', driver: 'Dr. Priya', cap: 4, unit: 'persons', lat: 25.6751, lng: 94.1086, loc: 'Kohima, Nagaland', status: 'AVAILABLE', fuel: 85, avail: 1 },
      { id: 'V009', type: 'Supply Truck', driver: 'Sanjay', cap: 7500, unit: 'kg', lat: 26.1550, lng: 91.7450, loc: 'Guwahati, Assam', status: 'AVAILABLE', fuel: 92, avail: 1 },
      { id: 'V010', type: 'Water Tanker', driver: 'Ramesh', cap: 8000, unit: 'liters', lat: 25.5850, lng: 91.8800, loc: 'Shillong, Meghalaya', status: 'MOVING', fuel: 70, avail: 0 }
    ];

    const vehStmt = db.prepare(
      INSERT INTO vehicles (vehicle_id, vehicle_type, driver_name, capacity, capacity_unit, current_latitude, current_longitude, current_location, status, fuel_level, availability, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    );
    vehicles.forEach(v => {
      vehStmt.run([v.id, v.type, v.driver, v.cap, v.unit, v.lat, v.lng, v.loc, v.status, v.fuel, v.avail, now, now]);
    });
    vehStmt.finalize();'''

content = content.replace(old_vehicles, new_vehicles)

# Also update the assignments later in seed.js to update ON_ROUTE to MOVING for V003 and V010
content = content.replace("UPDATE vehicles SET status = 'ON_ROUTE', availability = 0 WHERE vehicle_id IN ('V003', 'V010')", "UPDATE vehicles SET status = 'MOVING', availability = 0 WHERE vehicle_id IN ('V003', 'V010')")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
