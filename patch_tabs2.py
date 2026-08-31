import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    app_jsx = f.read()

# Imports
imports = '''import HistoricalAnalyticsPanel from './components/HistoricalAnalyticsPanel';
import SimulatorPanel from './components/SimulatorPanel';
import NetworkPanel from './components/NetworkPanel';
import InventoryPanel from './components/InventoryPanel';
import { MapContainer'''

app_jsx = app_jsx.replace("import HistoricalAnalyticsPanel from './components/HistoricalAnalyticsPanel';\nimport { MapContainer", imports)

# Navigation
nav_target = '''<nav className="nav-tabs">
            <button 
              className={
av-tab-btn }
              onClick={() => setActiveTab('analytics')}
            >
              📊 Historical Analytics
            </button>
            <button 
              className={
av-tab-btn }
              onClick={() => setActiveTab('logistics')}
            >
              📦 Logistics & Supply Chain
            </button>
            <button 
              className={
av-tab-btn }
              onClick={() => setActiveTab('sos')}
            >
              🚨 SOS & Mesh Alerts {activeSOSCount > 0 && ()}
            </button>
          </nav>'''

if nav_target not in app_jsx:
    # Attempt to replace generically if emojis don't match
    import re
    app_jsx = re.sub(r'<nav className="nav-tabs">.*?</nav>', '''<nav className="nav-tabs">
            <button className={
av-tab-btn } onClick={() => setActiveTab('dashboard')}>
              Command Centre
            </button>
            <button className={
av-tab-btn } onClick={() => setActiveTab('dispatch')}>
              Smart Dispatch
            </button>
            <button className={
av-tab-btn } onClick={() => setActiveTab('network')}>
              Offline Mesh
            </button>
            <button className={
av-tab-btn } onClick={() => setActiveTab('inventory')}>
              Inventory
            </button>
            <button className={
av-tab-btn } onClick={() => setActiveTab('analytics')}>
              Analytics & Reports
            </button>
            <button className={
av-tab-btn } onClick={() => setActiveTab('simulator')}>
              Scenario Simulator
            </button>
          </nav>''', app_jsx, flags=re.DOTALL)

# Main Content Routing
main_target = r'''<div className="main-content">
        {activeTab === 'analytics' && \('''

app_jsx = re.sub(r'<div className="main-content">.*?<aside className="sidebar"', '''<div className="main-content">
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
        <aside className="sidebar"''', app_jsx, flags=re.DOTALL)

# Update sidebar and map display logic to show on 'dashboard' and 'dispatch'
app_jsx = app_jsx.replace("display: activeTab === 'analytics' ? 'none' : 'flex'", "display: ['dashboard', 'dispatch'].includes(activeTab) ? 'flex' : 'none'")
app_jsx = app_jsx.replace("display: activeTab === 'analytics' ? 'none' : 'block'", "display: ['dashboard', 'dispatch'].includes(activeTab) ? 'block' : 'none'")

# Default tab state (assuming it's currently initialized to 'logistics')
app_jsx = app_jsx.replace("const [activeTab, setActiveTab] = useState('logistics');", "const [activeTab, setActiveTab] = useState('dashboard');")

# Rename 'logistics' sidebar checks to 'dashboard' and 'dispatch'
app_jsx = app_jsx.replace("activeTab === 'logistics'", "activeTab === 'dashboard'")
app_jsx = app_jsx.replace("activeTab === 'sos'", "activeTab === 'dispatch'")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(app_jsx)
