import React, { useState } from 'react';
import { Truck, Navigation, AlertTriangle, CheckCircle, Activity, X } from 'lucide-react';

export default function VehicleSidebar({ vehicles, onSelectVehicle, selectedVehicleId }) {
  const [filter, setFilter] = useState('ALL');

  const filtered = vehicles.filter(v => filter === 'ALL' || v.status === filter);

  const getStatusColor = (status) => {
    switch(status) {
      case 'MOVING': case 'ON_ROUTE': return 'text-green-400';
      case 'IDLE': case 'AVAILABLE': return 'text-yellow-400';
      case 'ROUTE_DEVIATION': case 'SOS': return 'text-red-500';
      case 'DELIVERED': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700 text-slate-200">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold flex items-center gap-2"><Truck size={20}/> Active Fleet</h2>
        <select 
          className="mt-2 w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-slate-200"
          value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="MOVING">Moving</option>
          <option value="IDLE">Idle / Available</option>
          <option value="ROUTE_DEVIATION">Route Deviation</option>
          <option value="SOS">SOS / Critical</option>
        </select>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(veh => (
          <div 
            key={veh.vehicle_id}
            onClick={() => onSelectVehicle(veh)}
            className={`p-3 border-b border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors ${selectedVehicleId === veh.vehicle_id ? 'bg-slate-800 border-l-4 border-l-blue-500' : ''}`}
          >
            <div className="flex justify-between items-start">
              <strong className="text-sm">{veh.vehicle_id}</strong>
              <span className={`text-xs font-bold ${getStatusColor(veh.status)}`}>{veh.status}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">{veh.vehicle_type} • Driver: {veh.driver_name}</div>
            {veh.cargo && (
              <div className="text-xs text-slate-300 mt-1 mt-2 bg-slate-800 p-1 rounded border border-slate-600">
                <span className="text-orange-300 font-semibold">{veh.cargo}</span> ({veh.cargo_quantity} {veh.cargo_unit})
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
