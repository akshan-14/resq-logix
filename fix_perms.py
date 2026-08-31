import json

app_json_path = 'mobile/app.json'
with open(app_json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Clean up permissions to prevent Manifest merging crashes
data["expo"]["android"]["permissions"] = [
    "ACCESS_COARSE_LOCATION",
    "ACCESS_FINE_LOCATION",
    "BLUETOOTH",
    "BLUETOOTH_ADMIN",
    "BLUETOOTH_SCAN",
    "BLUETOOTH_CONNECT",
    "BLUETOOTH_ADVERTISE"
]

with open(app_json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
