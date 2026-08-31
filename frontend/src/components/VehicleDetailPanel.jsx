import React, { useState, useEffect } from 'react';
import { X, MapPin, Truck, AlertTriangle, Phone, Package, Navigation2 } from 'lucide-react';

export default function VehicleDetailPanel({ vehicle, onClose, API_BASE }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (vehicle) {
      fetch(`${API_BASE}/vehicles/${vehicle.vehicle_id}/locations?limit=50`)
        .then(r => r.json())
        .then(d => {
          if(d.status === 'success') setHistory(d.data);
        })
        .catch(console.error);
    }
  }, [vehicle]);

  if (!vehicle) return null;

  return (
    <div className="absolute top-4 left-4 w-80 bg-slate-900 border border-slate-700 shadow-xl rounded-lg z-[1000] overflow-hidden text-slate-200">
      <div className="bg-slate-800 p-3 flex justify-between items-center border-b border-slate-700">
        <h3 className="font-bold flex items-center gap-2"><Truck size={18}/> {vehicle.vehicle_id} Details</h3>
        <button onClick={onClose} className="hover:text-red-400"><X size={18}/></button>
      </div>
      <div className="p-4 space-y-4">
        
        {/* Status Banner */}
        <div className={`p-2 rounded font-bold text-center text-sm border ${
          vehicle.status === 'ROUTE_DEVIATION' ? 'bg-red-900/30 border-red-500 text-red-400' :
          vehicle.status === 'MOVING' ? 'bg-green-900/30 border-green-500 text-green-400' :
          'bg-slate-800 border-slate-600 text-slate-300'
        }`}>
          {vehicle.status === 'ROUTE_DEVIATION' ? <><AlertTriangle size={16} className="inline mr-1"/> OFF ROUTE ALERT</> : vehicle.status}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-slate-400">Driver</div>
          <div className="font-medium text-right flex justify-end gap-1"><Phone size={14} className="mt-0.5 text-blue-400"/> {vehicle.driver_name}</div>
          
          <div className="text-slate-400">Type</div>
          <div className="font-medium text-right">{vehicle.vehicle_type}</div>

          <div className="text-slate-400">Heading</div>
          <div className="font-medium text-right">
            {history[0]?.heading ? `${history[0].heading}°` : 'Unknown'}
          </div>

          <div className="text-slate-400">Speed</div>
          <div className="font-medium text-right">
            {history[0]?.speed ? `${Math.round(history[0].speed)} km/h` : '0 km/h'}
          </div>
        </div>

        {/* Mission Info */}
        {vehicle.mission_id && (
          <div className="mt-4 p-3 border border-slate-600 bg-slate-800 rounded">
            <h4 className="font-bold text-sm text-blue-400 mb-2 border-b border-slate-700 pb-1">Active Mission</h4>
            <div className="text-xs space-y-2">
              <div className="flex gap-2"><Package size={14} className="text-orange-400 shrink-0"/> <span>{vehicle.cargo_quantity} {vehicle.cargo_unit} <strong>{vehicle.cargo}</strong></span></div>
              <div className="flex gap-2"><MapPin size={14} className="text-green-400 shrink-0"/> <span>{vehicle.mission_destination}</span></div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
