import os

filepath = 'backend/server.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const port = 3000;", "const port = process.env.PORT || 3000;")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
