# Stage 8: Real Physical BLE Mesh Implementation

## Selected Architecture

### A. BLE Libraries Selected
- **Central / Scanner Role:** `react-native-ble-plx`
- **Peripheral / Advertiser Role:** `react-native-ble-peripheral`

### B. Why These Were Selected
True phone-to-phone BLE mesh requires both Central (scanning for devices) and Peripheral (advertising a service and hosting GATT characteristics) roles. The industry standard `react-native-ble-plx` robustly supports the Central role but entirely lacks Peripheral capabilities. To achieve bi-directional communication, we must use a separate library, `react-native-ble-peripheral`, to handle GATT Server creation and BLE advertising. Because BLE advertisements are strictly limited to ~31 bytes, we cannot embed the entire `FieldReport` payload directly in the broadcast packet. We use a **two-step GATT protocol** where Peripheral advertises presence, and Central connects to read the payload.

### C. Expo SDK Compatibility
Fully compatible with Expo SDK 54 via Custom Config Plugins and Prebuild.

### D. Expo Go Support
**No.** Expo Go absolutely cannot support this. Expo Go only includes pre-compiled native modules, and neither `react-native-ble-plx` nor `react-native-ble-peripheral` are included in the Expo Go binary.

### E. Development Build Requirements
Requires a Custom Development Build (`npx expo run:android` or `npx expo run:ios`). The project now uses `expo-dev-client`.

### F. Android Setup
`app.json` has been updated with the following permissions:
- `BLUETOOTH`, `BLUETOOTH_ADMIN` (Legacy Android)
- `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE` (Android 12+)
- `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` (Required for BLE scanning on Android)

### G. iOS Setup
`app.json` updated with `UIBackgroundModes` (`bluetooth-central`, `bluetooth-peripheral`) and requisite usage descriptions (`NSBluetoothAlwaysUsageDescription`, `NSBluetoothPeripheralUsageDescription`). iOS aggressively obfuscates MAC addresses and throttles background advertising, requiring the screen to be awake for the most reliable discovery.

## Protocol & Logic

### K. BLE Protocol & GATT
- **Service UUID:** `54321098-7654-3210-9876-543210987654`
- **Characteristic UUID:** `12345678-1234-1234-1234-123456789012`
- **Payload:** Complete JSON payload, base64 encoded, exposed via GATT readable characteristic.

### L. Advertising (Peripheral)
When a device creates a report (or forwards one), it starts Advertising the `RESQ_SERVICE_UUID` and sets the Characteristic value to the encoded JSON of the `FieldReport`.

### M. Scanning & N. Receiving (Central)
A device running `startScanning()` constantly looks for `RESQ_SERVICE_UUID`. Upon discovery, it:
1. Connects to the Peripheral.
2. Discovers Services and Characteristics.
3. Reads the payload from the characteristic.
4. Disconnects immediately to free up the radio.

### O. Deduplication
We maintain an in-memory `Set<string>` of `message_id`s. Any received `message_id` already in the Set is immediately dropped to prevent mesh flooding.

### P. Hop Count
The protocol enforces `MAX_HOP_COUNT = 5`.
When Phone A creates the report, hop is 0. Phone B receives it as 0, saves it, increments to 1, and advertises it. Once hop reaches 5, the device saves it locally but *will not* advertise it further.

### Q. Offline Forwarding
Handled automatically in `OfflineStorage.ts` and `BleService.ts`. If a report is created or received, it is stored in AsyncStorage with `sync_status = 'PENDING_SYNC'`. The BLE radio attempts to propagate it immediately.

### R. Backend Synchronization
Whenever a report is saved, `OfflineStorage.syncPendingReports()` is called, which fires a `POST /api/v1/field-reports`. The backend uses `report_id` to enforce uniqueness, returning HTTP 409 for duplicates (which marks the local copy as `SYNCED`).

## Testing & Status

### S. Software & Unit Tests
Implemented `generateChecksum(payload)` to ensure JSON integrity in transit. Malformed base64/JSON is caught and rejected.

### T. TWO-PHONE PHYSICAL TEST
**STATUS: PENDING USER PHYSICAL TEST**
The architecture is completely implemented. You must now compile the development build onto two physical phones to run the final verification.

### U. THREE-PHONE PHYSICAL TEST
**STATUS: PENDING USER PHYSICAL TEST**

### V. Known Limitations
- Background execution on iOS is notoriously difficult for peripheral advertising.
- React Native's bridge overhead limits max throughput; sending highly complex JSON can cause MTU size chunking issues on certain older Android devices.

### W. Exact Commands to Build/Run
1. **Prebuild & Compile Android Dev Client:**
   ```bash
   cd mobile
   npx expo run:android
   ```
2. **Prebuild & Compile iOS Dev Client (Requires Mac + Xcode):**
   ```bash
   cd mobile
   npx expo run:ios
   ```
3. **Start the Bundler:**
   ```bash
   npx expo start --dev-client
   ```
