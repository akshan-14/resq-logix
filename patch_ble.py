import re

with open('mobile/src/ble/BleService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add log callback
content = content.replace("private onStatusChangeCb?: (status: BleStatus) => void;", "private onStatusChangeCb?: (status: BleStatus) => void;\n  private onLogCb?: (msg: string) => void;")

content = content.replace("public setCallbacks(onReportReceived: (report: FieldReport, hopCount: number) => void, onStatusChange: (status: BleStatus) => void) {", "public setCallbacks(onReportReceived: (report: FieldReport, hopCount: number) => void, onStatusChange: (status: BleStatus) => void, onLog?: (msg: string) => void) {")

content = content.replace("this.onStatusChangeCb = onStatusChange;", "this.onStatusChangeCb = onStatusChange;\n    this.onLogCb = onLog;")

content = content.replace("private notifyStatus() {", "public log(msg: string) {\n    if (this.onLogCb) this.onLogCb(msg);\n    else console.log(msg);\n  }\n\n  private notifyStatus() {")

# Insert logging into functions
content = content.replace("this.bleManager = new BleManager();", "this.bleManager = new BleManager();\n    this.log('BleManager initialized');")
content = content.replace("this.status.isScanning = true;", "this.status.isScanning = true;\n    this.log('Started BLE Scanning');")

content = content.replace("if (device) {\n          await this.connectToDevice(device);\n        }", "if (device) {\n          if (device.name) this.log('Discovered: ' + device.name);\n          await this.connectToDevice(device);\n        }")

# Update receiveFieldReport deduplication to check report_id instead of message_id
content = content.replace("if (this.knownMessageIds.has(msg.message_id)) {", "if (this.knownMessageIds.has(msg.report_id)) {\n        this.log('Duplicate report ignored: ' + msg.report_id);")
content = content.replace("this.knownMessageIds.add(msg.message_id);", "this.knownMessageIds.add(msg.report_id);\n      this.log('Received NEW report: ' + msg.report_id + ' at hop ' + msg.hop_count);")

content = content.replace("this.forwardMessage(report, msg.hop_count + 1);", "this.log('Queueing report ' + report.report_id + ' for relay (hop ' + (msg.hop_count + 1) + ')');\n        this.forwardMessage(report, msg.hop_count + 1);")

content = content.replace("const msgId = msg--;", "const msgId = msg--;\n    this.log('Broadcasting msg: ' + msgId);")
content = content.replace("this.knownMessageIds.add(msgId);", "this.knownMessageIds.add(report.report_id);")

with open('mobile/src/ble/BleService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
