import re

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    app_jsx = f.read()

fixed_nav = """<nav className="nav-tabs">
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
          </nav>"""

app_jsx = re.sub(r'<nav className="nav-tabs">.*?</nav>', fixed_nav, app_jsx, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(app_jsx)
