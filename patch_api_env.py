import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hardcoded API_BASE with env var fallback
content = content.replace(
    "const API_BASE = 'http://localhost:3000/api/v1';",
    "const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
