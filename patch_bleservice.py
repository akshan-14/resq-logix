import os

filepath = 'mobile/src/ble/BleService.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the top-level new BleManager() from constructor
content = content.replace("this.bleManager = new BleManager();", "this.log('BleManager instantiation delayed to prevent Android 12 crash.');")

# Add initialize() method
init_method = '''
  public async initialize() {
    if (!this.bleManager) {
        this.bleManager = new BleManager();
        this.bleManager.onStateChange((state) => {
            this.status.isBluetoothEnabled = state === State.PoweredOn;
            this.notifyStatus();
        }, true);
    }
  }
'''
if "public async initialize()" not in content:
    content = content.replace("public async startScanning() {", init_method + "\n  public async startScanning() {")

# Add this.bleManager checks
content = content.replace("this.bleManager.startDeviceScan", "if(this.bleManager) this.bleManager.startDeviceScan")
content = content.replace("this.bleManager.stopDeviceScan", "if(this.bleManager) this.bleManager.stopDeviceScan")
content = content.replace("this.bleManager.destroy", "if(this.bleManager) this.bleManager.destroy")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
