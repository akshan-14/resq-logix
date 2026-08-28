import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import './App.css';

// Fix Leaflet default marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_BASE = 'http://localhost:3000/api/v1';

function App() {
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch routes for alerts
  const [routes, setRoutes] = useState({});

  const fetchAlerts = async () => {
    try {
      const healthRes = await fetch(`${API_BASE}/health`);
      setIsConnected(healthRes.ok);

      const sosRes = await fetch(`${API_BASE}/sos`);
      if (sosRes.ok) {
        const data = await sosRes.json();
        setAlerts(data.data);
      }
      
      const routesRes = await fetch(`${API_BASE}/mesh/routes`);
      if (routesRes.ok) {
        const routesData = await routesRes.json();
        const routeMap = {};
        routesData.data.forEach(r => {
          if (!routeMap[r.messageId]) routeMap[r.messageId] = [];
          routeMap[r.messageId].push(r);
        });
        setRoutes(routeMap);
      }
    } catch (err) {
      console.error("Failed to fetch API:", err);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (messageId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/sos/${messageId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchAlerts();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const [isSimulating, setIsSimulating] = useState(false);

  const simulateOfflineSOS = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    try {
      await fetch(`${API_BASE}/mesh/simulate`, { method: 'POST' });
      // Wait for the python script (which has 4 seconds of sleep) to finish before fetching
      setTimeout(() => {
        fetchAlerts();
        setIsSimulating(false);
      }, 4500);
    } catch(err){
      console.error(err);
      setIsSimulating(false);
    }
  };

  // Compute stats
  const activeCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const criticalCount = alerts.filter(a => a.severity >= 8 && a.status !== 'RESCUED' && a.status !== 'CANCELLED').length;
  const ackCount = alerts.filter(a => a.status === 'ACKNOWLEDGED').length;
  const rescuedCount = alerts.filter(a => a.status === 'RESCUED').length;

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

  return (
    <div className="app-container">
      <header className="header">
        <h1>ResQ-Logix | Emergency Command Center</h1>
        <div className="status-indicator">
          <span>Backend Status:</span>
          <div className={`status-dot ${isConnected ? 'online' : 'offline'}`}></div>
          <span>{isConnected ? 'Online' : 'Offline'}</span>
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <div style={{padding: '10px 1rem', background: '#333', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <strong style={{fontSize: '1.1rem'}}>Mesh Status</strong>
              <div style={{fontSize: '0.8rem', marginTop: '5px'}}>Network: ONLINE | Gateway: CONNECTED</div>
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
              <div className="stat-value" style={{color: '#d32f2f'}}>{activeCount}</div>
              <div className="stat-label">Active SOS</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{color: '#f57c00'}}>{criticalCount}</div>
              <div className="stat-label">Critical</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{color: '#1976d2'}}>{ackCount}</div>
              <div className="stat-label">Acknowledged</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{color: '#2e7d32'}}>{rescuedCount}</div>
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
                    <p><strong>Victim ID:</strong> {alert.victimId.substring(0,8)}...</p>
                    <p><strong>Status:</strong> {alert.status}</p>
                    <p><strong>Time:</strong> {new Date(alert.timestamp).toLocaleTimeString()}</p>
                    <p><strong>Location:</strong> {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
                    <p><strong>Hops:</strong> {alert.hopCount} | <strong>TTL:</strong> {alert.ttl}</p>
                    {routeString && (
                      <div style={{marginTop: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px', fontSize: '0.8rem'}}>
                        <strong>Route:</strong><br/>
                        {alert.victimId.substring(0,6)} → {routeString}
                      </div>
                    )}
                  </div>

                  <div className="alert-actions">
                    <button 
                      className={`btn btn-ack ${alert.status === 'ACKNOWLEDGED' || alert.status === 'RESCUED' ? 'btn-disabled' : ''}`}
                      onClick={() => updateStatus(alert.messageId, 'ACKNOWLEDGED')}
                      disabled={alert.status === 'ACKNOWLEDGED' || alert.status === 'RESCUED'}
                    >
                      Acknowledge
                    </button>
                    <button 
                      className={`btn btn-rescue ${alert.status === 'RESCUED' ? 'btn-disabled' : ''}`}
                      onClick={() => updateStatus(alert.messageId, 'RESCUED')}
                      disabled={alert.status === 'RESCUED'}
                    >
                      Mark Rescued
                    </button>
                    <button 
                      className={`btn btn-cancel ${alert.status === 'CANCELLED' ? 'btn-disabled' : ''}`}
                      onClick={() => updateStatus(alert.messageId, 'CANCELLED')}
                      disabled={alert.status === 'CANCELLED'}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="map-container">
          <MapContainer 
            center={[28.6139, 77.2090]} 
            zoom={12} 
            className="map-placeholder"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {alerts.filter(a => a.status !== 'CANCELLED' && a.status !== 'RESCUED').map(alert => (
              <Marker key={`map-${alert.messageId}`} position={[alert.latitude, alert.longitude]}>
                <Popup>
                  <strong>{alert.emergencyType}</strong><br />
                  Severity: {alert.severity}<br />
                  Status: {alert.status}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </main>
      </div>
    </div>
  );
}

export default App;
