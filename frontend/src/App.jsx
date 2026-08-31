import React, { useState, useEffect } from 'react';
import HistoricalAnalyticsPanel from './components/HistoricalAnalyticsPanel';
import SimulatorPanel from './components/SimulatorPanel';
import NetworkPanel from './components/NetworkPanel';
import InventoryPanel from './components/InventoryPanel';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import './App.css';
import VehicleSidebar from './components/VehicleSidebar';
import VehicleDetailPanel from './components/VehicleDetailPanel';
import AlertCenter from './components/AlertCenter';

// Fix Leaflet default marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_BASE = import.meta.env.VITE_API_URL || 'https://resq-logix-backend.onrender.com/api/v1';

// Custom Pin Icon Generator
const createPinIcon = (emoji, pinClass) => {
  return L.divIcon({
    className: '',
    html: `<div class="custom-pin ${pinClass}">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// Map Recenter Helper Component
function MapViewUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard'); // 'sos' | 'logistics'
  const [logisticsSubTab, setLogisticsSubTab] = useState('requests'); // 'requests' | 'fleet' | 'warehouses' | 'ai'

  // Backend Connection
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // SOS State
  const [alerts, setAlerts] = useState([]);
  const [routes, setRoutes] = useState({});
  const [isSimulating, setIsSimulating] = useState(false);

  // Logistics State
  const [vehicles, setVehicles] = useState([]);
  // GPS Tracking State
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState([]);

  const [warehouses, setWarehouses] = useState([]);
  const [resources, setResources] = useState([]);
  const [logisticsRequests, setLogisticsRequests] = useState([]);
  const [logisticsSummary, setLogisticsSummary] = useState(null);
  const [logisticsEvents, setLogisticsEvents] = useState([]);
  const [aiContextData, setAiContextData] = useState(null);

  // Logistics UI Filters & Selection
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [aiRecommendReq, setAiRecommendReq] = useState(null);
  const [aiDecision, setAiDecision] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fetchAiRecommendation = async (req) => {
    setAiRecommendReq(req);
    setIsAiLoading(true);
    setAiDecision(null);
    try {
      const response = await fetch(`${API_BASE}/logistics/ai-recommend/${req.request_id}`);
      const data = await response.json();
      setAiDecision(data);
    } catch (e) {
      setAiDecision({ error: e.message || 'Failed to fetch AI recommendation' });
    } finally {
      setIsAiLoading(false);
    }
  };

  const [requestFilter, setRequestFilter] = useState('ALL');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);

  // Layer Toggles for Map
  const [layerVisibility, setLayerVisibility] = useState({
    warehouses: true,
    vehicles: true,
    requests: true,
    sosAlerts: true
  });

  // New Request Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRequestForm, setNewRequestForm] = useState({
    destination: '',
    latitude: 25.1764,
    longitude: 93.0177,
    requested_resource: 'Medicine',
    quantity: 100,
    unit: 'kits',
    priority: 'HIGH'
  });

  // Assign Request Modal State
  const [assignModalReq, setAssignModalReq] = useState(null);
  const [selectedAssignVeh, setSelectedAssignVeh] = useState('');
  const [selectedAssignWh, setSelectedAssignWh] = useState('');

  // Fetch SOS Data
  const fetchSOS = async () => {
    try {
      const healthRes = await fetch(`${API_BASE}/health`);
      setIsConnected(healthRes.ok);

      const sosRes = await fetch(`${API_BASE}/sos`);
      if (sosRes.ok) {
        const data = await sosRes.json();
        setAlerts(data.data || []);
      }

      const routesRes = await fetch(`${API_BASE}/mesh/routes`);
      if (routesRes.ok) {
        const routesData = await routesRes.json();
        const routeMap = {};
        (routesData.data || []).forEach(r => {
          if (!routeMap[r.messageId]) routeMap[r.messageId] = [];
          routeMap[r.messageId].push(r);
        });
        setRoutes(routeMap);
      }
    } catch (err) {
      console.error("SOS Fetch error:", err);
      setIsConnected(false);
    }
  };

  // Fetch Logistics Data
  const fetchLogistics = async () => {
    try {
      const [vehRes, whRes, resRes, reqRes, sumRes, aiRes, evtRes] = await Promise.all([
        /* fetch(`${API_BASE}/vehicles`) removed for SSE */
        fetch(`${API_BASE}/warehouses`),
        fetch(`${API_BASE}/resources`),
        fetch(`${API_BASE}/logistics/requests`),
        fetch(`${API_BASE}/logistics/summary`),
        fetch(`${API_BASE}/logistics/ai-context`),
        fetch(`${API_BASE}/logistics/events?limit=25`)
      ]);

      
      if (whRes.ok) {
        const d = await whRes.json();
        setWarehouses(d.data || []);
      }
      if (resRes.ok) {
        const d = await resRes.json();
        setResources(d.data || []);
      }
      if (reqRes.ok) {
        const d = await reqRes.json();
        setLogisticsRequests(d.data || []);
      }
      if (sumRes.ok) {
        const d = await sumRes.json();
        setLogisticsSummary(d.data);
      }
      if (aiRes.ok) {
        const d = await aiRes.json();
        setAiContextData(d.data);
      }
      if (evtRes.ok) {
        const d = await evtRes.json();
        setLogisticsEvents(d.data || []);
      }
    } catch (err) {
      console.error("Logistics Fetch error:", err);
    }
  };

  // Unified Refresh
  const refreshAll = async () => {
    await Promise.all([fetchSOS(), fetchLogistics()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 4000);
    return () => clearInterval(interval);
  }, []);

  // SOS Status Update

  // Set up SSE for live vehicles
  useEffect(() => {
    const sse = new EventSource(`${API_BASE.replace('/api/v1', '/api/v1/live')}/vehicles`);
    sse.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'VEHICLES_UPDATE') {
          setVehicles(payload.data);
        }
      } catch (err) {}
    };
    return () => sse.close();
  }, []);

  // Fetch history when vehicle selected
  useEffect(() => {
    if (selectedVehicleId) {
      fetch(`${API_BASE}/vehicles/${selectedVehicleId}/locations?limit=50`)
        .then(r => r.json())
        .then(d => {
          if(d.status === 'success') setSelectedVehicleHistory(d.data);
        });
    } else {
      setSelectedVehicleHistory([]);
    }
  }, [selectedVehicleId]);

  const updateSOSStatus = async (messageId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/sos/${messageId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchSOS();
    } catch (err) {
      console.error("Failed to update SOS status:", err);
    }
  };

  // Simulate Offline Mesh SOS
  const simulateOfflineSOS = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    try {
      await fetch(`${API_BASE}/mesh/simulate`, { method: 'POST' });
      setTimeout(() => {
        fetchSOS();
        setIsSimulating(false);
      }, 4500);
    } catch (err) {
      console.error(err);
      setIsSimulating(false);
    }
  };

  // Vehicle Status Update
  const updateVehicleStatus = async (vehicleId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchLogistics();
    } catch (err) {
      console.error("Failed to update vehicle:", err);
    }
  };

  // Logistics Request Status Update
  const updateLogisticsRequest = async (requestId, payload) => {
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/logistics/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to update logistics request');
        alert(`Action Failed: ${data.error || 'Operation rejected by backend'}`);
      } else {
        fetchLogistics();
      }
    } catch (err) {
      console.error("Failed to update logistics request:", err);
      setErrorMessage(err.message);
    }
  };

  // Create New Logistics Request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/logistics/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequestForm)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error || 'Failed to create request'}`);
        return;
      }
      setIsModalOpen(false);
      setNewRequestForm({
        destination: '',
        latitude: 25.1764,
        longitude: 93.0177,
        requested_resource: 'Medicine',
        quantity: 100,
        unit: 'kits',
        priority: 'HIGH'
      });
      fetchLogistics();
    } catch (err) {
      console.error("Failed to create request:", err);
    }
  };

  // Handle Manual Assignment from Modal
  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (!assignModalReq || !selectedAssignVeh || !selectedAssignWh) return;

    updateLogisticsRequest(assignModalReq.request_id, {
      status: 'ASSIGNED',
      assigned_vehicle_id: selectedAssignVeh,
      source_warehouse_id: selectedAssignWh
    });
    setAssignModalReq(null);
  };

  // Smart Quick-Assign Helper
  const handleSmartQuickAssign = (req) => {
    // Find available vehicle
    const availVeh = vehicles.find(v => v.status === 'AVAILABLE' && v.availability === 1);
    if (!availVeh) {
      alert('No vehicles currently available for assignment.');
      return;
    }

    // Find warehouse with sufficient available stock
    const matchingResource = resources.find(r => 
      r.resource_type === req.requested_resource && 
      (r.quantity - r.reserved_quantity) >= req.quantity
    );

    if (!matchingResource) {
      alert(`No operational warehouse currently has ${req.quantity} ${req.unit} of ${req.requested_resource} available.`);
      return;
    }

    updateLogisticsRequest(req.request_id, {
      status: 'ASSIGNED',
      assigned_vehicle_id: availVeh.vehicle_id,
      source_warehouse_id: matchingResource.warehouse_id
    });
  };

  // SOS Stats
  const activeSOSCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const criticalSOSCount = alerts.filter(a => a.severity >= 8 && a.status !== 'RESCUED' && a.status !== 'CANCELLED').length;
  const ackSOSCount = alerts.filter(a => a.status === 'ACKNOWLEDGED').length;
  const rescuedSOSCount = alerts.filter(a => a.status === 'RESCUED').length;

  const getSeverityClass = (sev) => {
    if (sev >= 8) return 'severity-critical';
    if (sev >= 6) return 'severity-high';
    if (sev >= 4) return 'severity-medium';
    return 'severity-low';
  };

  const getSeverityLabel = (sev) => {
    if (sev >= 8) return 'CRITICAL';
    if (sev >= 6) return 'HIGH';
    if (sev >= 4) return 'MEDIUM';
    return 'LOW';
  };

  // Vehicle Helper
  const getVehicleEmoji = (type) => {
    if (type.includes('Ambulance')) return '🚑';
    if (type.includes('Supply Truck')) return '🚛';
    if (type.includes('Water Tanker')) return '💧';
    if (type.includes('Rescue')) return '🚒';
    return '🚐';
  };

  const getVehiclePinClass = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'pin-vehicle-avail';
      case 'ON_ROUTE': return 'pin-vehicle-route';
      case 'BUSY': return 'pin-vehicle-busy';
      default: return 'pin-vehicle-maint';
    }
  };

  const getRequestPinClass = (priority, status) => {
    if (status === 'DELIVERED') return 'pin-request-deliv';
    switch (priority) {
      case 'CRITICAL': return 'pin-request-crit';
      case 'HIGH': return 'pin-request-high';
      default: return 'pin-request-med';
    }
  };

  // Filtered Lists
  const filteredVehicles = vehicles.filter(v => {
    if (vehicleFilter === 'ALL') return true;
    return v.status === vehicleFilter;
  });

  const filteredRequests = logisticsRequests.filter(r => {
    if (requestFilter === 'ALL') return true;
    if (['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(requestFilter)) {
      return r.status === requestFilter;
    }
    return r.priority === requestFilter;
  });

  // Calculate Map Center dynamically
  const mapCenter = activeTab === 'dispatch' && alerts.length > 0
    ? [alerts[0].latitude, alerts[0].longitude]
    : [25.5788, 92.5]; // Northeast India Center
  const mapZoom = activeTab === 'dispatch' ? 9 : 7;

  return (
    <div className="app-container">
      {/* Top Application Header */}
      <header className="header">
        <div className="header-left">
          <h1>
            🛡️ ResQ-Logix
            <span className="header-badge">Northeast India Disaster Ops</span>
          </h1>

          {/* Primary View Switcher */}
          <nav className="nav-tabs">
            <button className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              Command Centre
            </button>
            <button className={`nav-tab-btn ${activeTab === 'dispatch' ? 'active' : ''}`} onClick={() => setActiveTab('dispatch')}>
              Smart Dispatch
            </button>
            <button className={`nav-tab-btn ${activeTab === 'network' ? 'active' : ''}`} onClick={() => setActiveTab('network')}>
              Offline Mesh
            </button>
            <button className={`nav-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
              Inventory
            </button>
            <button className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              Analytics & Reports
            </button>
            <button className={`nav-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`} onClick={() => setActiveTab('simulator')}>
              Scenario Simulator
            </button>
          </nav>
        </div>

        <div className="status-indicator">
          <span>Backend Status:</span>
          <div className={`status-dot ${isConnected ? 'online' : 'offline'}`}></div>
          <span>{isConnected ? 'Connected' : 'Offline'}</span>
        </div>
      </header>

      <div className="main-content">
        {activeTab === 'analytics' && (
           <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)', overflow: 'hidden' }}>
              <HistoricalAnalyticsPanel logisticsRequests={logisticsRequests} />
           </div>
        )}
        {activeTab === 'simulator' && (
           <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)' }}>
              <SimulatorPanel />
           </div>
        )}
        {activeTab === 'network' && (
           <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)' }}>
              <NetworkPanel />
           </div>
        )}
        {activeTab === 'inventory' && (
           <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)' }}>
              <InventoryPanel />
           </div>
        )}
        {/* SIDEBAR PANEL */}
        <aside className="sidebar" style={{ display: ['dashboard', 'dispatch'].includes(activeTab) ? 'flex' : 'none' }}>
          {/* ========================================================= */}
          {/* TAB 1: LOGISTICS MANAGEMENT SIDEBAR VIEW                  */}
          {/* ========================================================= */}
          {activeTab === 'dashboard' && (
            <>
              {/* Logistics KPI Stats Ribbon */}
              <div className="stats-panel">
                <div className="stat-box">
                  <div className="stat-value" style={{ color: '#15803d' }}>
                    {logisticsSummary?.vehicles?.available ?? vehicles.filter(v => v.status === 'AVAILABLE').length}
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>/{vehicles.length}</span>
                  </div>
                  <div className="stat-label">Vehicles Avail</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value" style={{ color: '#4338ca' }}>
                    {logisticsSummary?.warehouses?.operational ?? warehouses.length}
                  </div>
                  <div className="stat-label">Operational Hubs</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value" style={{ color: '#c2410c' }}>
                    {logisticsSummary?.requests?.active_deliveries ?? logisticsRequests.filter(r => r.status === 'ASSIGNED' || r.status === 'IN_TRANSIT').length}
                  </div>
                  <div className="stat-label">Active Deliveries</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value" style={{ color: '#dc2626' }}>
                    {logisticsSummary?.requests?.critical ?? logisticsRequests.filter(r => r.priority === 'CRITICAL' && r.status !== 'DELIVERED').length}
                  </div>
                  <div className="stat-label">Critical Demands</div>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="sub-nav-bar">
                <button
                  className={`sub-nav-btn ${logisticsSubTab === 'requests' ? 'active' : ''}`}
                  onClick={() => setLogisticsSubTab('requests')}
                >
                  📋 Delivery Demands ({logisticsRequests.length})
                </button>
                <button
                  className={`sub-nav-btn ${logisticsSubTab === 'fleet' ? 'active' : ''}`}
                  onClick={() => setLogisticsSubTab('fleet')}
                >
                  🚚 Fleet ({vehicles.length})
                </button>
                <button
                  className={`sub-nav-btn ${logisticsSubTab === 'warehouses' ? 'active' : ''}`}
                  onClick={() => setLogisticsSubTab('warehouses')}
                >
                  🏢 Warehouses ({warehouses.length})
                </button>
                <button
                  className={`sub-nav-btn ${logisticsSubTab === 'ai' ? 'active' : ''}`}
                  onClick={() => setLogisticsSubTab('ai')}
                >
                  ⚡ AI & Audit Log
                </button>
              </div>

              {/* 1. DELIVERY REQUESTS SUB-VIEW */}
              {logisticsSubTab === 'requests' && (
                <>
                  <div className="filter-bar">
                    <span>Filter Demand:</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select 
                        className="filter-select"
                        value={requestFilter}
                        onChange={(e) => setRequestFilter(e.target.value)}
                      >
                        <option value="ALL">All Requests ({logisticsRequests.length})</option>
                        <option value="PENDING">Pending</option>
                        <option value="ASSIGNED">Assigned</option>
                        <option value="IN_TRANSIT">In Transit</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="CRITICAL">Critical Priority</option>
                      </select>
                      <button 
                        className="btn-primary-sm"
                        onClick={() => setIsModalOpen(true)}
                      >
                        + New Request
                      </button>
                    </div>
                  </div>

                  <div className="logistics-list-container">
                    {filteredRequests.map(req => (
                      <div key={req.request_id} className="logistics-card">
                        <div className="card-header">
                          <div className="card-title">
                            📦 {req.requested_resource}
                            <span className={`severity-badge severity-${req.priority.toLowerCase()}`}>
                              {req.priority}
                            </span>
                          </div>
                          <span className={`badge badge-${req.status.toLowerCase()}`}>
                            {req.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="card-subtitle" style={{ fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                          📍 {req.destination}
                        </div>

                        <div className="card-details-grid">
                          <div>
                            <span className="detail-label">Quantity Demanded</span>
                            <span className="detail-value">{req.quantity} {req.unit}</span>
                          </div>
                          <div>
                            <span className="detail-label">Request ID</span>
                            <span className="detail-value">{req.request_id}</span>
                          </div>
                          <div>
                            <span className="detail-label">Assigned Vehicle</span>
                            <span className="detail-value">
                              {req.assigned_vehicle_id ? `${req.assigned_vehicle_id} (${req.assigned_vehicle_type || 'Vehicle'})` : 'None (Unassigned)'}
                            </span>
                          </div>
                          <div>
                            <span className="detail-label">Source Depot</span>
                            <span className="detail-value">{req.source_warehouse_name || req.source_warehouse_id || 'Pending Allocation'}</span>
                          </div>
                        </div>

                        {/* Request Action Progression (Strict State Machine) */}
                        <div className="card-actions">
                          {req.status === 'PENDING' && (
                            <>
                              <button 
                                className="btn btn-ack"
                                onClick={() => handleSmartQuickAssign(req)}
                                title="Auto-assigns first available vehicle and warehouse with verified stock"
                              >
                                Smart Auto-Assign
                              </button>
                              <button
                                className="btn btn-outline"
                                onClick={() => fetchAiRecommendation(req)}
                                style={{ borderColor: '#6366f1', color: '#6366f1' }}
                              >
                                AI Recommend 🧠
                              </button>
                              <button
                                className="btn btn-outline"
                                onClick={() => {
                                  setAssignModalReq(req);
                                  const avail = vehicles.find(v => v.status === 'AVAILABLE');
                                  setSelectedAssignVeh(avail ? avail.vehicle_id : '');
                                  setSelectedAssignWh(warehouses[0]?.warehouse_id || '');
                                }}
                              >
                                Manual Assign...
                              </button>
                              <button 
                                className="btn btn-cancel"
                                onClick={() => updateLogisticsRequest(req.request_id, { status: 'CANCELLED' })}
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {req.status === 'ASSIGNED' && (
                            <>
                              <button 
                                className="btn btn-dispatch"
                                onClick={() => updateLogisticsRequest(req.request_id, { status: 'IN_TRANSIT' })}
                              >
                                Dispatch (In Transit) 🚀
                              </button>
                              <button 
                                className="btn btn-cancel"
                                onClick={() => updateLogisticsRequest(req.request_id, { status: 'CANCELLED' })}
                              >
                                Cancel & Release Stock
                              </button>
                            </>
                          )}

                          {req.status === 'IN_TRANSIT' && (
                            <>
                              <button 
                                className="btn btn-rescue"
                                onClick={() => updateLogisticsRequest(req.request_id, { status: 'DELIVERED' })}
                              >
                                Confirm Delivered ✓
                              </button>
                              <button 
                                className="btn btn-cancel"
                                onClick={() => updateLogisticsRequest(req.request_id, { status: 'CANCELLED' })}
                              >
                                Cancel Delivery
                              </button>
                            </>
                          )}

                          {req.status === 'DELIVERED' && (
                            <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                              ✓ Relief Delivered & Vehicle Freed
                            </span>
                          )}

                          {req.status === 'CANCELLED' && (
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                              ✕ Request Cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* 2. FLEET SUB-VIEW */}
              {logisticsSubTab === 'fleet' && (
                <>
                  <div className="filter-bar">
                    <span>Filter Fleet:</span>
                    <select 
                      className="filter-select"
                      value={vehicleFilter}
                      onChange={(e) => setVehicleFilter(e.target.value)}
                    >
                      <option value="ALL">All Vehicles ({vehicles.length})</option>
                      <option value="AVAILABLE">Available</option>
                      <option value="ON_ROUTE">On Route</option>
                      <option value="BUSY">Busy</option>
                      <option value="MAINTENANCE">Maintenance</option>
                    </select>
                  </div>

                  <div className="logistics-list-container">
                    {filteredVehicles.map(veh => (
                      <div key={veh.vehicle_id} className="logistics-card">
                        <div className="card-header">
                          <div className="card-title">
                            {getVehicleEmoji(veh.vehicle_type)} {veh.vehicle_id} - {veh.vehicle_type}
                          </div>
                          <span className={`badge badge-${veh.status.toLowerCase()}`}>
                            {veh.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="card-details-grid">
                          <div>
                            <span className="detail-label">Base Location</span>
                            <span className="detail-value">📍 {veh.current_location}</span>
                          </div>
                          <div>
                            <span className="detail-label">Payload Capacity</span>
                            <span className="detail-value">{veh.capacity} {veh.capacity_unit}</span>
                          </div>
                          <div>
                            <span className="detail-label">Fuel Level ({veh.fuel_level}%)</span>
                            <div className="fuel-meter-container">
                              <div className="fuel-meter-bar">
                                <div 
                                  className="fuel-meter-fill"
                                  style={{
                                    width: `${veh.fuel_level}%`,
                                    background: veh.fuel_level > 60 ? '#22c55e' : (veh.fuel_level > 30 ? '#f59e0b' : '#ef4444')
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <span className="detail-label">Availability</span>
                            <span className="detail-value" style={{ color: veh.availability ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                              {veh.availability ? 'Ready for Dispatch' : 'Occupied / In Transit'}
                            </span>
                          </div>
                        </div>

                        {/* Status Control Buttons */}
                        <div className="card-actions">
                          <button 
                            className={`btn btn-outline ${veh.status === 'AVAILABLE' ? 'btn-disabled' : ''}`}
                            onClick={() => updateVehicleStatus(veh.vehicle_id, 'AVAILABLE')}
                            disabled={veh.status === 'AVAILABLE'}
                          >
                            Set Available
                          </button>
                          <button 
                            className={`btn btn-outline ${veh.status === 'ON_ROUTE' ? 'btn-disabled' : ''}`}
                            onClick={() => updateVehicleStatus(veh.vehicle_id, 'ON_ROUTE')}
                            disabled={veh.status === 'ON_ROUTE'}
                          >
                            Set On Route
                          </button>
                          <button 
                            className={`btn btn-outline ${veh.status === 'BUSY' ? 'btn-disabled' : ''}`}
                            onClick={() => updateVehicleStatus(veh.vehicle_id, 'BUSY')}
                            disabled={veh.status === 'BUSY'}
                          >
                            Set Busy
                          </button>
                          <button 
                            className={`btn btn-outline ${veh.status === 'MAINTENANCE' ? 'btn-disabled' : ''}`}
                            onClick={() => updateVehicleStatus(veh.vehicle_id, 'MAINTENANCE')}
                            disabled={veh.status === 'MAINTENANCE'}
                          >
                            Maintenance
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* 3. WAREHOUSES & INVENTORY SUB-VIEW */}
              {logisticsSubTab === 'warehouses' && (
                <div className="logistics-list-container">
                  <div className="section-header-row">
                    <h2>Regional Storage Hubs (Northeast India)</h2>
                  </div>

                  {warehouses.map(wh => {
                    const whResources = resources.filter(r => r.warehouse_id === wh.warehouse_id);
                    const isExpanded = selectedWarehouseId === wh.warehouse_id;

                    const totalStock = whResources.reduce((a, b) => a + b.quantity, 0);
                    const totalReserved = whResources.reduce((a, b) => a + (b.reserved_quantity || 0), 0);
                    const totalAvail = totalStock - totalReserved;

                    return (
                      <div key={wh.warehouse_id} className="logistics-card">
                        <div className="card-header">
                          <div className="card-title">
                            🏢 {wh.name}
                          </div>
                          <span className="badge badge-available">
                            {wh.status}
                          </span>
                        </div>

                        <div className="card-subtitle">
                          📍 {wh.location}, {wh.state} ({wh.latitude.toFixed(4)}, {wh.longitude.toFixed(4)})
                        </div>

                        <div className="card-details-grid" style={{ marginTop: '8px' }}>
                          <div>
                            <span className="detail-label">Available Stock</span>
                            <span className="detail-value" style={{ color: '#16a34a', fontWeight: 700 }}>
                              {totalAvail.toLocaleString()} units
                            </span>
                          </div>
                          <div>
                            <span className="detail-label">Reserved Stock</span>
                            <span className="detail-value" style={{ color: totalReserved > 0 ? '#ea580c' : '#64748b', fontWeight: 700 }}>
                              {totalReserved.toLocaleString()} units
                            </span>
                          </div>
                          <div>
                            <span className="detail-label">Total Warehouse Stock</span>
                            <span className="detail-value">{totalStock.toLocaleString()} units</span>
                          </div>
                          <div>
                            <span className="detail-label">Stock Types</span>
                            <span className="detail-value">{whResources.length} Categories</span>
                          </div>
                        </div>

                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-outline"
                            onClick={() => setSelectedWarehouseId(isExpanded ? null : wh.warehouse_id)}
                          >
                            {isExpanded ? 'Hide Itemized Inventory' : 'View Itemized Inventory'}
                          </button>
                        </div>

                        {/* Detailed Inventory List */}
                        {isExpanded && (
                          <div className="inventory-list">
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', margin: '4px 0 2px 0' }}>
                              DEPOT INVENTORY BREAKDOWN (AVAILABLE VS RESERVED):
                            </div>
                            {whResources.map(res => {
                              const avail = res.quantity - (res.reserved_quantity || 0);
                              return (
                                <div key={res.resource_id} className="inventory-item-row">
                                  <div>
                                    <strong>{res.resource_type}</strong>
                                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '6px' }}>({res.priority} Demand)</span>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontWeight: 700, color: '#16a34a' }}>
                                      {avail.toLocaleString()} {res.unit} avail
                                    </span>
                                    {res.reserved_quantity > 0 && (
                                      <span style={{ fontSize: '0.72rem', color: '#ea580c', marginLeft: '8px' }}>
                                        ({res.reserved_quantity.toLocaleString()} rsv)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4. AI DISPATCH & AUDIT LOG SUB-VIEW */}
              {logisticsSubTab === 'ai' && (
                <div className="logistics-list-container">
                  <div className="section-header-row">
                    <h2>AI Data Contract & Logistics Audit Stream</h2>
                  </div>

                  <div className="ai-context-box">
                    <p style={{ margin: '0 0 10px 0', color: '#93c5fd', fontSize: '0.85rem' }}>
                      Clean, un-opinionated data contract feeding the future AI Decision Engine (Phase 4 Terrain Evaluator & Phase 5 Priority Classifier).
                    </p>

                    <div className="ai-pipeline-step">
                      <h4>1. Fleet State Feed ({aiContextData?.vehicles?.length || vehicles.length} Vehicles)</h4>
                      <p style={{ margin: 0 }}>
                        GPS locations, fuel ratings, and payload limits across Northeast transit corridors.
                      </p>
                    </div>

                    <div className="ai-pipeline-step">
                      <h4>2. Depots & Inventory Feed ({aiContextData?.warehouses?.length || warehouses.length} Hubs)</h4>
                      <p style={{ margin: 0 }}>
                        Real-time stock tracking with active reservations to prevent double-allocations.
                      </p>
                    </div>

                    <div className="ai-pipeline-step">
                      <h4>3. Active Demands ({aiContextData?.requests?.length || logisticsRequests.length} Requests)</h4>
                      <p style={{ margin: 0 }}>
                        Sorted by disaster urgency rank for optimal matching.
                      </p>
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Data Contract Endpoint: <code style={{ color: '#38bdf8' }}>GET /api/v1/logistics/ai-context</code>
                    </div>
                  </div>

                  {/* Audit Event Stream */}
                  <div style={{ marginTop: '16px' }}>
                    <h3 style={{ fontSize: '0.95rem', color: '#1e293b', marginBottom: '8px' }}>
                      📜 Recent Logistics Audit Events ({logisticsEvents.length})
                    </h3>
                    <div style={{ maxHeight: '280px', overflowY: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                      {logisticsEvents.map(evt => (
                        <div key={evt.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 0', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                            <span style={{ fontWeight: 700, color: evt.event_type.includes('CANCEL') ? '#dc2626' : (evt.event_type.includes('DELIVER') ? '#16a34a' : '#2563eb') }}>
                              {evt.event_type}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {new Date(evt.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div style={{ color: '#64748b', marginTop: '2px' }}>
                            {evt.details}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* TAB 2: ORIGINAL SOS & MESH ALERTS VIEW (100% INTACT)      */}
          {/* ========================================================= */}
          {activeTab === 'dispatch' && (
            <>
              <div style={{ padding: '10px 1rem', background: '#333', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>Mesh Status</strong>
                  <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>Network: ONLINE | Gateway: CONNECTED</div>
                </div>
                <button
                  onClick={simulateOfflineSOS}
                  disabled={isSimulating}
                  style={{
                    background: isSimulating ? '#888' : '#ff9800',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    cursor: isSimulating ? 'not-allowed' : 'pointer',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    transition: 'background 0.3s'
                  }}
                >
                  {isSimulating ? 'SIMULATING (WAIT 5s)...' : 'SIMULATE OFFLINE SOS'}
                </button>
              </div>

              <div className="stats-panel">
                <div className="stat-box">
                  <div className="stat-value" style={{ color: '#d32f2f' }}>{activeSOSCount}</div>
                  <div className="stat-label">Active SOS</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value" style={{ color: '#f57c00' }}>{criticalSOSCount}</div>
                  <div className="stat-label">Critical</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value" style={{ color: '#1976d2' }}>{ackSOSCount}</div>
                  <div className="stat-label">Acknowledged</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value" style={{ color: '#2e7d32' }}>{rescuedSOSCount}</div>
                  <div className="stat-label">Rescued</div>
                </div>
              </div>

              <div className="alert-list-container">
                <h2>Live SOS Feed</h2>
                {loading && <p>Loading alerts...</p>}
                {!loading && alerts.length === 0 && <p>No alerts received.</p>}

                {alerts.map(alert => {
                  const routeHops = routes[alert.messageId] || [];
                  const routeString = routeHops.map(r => r.currentNode).join(' → ');

                  return (
                    <div key={alert.messageId} className="alert-card">
                      <div className="alert-header">
                        <strong>{alert.emergencyType}</strong>
                        <span className={`severity-badge ${getSeverityClass(alert.severity)}`}>
                          {alert.severity_level || getSeverityLabel(alert.severity)} ({alert.severity}/10)
                        </span>
                      </div>

                      <div className="alert-meta">
                        <p><strong>Victim ID:</strong> {alert.victimId.substring(0, 8)}...</p>
                        <p><strong>Status:</strong> {alert.status}</p>
                        <p><strong>Time:</strong> {new Date(alert.timestamp).toLocaleTimeString()}</p>
                        <p><strong>Location:</strong> {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
                        <p><strong>Hops:</strong> {alert.hopCount} | <strong>TTL:</strong> {alert.ttl}</p>
                        {routeString && (
                          <div style={{ marginTop: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px', fontSize: '0.8rem' }}>
                            <strong>Route:</strong><br />
                            {alert.victimId.substring(0, 6)} → {routeString}
                          </div>
                        )}
                      </div>

                      <div className="alert-actions">
                        <button
                          className={`btn btn-ack ${alert.status === 'ACKNOWLEDGED' || alert.status === 'RESCUED' ? 'btn-disabled' : ''}`}
                          onClick={() => updateSOSStatus(alert.messageId, 'ACKNOWLEDGED')}
                          disabled={alert.status === 'ACKNOWLEDGED' || alert.status === 'RESCUED'}
                        >
                          Acknowledge
                        </button>
                        <button
                          className={`btn btn-rescue ${alert.status === 'RESCUED' ? 'btn-disabled' : ''}`}
                          onClick={() => updateSOSStatus(alert.messageId, 'RESCUED')}
                          disabled={alert.status === 'RESCUED'}
                        >
                          Mark Rescued
                        </button>
                        <button
                          className={`btn btn-cancel ${alert.status === 'CANCELLED' ? 'btn-disabled' : ''}`}
                          onClick={() => updateSOSStatus(alert.messageId, 'CANCELLED')}
                          disabled={alert.status === 'CANCELLED'}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </aside>

        {/* ========================================================= */}
        {/* INTERACTIVE MAP CONTAINER                                 */}
        {/* ========================================================= */}
        <main className="map-container" style={{ display: ['dashboard', 'dispatch'].includes(activeTab) ? 'block' : 'none', position: 'relative' }}>
          
          <AlertCenter 
            vehicles={vehicles} 
            sosAlerts={alerts} 
            onSelectVehicle={(id) => setSelectedVehicleId(id)}
            onSelectSos={(id) => {}} 
          />
          <VehicleDetailPanel 
            vehicle={vehicles.find(v => v.vehicle_id === selectedVehicleId)} 
            onClose={() => setSelectedVehicleId(null)}
            API_BASE={API_BASE} 
          />

          {/* Map Layer Visibility Controls */}
          {activeTab === 'dashboard' && (
            <div className="map-layer-controls">
              <label>
                <input
                  type="checkbox"
                  checked={layerVisibility.warehouses}
                  onChange={(e) => setLayerVisibility({ ...layerVisibility, warehouses: e.target.checked })}
                />
                🏢 Warehouses ({warehouses.length})
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={layerVisibility.vehicles}
                  onChange={(e) => setLayerVisibility({ ...layerVisibility, vehicles: e.target.checked })}
                />
                🚚 Vehicles ({vehicles.length})
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={layerVisibility.requests}
                  onChange={(e) => setLayerVisibility({ ...layerVisibility, requests: e.target.checked })}
                />
                📦 Delivery Requests ({logisticsRequests.length})
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={layerVisibility.sosAlerts}
                  onChange={(e) => setLayerVisibility({ ...layerVisibility, sosAlerts: e.target.checked })}
                />
                🚨 SOS Alerts ({alerts.filter(a => a.status !== 'CANCELLED' && a.status !== 'RESCUED').length})
              </label>
            </div>
          )}

          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="map-placeholder"
          >
            <MapViewUpdater center={mapCenter} zoom={mapZoom} />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* 1. RENDER WAREHOUSES ON MAP */}
            {(activeTab === 'dashboard' ? layerVisibility.warehouses : false) && warehouses.map(wh => (
              <Marker
                key={`wh-${wh.warehouse_id}`}
                position={[wh.latitude, wh.longitude]}
                icon={createPinIcon('🏢', 'pin-warehouse')}
              >
                <Popup>
                  <div style={{ minWidth: '180px' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{wh.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0' }}>
                      📍 {wh.location}, {wh.state}
                    </div>
                    <div style={{ fontSize: '0.8rem', margin: '4px 0' }}>
                      Status: <span style={{ color: '#15803d', fontWeight: 600 }}>{wh.status}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', background: '#f8fafc', padding: '4px', borderRadius: '4px' }}>
                      Stock Categories: {resources.filter(r => r.warehouse_id === wh.warehouse_id).length} items
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            
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
{/* 2. RENDER VEHICLES ON MAP */}
            {(activeTab === 'dashboard' ? layerVisibility.vehicles : false) && vehicles.map(veh => (
              <Marker
                key={`veh-${veh.vehicle_id}`}
                position={[veh.current_latitude, veh.current_longitude]}
                icon={createPinIcon(getVehicleEmoji(veh.vehicle_type), getVehiclePinClass(veh.status), veh.heading)}
              >
                <Popup>
                  <div style={{ minWidth: '180px' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{veh.vehicle_id} - {veh.vehicle_type}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0' }}>
                      📍 {veh.current_location}
                    </div>
                    <div style={{ fontSize: '0.8rem', margin: '2px 0' }}>
                      Status: <strong>{veh.status}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', margin: '2px 0' }}>
                      Capacity: <strong>{veh.capacity} {veh.capacity_unit}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', margin: '2px 0' }}>
                      Fuel: <strong>{veh.fuel_level}%</strong>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* 3. RENDER LOGISTICS DELIVERY REQUESTS ON MAP */}
            {(activeTab === 'dashboard' ? layerVisibility.requests : false) && logisticsRequests.map(req => (
              <Marker
                key={`req-${req.request_id}`}
                position={[req.latitude, req.longitude]}
                icon={createPinIcon('📦', getRequestPinClass(req.priority, req.status))}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{req.request_id}</strong>
                      <span className={`severity-badge severity-${req.priority.toLowerCase()}`}>
                        {req.priority}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', margin: '4px 0' }}>
                      📍 {req.destination}
                    </div>
                    <div style={{ fontSize: '0.8rem', margin: '3px 0' }}>
                      Demanded: <strong>{req.quantity} {req.unit} of {req.requested_resource}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', margin: '3px 0' }}>
                      Status: <strong>{req.status}</strong>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* 4. RENDER SOS ALERTS ON MAP */}
            {((activeTab === 'dispatch') || (activeTab === 'dashboard' && layerVisibility.sosAlerts)) && 
              alerts.filter(a => a.status !== 'CANCELLED' && a.status !== 'RESCUED').map(alert => (
                <Marker 
                  key={`sos-map-${alert.messageId}`} 
                  position={[alert.latitude, alert.longitude]}
                  icon={createPinIcon('🆘', 'pin-request-crit')}
                >
                  <Popup>
                    <strong>🚨 {alert.emergencyType}</strong><br />
                    Severity: {alert.severity}/10 ({alert.severity_level || getSeverityLabel(alert.severity)})<br />
                    Status: {alert.status}<br />
                    Victim: {alert.victimId}
                  </Popup>
                </Marker>
              ))
            }
          </MapContainer>
        </main>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: CREATE NEW LOGISTICS DELIVERY REQUEST            */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Emergency Delivery Request</h3>
              <button 
                className="btn btn-outline" 
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest}>
              <div className="form-group">
                <label>Destination Location Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Village Relief Center, Haflong, Assam"
                  value={newRequestForm.destination}
                  onChange={(e) => setNewRequestForm({ ...newRequestForm, destination: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    required
                    value={newRequestForm.latitude}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, latitude: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    required
                    value={newRequestForm.longitude}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, longitude: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Resource Needed</label>
                  <select
                    className="form-select"
                    value={newRequestForm.requested_resource}
                    onChange={(e) => {
                      const res = e.target.value;
                      let unit = 'units';
                      if (res === 'Food') unit = 'packets';
                      if (res === 'Drinking Water') unit = 'liters';
                      if (res === 'Medicine') unit = 'kits';
                      if (res === 'Medical Supplies') unit = 'boxes';
                      if (res === 'Emergency Kits') unit = 'kits';
                      if (res === 'Blankets') unit = 'units';
                      setNewRequestForm({ ...newRequestForm, requested_resource: res, unit });
                    }}
                  >
                    <option value="Food">Food</option>
                    <option value="Drinking Water">Drinking Water</option>
                    <option value="Medicine">Medicine</option>
                    <option value="Emergency Kits">Emergency Kits</option>
                    <option value="Blankets">Blankets</option>
                    <option value="Medical Supplies">Medical Supplies</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    className="form-select"
                    value={newRequestForm.priority}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, priority: e.target.value })}
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    required
                    value={newRequestForm.quantity}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={newRequestForm.unit}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, unit: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary-sm"
                  style={{ padding: '8px 16px' }}
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: MANUAL ASSIGNMENT WITH STOCK CHECK DIALOG        */}
      {/* ========================================================= */}
      {assignModalReq && (
        <div className="modal-overlay" onClick={() => setAssignModalReq(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Vehicle & Warehouse Depot</h3>
              <button 
                className="btn btn-outline" 
                onClick={() => setAssignModalReq(null)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                <div><strong>Request:</strong> {assignModalReq.request_id}</div>
                <div><strong>Resource:</strong> {assignModalReq.quantity} {assignModalReq.unit} of {assignModalReq.requested_resource}</div>
                <div><strong>Destination:</strong> {assignModalReq.destination}</div>
              </div>

              <div className="form-group">
                <label>Select Available Vehicle</label>
                <select
                  className="form-select"
                  value={selectedAssignVeh}
                  onChange={(e) => setSelectedAssignVeh(e.target.value)}
                  required
                >
                  <option value="">-- Choose Available Vehicle --</option>
                  {vehicles.filter(v => v.status === 'AVAILABLE').map(v => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      {v.vehicle_id} - {v.vehicle_type} ({v.current_location}, Fuel: {v.fuel_level}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Select Source Warehouse Depot</label>
                <select
                  className="form-select"
                  value={selectedAssignWh}
                  onChange={(e) => setSelectedAssignWh(e.target.value)}
                  required
                >
                  <option value="">-- Choose Origin Warehouse --</option>
                  {warehouses.map(w => {
                    const match = resources.find(r => r.warehouse_id === w.warehouse_id && r.resource_type === assignModalReq.requested_resource);
                    const avail = match ? (match.quantity - match.reserved_quantity) : 0;
                    return (
                      <option key={w.warehouse_id} value={w.warehouse_id}>
                        {w.name} ({w.state}) — Available: {avail} {assignModalReq.unit}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setAssignModalReq(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary-sm"
                  style={{ padding: '8px 16px' }}
                >
                  Confirm & Reserve Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: AI RECOMMENDATION PANEL                          */}
      {/* ========================================================= */}
      {aiRecommendReq && (
        <div className="modal-overlay" onClick={() => setAiRecommendReq(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>AI DECISION (PROTOTYPE)</h3>
              <button 
                className="btn btn-outline" 
                onClick={() => setAiRecommendReq(null)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '6px', marginBottom: '16px' }}>
              <div><strong>Request:</strong> {aiRecommendReq.request_id}</div>
              <div><strong>Priority:</strong> {aiRecommendReq.priority}</div>
              <div><strong>Resource:</strong> {aiRecommendReq.quantity} {aiRecommendReq.unit} of {aiRecommendReq.requested_resource}</div>
              <div><strong>Destination:</strong> {aiRecommendReq.destination}</div>
            </div>

            {isAiLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>🧠 Processing Accessibility, Priority & Decision Constraints...</p>
              </div>
            ) : aiDecision ? (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <strong>Decision: </strong> 
                  <span className={`badge ${aiDecision.recommendation_status === 'RECOMMENDATION_READY' ? 'badge-delivered' : 'badge-cancelled'}`}>
                    {aiDecision.recommendation_status || 'UNKNOWN'}
                  </span>
                </div>
                
                {aiDecision.recommendation ? (
                  <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '6px', marginBottom: '12px', borderLeft: '4px solid #0284c7' }}>
                    <div style={{ marginBottom: '8px' }}><strong>Recommended Vehicle:</strong> {aiDecision.recommendation.vehicle_id}</div>
                    <div style={{ marginBottom: '8px' }}><strong>Recommended Warehouse:</strong> {aiDecision.recommendation.warehouse_id}</div>
                    <div><strong>Score:</strong> {aiDecision.recommendation.score}</div>
                  </div>
                ) : (
                  <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '6px', marginBottom: '12px', borderLeft: '4px solid #ef4444' }}>
                    <strong>Recommended Vehicle:</strong> NONE<br/>
                    <strong>Recommended Warehouse:</strong> NONE
                  </div>
                )}

                {aiDecision.reasons && aiDecision.reasons.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Reasons:</strong>
                    <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                      {aiDecision.reasons.map((r, i) => (
                        <li key={i} style={{ marginBottom: '4px', color: r.includes('rejected') ? '#ef4444' : 'inherit' }}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #f59e0b', fontSize: '0.9em' }}>
                  <strong>Warnings:</strong>
                  <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0' }}>
                    <li>Prototype limitations: ML Context is synthetic</li>
                    <li>Strict safety constraints enforced on capacity units and route capability limits</li>
                  </ul>
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '16px', fontWeight: 'bold', color: '#6366f1' }}>
                  STATUS: Awaiting Dispatcher Approval
                </div>
              </div>
            ) : (
              <p>Failed to load AI decision.</p>
            )}

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setAiRecommendReq(null)}
              >
                Close (Do Not Dispatch)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;



