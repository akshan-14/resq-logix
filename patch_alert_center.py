import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

imports = "import AlertCenter from './components/AlertCenter';"
content = content.replace("import VehicleDetailPanel from './components/VehicleDetailPanel';", "import VehicleDetailPanel from './components/VehicleDetailPanel';\n" + imports)

alert_center_inject = """
            <AlertCenter 
              vehicles={vehicles} 
              sosAlerts={sosAlerts} 
              onSelectVehicle={(id) => setSelectedVehicleId(id)}
              onSelectSos={(id) => {}} // Could zoom to map
            />
            <VehicleDetailPanel 
"""
content = content.replace("<VehicleDetailPanel ", alert_center_inject)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
