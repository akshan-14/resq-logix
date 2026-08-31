import os
import re

filepath = 'mobile/src/ble/BleService.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Completely clear out the constructor's BleManager logic
content = re.sub(r"this\.bleManager\.onStateChange\(\(state\).*?\}, true\);", "", content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
