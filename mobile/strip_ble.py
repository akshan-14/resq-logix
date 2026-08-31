import os

filepath = 'src/ble/BleService.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import ReactNativeBlePeripheral from 'react-native-ble-peripheral';", "")
content = content.replace("await ReactNativeBlePeripheral.addService", "// await ReactNativeBlePeripheral.addService")
content = content.replace("await ReactNativeBlePeripheral.addCharacteristicToService", "// await ReactNativeBlePeripheral.addCharacteristicToService")
content = content.replace("16 | 1, // Read | Broadcast properties", "// 16 | 1")
content = content.replace("await ReactNativeBlePeripheral.start", "// await ReactNativeBlePeripheral.start")
content = content.replace("await ReactNativeBlePeripheral.stop();", "// await ReactNativeBlePeripheral.stop();")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
