# Mobile Application Architecture

## Technology Choice
**React Native (Expo)** is selected for the mobile application.
- Allows rapid cross-platform development (iOS / Android) for field workers who may use varying personal devices during a disaster.
- Expo supports robust offline storage (AsyncStorage, SQLite) and background location services required for field data gathering.
- The existing web frontend is React-based, allowing potential component/logic sharing in the future.

## Offline-First Design
Field workers will operate in zones with destroyed cellular infrastructure.
1. The app stores all reports locally in SQLite (`PENDING_SYNC`).
2. When the device regains internet connectivity, a background worker pushes `PENDING_SYNC` reports to the backend.
3. Simultaneously, the app broadcasts critical reports via Bluetooth Low Energy (BLE) to nearby devices, utilizing a mesh relay to reach internet-connected gateways.

## GPS Handling
- Real GPS coordinates are mandatory. 
- If GPS permission is denied, the app halts the report creation and shows an explicit error.
- The system will NOT silently substitute or hallucinate coordinates.

## Phase 4 and Phase 5 Integration
Once a field report reaches the backend, its status defaults to `UNVERIFIED`.
- `VERIFIED` reports are ingested by the **Feature Builder**.
- If a verified report states `ROAD_BLOCKAGE = HIGH`, the Phase 4 Risk Engine flags the route as `INFEASIBLE`.
- If a verified report states `MEDICAL_EMERGENCY = HIGH`, the Phase 5 Priority Engine escalates the priority score.
- Provenance is meticulously tracked (e.g., `source: "ResQ Mobile Field Report"`).
