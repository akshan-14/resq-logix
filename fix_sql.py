import os

filepath = 'backend/server.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("let sql = \n    SELECT v.*", "let sql = `\n    SELECT v.*")
content = content.replace("AND lr.status IN ('ASSIGNED', 'IN_TRANSIT')\n  ;", "AND lr.status IN ('ASSIGNED', 'IN_TRANSIT')\n  `;")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
