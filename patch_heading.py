import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_create = """const createPinIcon = (emoji, pinClass) => {
    return L.divIcon({
      className: '',
      html: `<div class="custom-pin ${pinClass}">${emoji}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };"""

new_create = """const createPinIcon = (emoji, pinClass, heading = null) => {
    let headingHtml = '';
    if (heading !== null && heading !== undefined) {
      headingHtml = `<div style="position:absolute; top:-8px; left:50%; transform: translateX(-50%) rotate(${heading}deg); width:0; height:0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 8px solid #3b82f6;"></div>`;
    }
    return L.divIcon({
      className: '',
      html: `<div style="position:relative"><div class="custom-pin ${pinClass}">${emoji}</div>${headingHtml}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };"""
content = content.replace(old_create, new_create)

# Update the Marker call to pass heading
old_marker = "icon={createPinIcon(getVehicleEmoji(veh.vehicle_type), getVehiclePinClass(veh.status))}"
new_marker = "icon={createPinIcon(getVehicleEmoji(veh.vehicle_type), getVehiclePinClass(veh.status), veh.heading)}"
content = content.replace(old_marker, new_marker)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
