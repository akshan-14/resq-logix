import os
import re

filepath = 'frontend/src/App.css'
with open(filepath, 'r', encoding='utf-8') as f:
    css = f.read()

# Add CSS Variables for Dark Theme
dark_vars = '''
:root {
  --bg-base: #0b0f19;
  --bg-panel: #111827;
  --bg-hover: #1f2937;
  --text-main: #f3f4f6;
  --text-muted: #9ca3af;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --danger: #ef4444;
  --danger-bg: rgba(239, 68, 68, 0.15);
  --warning: #f59e0b;
  --warning-bg: rgba(245, 158, 11, 0.15);
  --success: #10b981;
  --success-bg: rgba(16, 185, 129, 0.15);
  --border: #374151;
}
'''
if ":root" not in css:
    css = dark_vars + css

# Replace light mode backgrounds with variables
css = css.replace("background-color: #f4f6f9;", "background-color: var(--bg-base);")
css = css.replace("color: #1e293b;", "color: var(--text-main);")

css = css.replace("background: white;", "background: var(--bg-panel);")
css = css.replace("background-color: white;", "background-color: var(--bg-panel);")

css = css.replace("border: 1px solid #e2e8f0;", "border: 1px solid var(--border);")
css = css.replace("border-bottom: 1px solid #e2e8f0;", "border-bottom: 1px solid var(--border);")
css = css.replace("border-right: 1px solid #e2e8f0;", "border-right: 1px solid var(--border);")

css = css.replace("color: #64748b;", "color: var(--text-muted);")
css = css.replace("color: #475569;", "color: var(--text-muted);")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(css)
