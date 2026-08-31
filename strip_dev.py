import os
import json

app_json_path = 'mobile/app.json'
with open(app_json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

if "plugins" in data["expo"]:
    data["expo"]["plugins"] = [p for p in data["expo"]["plugins"] if p != "expo-dev-client"]

with open(app_json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

pkg_json_path = 'mobile/package.json'
with open(pkg_json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

if "expo-dev-client" in data["dependencies"]:
    del data["dependencies"]["expo-dev-client"]

with open(pkg_json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
