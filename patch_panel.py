import os

filepath = 'frontend/src/components/HistoricalAnalyticsPanel.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("backgroundColor: '#f8fafc'", "backgroundColor: 'var(--bg-base)', color: 'var(--text-main)'")
content = content.replace("color: '#1e293b'", "color: 'var(--text-main)'")
content = content.replace("backgroundColor: '#fff'", "backgroundColor: 'var(--bg-panel)'")
content = content.replace("color: '#334155'", "color: 'var(--text-main)'")
content = content.replace("color: '#64748b'", "color: 'var(--text-muted)'")
content = content.replace("border: '1px solid #e2e8f0'", "border: '1px solid var(--border)'")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
