import os

filepath = r'node_modules\react-native-ble-peripheral\android\src\main\java\com\himelbrand\ble\peripheral\RNBLEModule.java'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('android.support.v7.app.AppCompatActivity', 'androidx.appcompat.app.AppCompatActivity')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
