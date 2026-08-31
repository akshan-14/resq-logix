import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    app_jsx = f.read()

# Add Historical Analytics tab button
tab_nav_find = '<nav className="nav-tabs">'
tab_nav_replace = '''<nav className="nav-tabs">
            <button 
              className={
av-tab-btn }
              onClick={() => setActiveTab('analytics')}
            >
              📊 Historical Analytics
            </button>'''

if '📊 Historical Analytics' not in app_jsx:
    app_jsx = app_jsx.replace(tab_nav_find, tab_nav_replace)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(app_jsx)
