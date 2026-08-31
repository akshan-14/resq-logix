import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace marker pin colors based on new status
old_pin_class = """const getVehiclePinClass = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-500';
      case 'ON_ROUTE': return 'bg-blue-500';
      case 'BUSY': return 'bg-orange-500';
      case 'MAINTENANCE': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };"""

new_pin_class = """const getVehiclePinClass = (status) => {
    switch (status) {
      case 'MOVING': 
      case 'ON_ROUTE': return 'bg-green-500';
      case 'IDLE': 
      case 'AVAILABLE': return 'bg-yellow-400';
      case 'ROUTE_DEVIATION': 
      case 'SOS': return 'bg-red-500 animate-pulse';
      case 'DELIVERED': return 'bg-blue-500';
      case 'OFFLINE': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };"""
content = content.replace(old_pin_class, new_pin_class)

# Inject VehicleDetailPanel inside the Map container (absolute positioned)
# Inject VehicleSidebar next to the Dashboard Sidebar
layout_marker = """<div className="w-full md:w-80 bg-slate-900 border-r border-slate-700 overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-6">"""

new_layout = """<div className="flex h-full w-full">
        {/* Active Vehicles Sidebar */}
        <div className="w-72 hidden xl:block flex-shrink-0 border-r border-slate-700">
          <VehicleSidebar 
            vehicles={vehicles} 
            onSelectVehicle={(veh) => setSelectedVehicleId(veh.vehicle_id)} 
            selectedVehicleId={selectedVehicleId} 
          />
        </div>
        <div className="w-full md:w-80 bg-slate-900 border-r border-slate-700 overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-6">"""

# Let's check if we can cleanly inject this.
content = content.replace("""<div className="w-full md:w-80 bg-slate-900 border-r border-slate-700 overflow-y-auto flex-shrink-0">""", """<div className="w-72 hidden lg:block flex-shrink-0 border-r border-slate-700">
          <VehicleSidebar 
            vehicles={vehicles} 
            onSelectVehicle={(veh) => setSelectedVehicleId(veh.vehicle_id)} 
            selectedVehicleId={selectedVehicleId} 
          />
        </div>\n        <div className="w-full md:w-80 bg-slate-900 border-r border-slate-700 overflow-y-auto flex-shrink-0">""")

map_container_marker = """<MapContainer center={[26.2006, 92.9376]} zoom={7} className="w-full h-full">"""
panel_inject = """<VehicleDetailPanel 
              vehicle={vehicles.find(v => v.vehicle_id === selectedVehicleId)} 
              onClose={() => setSelectedVehicleId(null)}
              API_BASE={API_BASE} 
            />\n"""
content = content.replace(map_container_marker, panel_inject + map_container_marker)

# Add polyline to Map rendering
polyline_inject = """
              {/* HISTORICAL POLYLINE */}
              {selectedVehicleId && selectedVehicleHistory.length > 0 && (
                <Polyline 
                  positions={selectedVehicleHistory.map(h => [h.latitude, h.longitude])} 
                  color="#3b82f6" 
                  weight={4} 
                  dashArray="10, 10" 
                  opacity={0.8} 
                />
              )}
"""
content = content.replace("{/* 2. RENDER VEHICLES ON MAP */}", polyline_inject + "{/* 2. RENDER VEHICLES ON MAP */}")

# Update vehicle markers to trigger select
old_marker = """onClick: () => {} // handled by popup"""
new_marker = """onClick: () => setSelectedVehicleId(veh.vehicle_id)"""
# Wait, let's just replace the <Marker directly.

old_marker_full = """<Marker
                  key={`veh-${veh.vehicle_id}`}
                  position={[veh.current_latitude, veh.current_longitude]}
                  icon={createPinIcon(getVehicleEmoji(veh.vehicle_type), getVehiclePinClass(veh.status))}
                >"""

new_marker_full = """<Marker
                  key={`veh-${veh.vehicle_id}`}
                  position={[veh.current_latitude, veh.current_longitude]}
                  icon={createPinIcon(getVehicleEmoji(veh.vehicle_type), getVehiclePinClass(veh.status))}
                  eventHandlers={{ click: () => setSelectedVehicleId(veh.vehicle_id) }}
                >"""

content = content.replace(old_marker_full, new_marker_full)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
