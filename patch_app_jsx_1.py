import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
imports = """import VehicleSidebar from './components/VehicleSidebar';
import VehicleDetailPanel from './components/VehicleDetailPanel';"""
content = content.replace("import './App.css';", "import './App.css';\n" + imports)

# Add states
states_search = "const [sosAlerts, setSosAlerts] = useState([]);"
states_replace = """const [sosAlerts, setSosAlerts] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState([]);"""
content = content.replace(states_search, states_replace)

# Setup SSE inside useEffect
fetch_vehicles_search = "fetch(`${API_BASE}/vehicles`),"
content = content.replace(fetch_vehicles_search, "/* fetch(`${API_BASE}/vehicles`) removed for SSE */")

fetch_vehicles_handling = """if (vehRes.ok) {
          const d = await vehRes.json();
          setVehicles(d.data || []);
        }"""
content = content.replace(fetch_vehicles_handling, "")

sse_setup = """
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
"""

content = content.replace("fetchData();", "fetchData();" + sse_setup)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
