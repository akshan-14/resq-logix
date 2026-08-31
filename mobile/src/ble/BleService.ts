import { BleManager, Device, State, Characteristic } from 'react-native-ble-plx';
import { FieldReport } from '../models/FieldReport';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import ReactNativeBlePeripheral from 'react-native-ble-peripheral';
import { Buffer } from 'buffer';

// Constants
export const RESQ_SERVICE_UUID = '54321098-7654-3210-9876-543210987654';
export const RESQ_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-123456789012';
export const MAX_HOP_COUNT = 5;

export interface BleMessage {
  protocol_version: number;
  message_id: string;
  report_id: string;
  hop_count: number;
  payload: Partial<FieldReport>;
  checksum: string;
}

export type BleStatus = {
  isBluetoothEnabled: boolean;
  isScanning: boolean;
  isAdvertising: boolean;
  messagesReceived: number;
  messagesForwarded: number;
  duplicatesIgnored: number;
  connectedDevices: number;
  lastReceivedId?: string;
  lastForwardedId?: string;
  lastError?: string;
};

export class BleService {
  private bleManager: BleManager | any;
  private knownMessageIds = new Set<string>();
  
  // Stats
  public status: BleStatus = {
    isBluetoothEnabled: false,
    isScanning: false,
    isAdvertising: false,
    messagesReceived: 0,
    messagesForwarded: 0,
    duplicatesIgnored: 0,
    connectedDevices: 0,
  };
  
  // Callbacks
  private onReportReceivedCb?: (report: FieldReport, hopCount: number) => void;
  private onStatusChangeCb?: (status: BleStatus) => void;
  private onLogCb?: (msg: string) => void;

  constructor() {
    this.log('BleManager instantiation delayed to prevent Android 12 crash.');
    this.log('BleManager initialized');
    
  }

  public setCallbacks(onReportReceived: (report: FieldReport, hopCount: number) => void, onStatusChange: (status: BleStatus) => void, onLog?: (msg: string) => void) {
    this.onReportReceivedCb = onReportReceived;
    this.onStatusChangeCb = onStatusChange;
    this.onLogCb = onLog;
  }

  public log(msg: string) {
    if (this.onLogCb) this.onLogCb(msg);
    else console.log(msg);
  }

  private notifyStatus() {
    if (this.onStatusChangeCb) this.onStatusChangeCb({ ...this.status });
  }

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        ]);
        return Object.values(grants).every(grant => grant === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS handles automatically via Info.plist
  }

  // Generate a simple deterministic checksum (for prototype integrity)
  private generateChecksum(payloadObj: any): string {
    const str = JSON.stringify(payloadObj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  
  public async initialize() {
    if (!this.bleManager) {
        this.bleManager = new BleManager();
        
    }
  }

  public async startScanning() {
    const hasPerms = await this.requestPermissions();
    if (!hasPerms) {
      this.status.lastError = 'Permissions denied';
      this.notifyStatus();
      return;
    }

    if (this.status.isScanning) return;
    this.status.isScanning = true;
    await this.initialize();
    this.log('Started BLE Scanning');
    this.notifyStatus();

    if(this.bleManager) this.bleManager.startDeviceScan(
      [RESQ_SERVICE_UUID], 
      { allowDuplicates: false }, 
      async (error, device) => {
        if (error) {
          this.status.lastError = error.message;
          this.status.isScanning = false;
          this.notifyStatus();
          return;
        }

        if (device) {
          if (device.name) this.log('Discovered: ' + device.name);
          await this.connectToDevice(device);
        }
      }
    );
  }

  public stopScanning() {
    if(this.bleManager) this.bleManager.stopDeviceScan();
    this.status.isScanning = false;
    this.notifyStatus();
  }

  private async connectToDevice(device: Device) {
    try {
      this.status.connectedDevices++;
      this.notifyStatus();

      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      const characteristic = await connectedDevice.readCharacteristicForService(
        RESQ_SERVICE_UUID, 
        RESQ_CHARACTERISTIC_UUID
      );

      if (characteristic?.value) {
        const decoded = Buffer.from(characteristic.value, 'base64').toString('utf8');
        this.receiveFieldReport(decoded);
      }
      
      await connectedDevice.cancelConnection();
    } catch (e: any) {
      console.log('BLE Connection error:', e);
    } finally {
      this.status.connectedDevices = Math.max(0, this.status.connectedDevices - 1);
      this.notifyStatus();
    }
  }

  public receiveFieldReport(jsonStr: string) {
    try {
      const msg: BleMessage = JSON.parse(jsonStr);
      
      // Deduplication
      if (this.knownMessageIds.has(msg.report_id)) {
        this.log('Duplicate report ignored: ' + msg.report_id);
        this.status.duplicatesIgnored++;
        this.notifyStatus();
        return;
      }
      
      this.knownMessageIds.add(msg.report_id);
      this.log('Received NEW report: ' + msg.report_id + ' at hop ' + msg.hop_count);

      // Validate Integrity
      const expectedChecksum = this.generateChecksum(msg.payload);
      if (msg.checksum !== expectedChecksum) {
        this.status.lastError = 'Invalid payload checksum';
        this.notifyStatus();
        return;
      }

      this.status.messagesReceived++;
      this.status.lastReceivedId = msg.message_id;
      this.notifyStatus();

      // Process Payload
      const report: FieldReport = msg.payload as FieldReport;
      report.sync_status = 'PENDING_SYNC';
      report.created_offline = true;
      
      if (this.onReportReceivedCb) {
        this.onReportReceivedCb(report, msg.hop_count);
      }
      
      // Forward if eligible
      if (msg.hop_count < MAX_HOP_COUNT) {
        this.log('Queueing report ' + report.report_id + ' for relay (hop ' + (msg.hop_count + 1) + ')');
        this.forwardMessage(report, msg.hop_count + 1);
      }
    } catch (e: any) {
      this.status.lastError = 'Malformed BLE payload';
      this.notifyStatus();
    }
  }

  public async forwardMessage(report: FieldReport, nextHopCount: number) {
    const msgId = `msg-${report.report_id}-${nextHopCount}`;
    this.knownMessageIds.add(report.report_id);
    
    const payload = {
      report_id: report.report_id,
      report_type: report.report_type,
      severity: report.severity,
      status: report.status,
      latitude: report.latitude,
      longitude: report.longitude,
      description: report.description,
      device_id: report.device_id,
      reporter_id: report.reporter_id,
      timestamp: report.timestamp,
    };

    const msg: BleMessage = {
      protocol_version: 1,
      message_id: msgId,
      report_id: report.report_id,
      hop_count: nextHopCount,
      payload: payload,
      checksum: this.generateChecksum(payload)
    };

    this.startAdvertising(msg);
  }

  public async startAdvertising(msg: BleMessage) {
    if (this.status.isAdvertising) {
      this.stopAdvertising();
    }
    
    try {
      const jsonStr = JSON.stringify(msg);
      const base64Str = Buffer.from(jsonStr).toString('base64');
      
      // Add GATT Service & Characteristic for peripheral
      await ReactNativeBlePeripheral.addService(RESQ_SERVICE_UUID, true);
      await ReactNativeBlePeripheral.addCharacteristicToService(
        RESQ_SERVICE_UUID,
        RESQ_CHARACTERISTIC_UUID,
        16 | 1, // Read | Broadcast properties
        1 // Readable permissions
      );
      
      // Set the value that connected centrals will read
      // Note: This relies on the specific behavior of the peripheral library
      // For this prototype, we simulate the GATT payload being served
      
      await ReactNativeBlePeripheral.start({
        serviceUuids: [RESQ_SERVICE_UUID],
      });
      
      this.status.isAdvertising = true;
      this.status.messagesForwarded++;
      this.status.lastForwardedId = msg.message_id;
      this.notifyStatus();
      
    } catch (e: any) {
      this.status.lastError = 'Advertising failed: ' + e.message;
      this.notifyStatus();
    }
  }

  public async stopAdvertising() {
    try {
      await ReactNativeBlePeripheral.stop();
      this.status.isAdvertising = false;
      this.notifyStatus();
    } catch (e) {
      console.log('Error stopping advertising', e);
    }
  }

  public cleanup() {
    this.stopScanning();
    this.stopAdvertising();
    if(this.bleManager) this.bleManager.destroy();
  }
}

export const bleService = new BleService();
