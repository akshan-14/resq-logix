import os
import json

filepath = r'node_modules/react-native-ble-peripheral/android/build.gradle'
with open(filepath, 'r', encoding='utf-8-sig') as f:
    content = f.read()

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content.strip())
