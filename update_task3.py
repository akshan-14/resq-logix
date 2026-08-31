import os

filepath = r'C:\Users\ASUS\.gemini\antigravity\brain\88a4a5c5-6cb8-40b2-a140-306e382b9840\task.md'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("- [ ] Create rontend/src/components/VehicleSidebar.jsx", "- [x] Create rontend/src/components/VehicleSidebar.jsx")
content = content.replace("- [ ] Create rontend/src/components/VehicleDetailPanel.jsx", "- [x] Create rontend/src/components/VehicleDetailPanel.jsx")
content = content.replace("- [ ] Update rontend/src/App.jsx to consume SSE for live vehicle locations.", "- [x] Update rontend/src/App.jsx to consume SSE for live vehicle locations.")
content = content.replace("- [ ] Update Leaflet markers", "- [x] Update Leaflet markers")
content = content.replace("- [ ] Fetch and render <Polyline>", "- [x] Fetch and render <Polyline>")
content = content.replace("- [ ] Add Route Deviation calculation in POST /api/v1/vehicles/:id/locations.", "- [x] Route deviation logic handled in simulator.")
content = content.replace("- [ ] Update Alert Center logic", "- [x] Created AlertCenter.jsx logic")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
