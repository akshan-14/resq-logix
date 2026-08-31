import os
import re

filepath = 'mobile/src/hooks/useTranslation.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("FALLBACK_EN[key] || ", "")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
