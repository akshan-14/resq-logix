# BLE Mesh Physical Test Protocol

**Objective**: Verify deduplication, max hop-count enforcement, and real-time offline relay functionality using physical devices.

## Prerequisite: Build Readiness & Installation
**Important**: Native BLE modules (eact-native-ble-plx, eact-native-ble-peripheral) **DO NOT WORK** in the standard Expo Go app. You must install a custom Development Build.

- **Android (Easiest)**: No paid developer account required. You need a physical device with Developer Options and USB Debugging enabled. 
  - Build via: eas build -p android --profile development
  - Download and install the resulting APK onto the devices.
- **iOS (Requires Paid Account)**: Apple requires a paid Developer Program membership ($99/yr) to code-sign and install the app to a physical iPhone. The device's UDID must be registered in your Apple Developer console before building.
  - Build via: eas build -p ios --profile development

Ensure you have granted Location and Bluetooth permissions on all test devices when first prompted.

---

## Scenario 1 — Basic 2-Device Relay (Offline to Offline to Backend)
**Setup**: You need two physical phones (Phone A and Phone B).

1. **Phone B**: 
   - Put in **Airplane Mode** (Turn off WiFi and Mobile Data). Leave Bluetooth **ON**.
   - Open the App, navigate to the **BLE Network** tab.
   - Tap **Start Scanning**. Ensure the Diagnostic Console says Started BLE Scanning.
2. **Phone A**:
   - Put in **Airplane Mode**. Leave Bluetooth **ON**.
   - Open the App, navigate to **Report Incident**.
   - Submit a new Field Report (e.g. ROAD_BLOCKED).
   - Phone A's OfflineStorage will save it locally and automatically invoke leService.forwardMessage().
3. **Observation on Phone B**:
   - Wait 5-15 seconds.
   - **PASS CRITERIA**: Phone B's Diagnostic Console should log:
     - Discovered: [Phone A's BLE ID]
     - Received NEW report: REP-[id] at hop 1
     - Queueing report REP-[id] for relay (hop 2)
     - Broadcasting msg: msg-REP-[id]-2
4. **Backend Sync**:
   - Turn **OFF** Airplane Mode on Phone B (Restore Internet).
   - **PASS CRITERIA**: The offline sync engine on Phone B should detect the network, flush its local offline queue (which now contains Phone A's report), and the report should instantly appear in the Command Centre web UI.

---

## Scenario 2 — 3-Device Hop Relay
**Setup**: Three physical phones (A, B, C).

1. **Phone C**: Connect to Internet. Open **BLE Network**, tap **Start Scanning**.
2. **Phone B**: Airplane Mode (No Internet). Open **BLE Network**, tap **Start Scanning**.
3. **Phone A**: Airplane Mode (No Internet). Move out of physical Bluetooth range of Phone C, but stay in range of Phone B (e.g. A is in one room, B is in the hallway, C is outside).
4. **Execution**: Submit a report on Phone A.
5. **Observation on Phone B**:
   - **PASS CRITERIA**: Console logs Received NEW report... at hop 1 and Broadcasting msg: msg-...-2.
6. **Observation on Phone C**:
   - **PASS CRITERIA**: Console logs Received NEW report... at hop 2. Because Phone C has internet, its sync engine immediately uploads it to the Command Centre.

---

## Scenario 3 — Deduplication Enforcement
**Setup**: Three phones in close proximity. A and B are offline. C is offline.

1. **Phone B & C**: Open **BLE Network**, tap **Start Scanning**.
2. **Phone A**: Open **Report Incident**, submit a report.
3. **Execution**:
   - Phone A broadcasts Hop 1.
   - Phone B receives it, logs Received NEW report..., and broadcasts Hop 2.
   - Phone C receives Hop 1 directly from A, logs Received NEW report..., and broadcasts Hop 2.
   - Phone C *also* receives Hop 2 from Phone B.
4. **Observation on Phone C**:
   - **PASS CRITERIA**: Phone C's console logs Duplicate report ignored: REP-[id]. The "Duplicates Rejected" counter increments.
   - Restore internet to Phone B and C. 
   - **PASS CRITERIA**: The Command Centre shows exactly ONE report. The deduplication layer successfully prevented a network storm.

---

## Scenario 4 — Hop Count Ceiling
**Setup**: Two phones (A and B).

1. **Phone B**: Open **BLE Network**, tap **Start Scanning**.
2. **Phone A**: 
   - Since creating a physical 6-phone chain is difficult, temporarily edit MAX_HOP_COUNT = 1 in mobile/src/ble/BleService.ts on Phone A and rebuild.
   - Put Phone A in Airplane Mode. Submit a report.
3. **Observation on Phone B**:
   - **PASS CRITERIA**: Phone B's console logs Received NEW report... at hop 1.
   - **CRITICAL PASS CRITERIA**: Phone B does **NOT** log Queueing report... for relay. It stops forwarding because the message has reached MAX_HOP_COUNT. This proves the mesh will not propagate messages indefinitely forever.
