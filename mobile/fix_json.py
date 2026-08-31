import json

with open('package.json', 'r', encoding='utf-8-sig') as f:
    pkg = json.load(f)
with open('package.json', 'w', encoding='utf-8') as f:
    json.dump(pkg, f, indent=2)

with open('app.json', 'r', encoding='utf-8-sig') as f:
    app = json.load(f)
with open('app.json', 'w', encoding='utf-8') as f:
    json.dump(app, f, indent=2)
