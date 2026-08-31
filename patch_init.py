import os
import re

filepath = 'mobile/src/ble/BleService.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("this.log('Started BLE Scanning');", "await this.initialize();\n    this.log('Started BLE Scanning');")
content = content.replace("this.log('Started BLE Advertising');", "await this.initialize();\n    this.log('Started BLE Advertising');")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
