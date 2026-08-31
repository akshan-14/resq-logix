import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    app_jsx = f.read()

import_stmt = "import HistoricalAnalyticsPanel from './components/HistoricalAnalyticsPanel';\n"
if "HistoricalAnalyticsPanel" not in app_jsx:
    app_jsx = app_jsx.replace("import { MapContainer", import_stmt + "import { MapContainer")

render_logic = '''
      {activeTab === 'analytics' && (
        <HistoricalAnalyticsPanel logisticsRequests={logisticsRequests} />
      )}
'''

if "activeTab === 'analytics'" not in app_jsx.split("return (")[1]:
    # Insert it right before the last closing div
    # Actually, let's find a reliable place. There are conditional renders for activeTab.
    
    # E.g. {activeTab === 'logistics' && (
    parts = app_jsx.split("{activeTab === 'logistics' && (")
    new_app_jsx = parts[0] + render_logic + "      {activeTab === 'logistics' && (" + parts[1]
    app_jsx = new_app_jsx

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(app_jsx)
