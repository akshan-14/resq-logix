const http = require('http');
const db = require('./db');

const API_BASE = 'http://localhost:3000/api/v1';

// A simple utility to get distance between two coords
function distanceKm(lat1, lon1, lat2, lon2) {
  const p = 0.017453292519943295; 
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a)); 
}

// Calculate bearing (heading) from point 1 to point 2
function calculateHeading(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const toDeg = rad => rad * 180 / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

// Send POST request
function postLocation(vehicleId, data) {
  const req = http.request(`${API_BASE}/vehicles/${vehicleId}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  req.on('error', () => {});
  req.write(JSON.stringify([data]));
  req.end();
}

// Global state for simulated vehicles
const activeSimulations = {};

async function simulationTick() {
  db.all(`
    SELECT v.*, 
           lr.request_id, lr.latitude as dest_lat, lr.longitude as dest_lng
    FROM vehicles v
    LEFT JOIN logistics_requests lr ON v.vehicle_id = lr.assigned_vehicle_id AND lr.status IN ('ASSIGNED', 'IN_TRANSIT')
    WHERE v.status IN ('MOVING', 'ON_ROUTE', 'ROUTE_DEVIATION', 'SOS')
  `, [], (err, movingVehicles) => {
    if (err) return;

    movingVehicles.forEach(veh => {
      let sim = activeSimulations[veh.vehicle_id];
      if (!sim) {
        sim = {
          lat: veh.current_latitude,
          lng: veh.current_longitude,
          step: 0,
          deviationActive: veh.vehicle_id === 'V010' // Force V010 to deviate for demo
        };
        activeSimulations[veh.vehicle_id] = sim;
      }

      // If it has a destination, move towards it
      if (veh.dest_lat && veh.dest_lng) {
        let targetLat = veh.dest_lat;
        let targetLng = veh.dest_lng;

        // Force a deviation if this vehicle is marked for it
        if (sim.deviationActive && sim.step > 5 && sim.step < 30) {
          targetLat = veh.dest_lat + 0.5; // Deviate far north
          targetLng = veh.dest_lng + 0.5; // Deviate far east
          
          if (veh.status !== 'ROUTE_DEVIATION') {
            db.run('UPDATE vehicles SET status = ? WHERE vehicle_id = ?', ['ROUTE_DEVIATION', veh.vehicle_id]);
          }
        } else if (sim.deviationActive && sim.step >= 30) {
          // Recover from deviation
          if (veh.status === 'ROUTE_DEVIATION') {
            db.run('UPDATE vehicles SET status = ? WHERE vehicle_id = ?', ['MOVING', veh.vehicle_id]);
          }
        }

        const dist = distanceKm(sim.lat, sim.lng, targetLat, targetLng);
        
        // Speed in km/h. At 1 tick per sec, dist moved = speed / 3600
        const speedKmh = 60; 
        const moveDistKm = speedKmh / 3600; 
        
        // We will speed it up 60x for the demo so they move visibly fast (1 tick = 1 minute of travel)
        const demoSpeedup = moveDistKm * 60;

        let newLat = sim.lat;
        let newLng = sim.lng;
        let heading = calculateHeading(sim.lat, sim.lng, targetLat, targetLng);

        if (dist > demoSpeedup) {
          // Move fractionally towards target
          const fraction = demoSpeedup / dist;
          newLat = sim.lat + (targetLat - sim.lat) * fraction;
          newLng = sim.lng + (targetLng - sim.lng) * fraction;
          
          // Add random jitter for realism
          newLat += (Math.random() - 0.5) * 0.001;
          newLng += (Math.random() - 0.5) * 0.001;
        } else {
          // Reached!
          newLat = targetLat;
          newLng = targetLng;
          if (!sim.deviationActive || sim.step >= 30) {
             // Arrived!
             db.run('UPDATE logistics_requests SET status = "DELIVERED" WHERE request_id = ?', [veh.request_id]);
             db.run('UPDATE vehicles SET status = "DELIVERED" WHERE vehicle_id = ?', [veh.vehicle_id]);
          }
        }

        sim.lat = newLat;
        sim.lng = newLng;
        sim.step += 1;

        postLocation(veh.vehicle_id, {
          latitude: newLat,
          longitude: newLng,
          speed: speedKmh,
          heading: Math.round(heading),
          gps_timestamp: new Date().toISOString()
        });
      } else {
        // Just driving around (Patrol)
        sim.lat += (Math.random() - 0.5) * 0.002;
        sim.lng += (Math.random() - 0.5) * 0.002;
        postLocation(veh.vehicle_id, {
          latitude: sim.lat,
          longitude: sim.lng,
          speed: 30,
          heading: Math.round(Math.random() * 360),
          gps_timestamp: new Date().toISOString()
        });
      }
    });
  });
}

console.log('Starting ResQ-Logix GPS Simulator...');
setInterval(simulationTick, 1000);
