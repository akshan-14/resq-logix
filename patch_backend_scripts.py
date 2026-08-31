import json

app_json_path = 'backend/package.json'
with open(app_json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

data["scripts"]["start:prod"] = "node seed.js && node server.js"

with open(app_json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
