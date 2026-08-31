import os

filepath = 'mobile/src/ble/BleService.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("private bleManager: BleManager;", "private bleManager: BleManager | any;")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
