import React from 'react';
import { AlertTriangle, AlertCircle, X, Bell } from 'lucide-react';

export default function AlertCenter({ vehicles, sosAlerts, onSelectVehicle, onSelectSos }) {
  const deviationVehicles = vehicles.filter(v => v.status === 'ROUTE_DEVIATION');
  const sosVehicles = vehicles.filter(v => v.status === 'SOS');
  
  // Combine all active alerts
  const allAlerts = [
    ...sosVehicles.map(v => ({
      id: v.vehicle_id,
      type: 'VEHICLE_SOS',
      title: `Vehicle SOS: ${v.vehicle_id}`,
      desc: `Driver ${v.driver_name} reported an emergency.`,
      icon: <AlertCircle size={16} className="text-red-500" />,
      action: () => onSelectVehicle(v.vehicle_id)
    })),
    ...deviationVehicles.map(v => ({
      id: v.vehicle_id,
      type: 'ROUTE_DEVIATION',
      title: `Route Deviation: ${v.vehicle_id}`,
      desc: `Vehicle off expected route.`,
      icon: <AlertTriangle size={16} className="text-orange-500" />,
      action: () => onSelectVehicle(v.vehicle_id)
    })),
    ...sosAlerts.filter(s => s.status !== 'RESOLVED').map(s => ({
      id: s.messageId,
      type: 'CIVILIAN_SOS',
      title: `Civilian SOS: ${s.emergencyType}`,
      desc: `Severity ${s.severity}/10. Hops: ${s.hopCount}`,
      icon: <AlertCircle size={16} className="text-red-500" />,
      action: () => onSelectSos(s.messageId)
    }))
  ];

  if (allAlerts.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 w-72 bg-slate-900/90 border border-slate-700 shadow-xl rounded-lg z-[1000] overflow-hidden backdrop-blur">
      <div className="bg-slate-800 p-2 flex justify-between items-center border-b border-slate-700">
        <h3 className="font-bold flex items-center gap-2 text-slate-200 text-sm"><Bell size={16}/> Active Alerts ({allAlerts.length})</h3>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {allAlerts.map(alert => (
          <div 
            key={alert.id}
            onClick={alert.action}
            className="p-3 border-b border-slate-700 hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              {alert.icon}
              <strong className="text-sm text-slate-200">{alert.title}</strong>
            </div>
            <p className="text-xs text-slate-400 pl-6">{alert.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
