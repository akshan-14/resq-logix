import os

filepath = 'backend/server.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

bad_str = "sseClients.forEach(client => client.res.write(`data: ${payload}\n\n`));"
good_str = "sseClients.forEach(client => client.res.write(`data: ${payload}\\n\\n`));"

content = content.replace(bad_str, good_str)
content = content.replace("res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);", "res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\\n\\n`);")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
