import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    app_jsx = f.read()

# 1. Add import
if "HistoricalAnalyticsPanel" not in app_jsx:
    app_jsx = app_jsx.replace(
        "import { MapContainer", 
        "import HistoricalAnalyticsPanel from './components/HistoricalAnalyticsPanel';\nimport { MapContainer"
    )

# 2. Add Tab
tab_target = '''<button 
              className={
av-tab-btn }
              onClick={() => setActiveTab('logistics')}'''

tab_replace = '''<button 
              className={
av-tab-btn }
              onClick={() => setActiveTab('analytics')}
            >
              📊 Historical Analytics
            </button>
            <button 
              className={
av-tab-btn }
              onClick={() => setActiveTab('logistics')}'''

app_jsx = app_jsx.replace(tab_target, tab_replace)

# 3. Add Component Render
render_target = '''<div className="main-content">
          {/* SIDEBAR PANEL */}
          <aside className="sidebar">'''

render_replace = '''<div className="main-content">
          {activeTab === 'analytics' && (
             <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
                <HistoricalAnalyticsPanel logisticsRequests={logisticsRequests} />
             </div>
          )}
          {/* SIDEBAR PANEL */}
          <aside className="sidebar" style={{ display: activeTab === 'analytics' ? 'none' : 'flex' }}>'''

app_jsx = app_jsx.replace(render_target, render_replace)

# Hide Map when activeTab is analytics
map_target = '''<main className="map-container">'''
map_replace = '''<main className="map-container" style={{ display: activeTab === 'analytics' ? 'none' : 'block' }}>'''
app_jsx = app_jsx.replace(map_target, map_replace)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(app_jsx)
