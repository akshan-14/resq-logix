# ResQ-Logix Mobile App UI

## Overview
The ResQ-Logix mobile application provides an offline-first field reporting interface for disaster responders. Built with React Native and Expo, the UI focuses on simplicity, large touch targets, and robust failure handling during connectivity losses.

## Screens Implemented

### 1. Home / Dashboard (`HomeScreen.tsx`)
- Displays overall network and GPS status.
- Shows total locally pending syncs vs successful syncs.
- Clear action buttons: `REPORT INCIDENT` and `MY REPORTS`.
- Manual `Sync Now` button to trigger the backend API push.

### 2. Report Incident (`ReportIncidentScreen.tsx`)
- Contains a scrollable form mapping to the `field_reports` backend schema.
- **GPS Flow:** Explicitly requires REAL device GPS via `expo-location`. Pressing "CAPTURE LOCATION" requests foreground permissions and fetches high-accuracy coordinates. No fake/default coordinates are allowed. If denied, submission is blocked.
- Supports selection of Backend-approved types (e.g. `ROAD_BLOCKAGE`, `MEDICAL_EMERGENCY`) and severity levels.
- Generates a UUID for `report_id`.
- On submission, saves the report to local SQLite/AsyncStorage and immediately queues a sync.

### 3. My Reports (`MyReportsScreen.tsx`)
- Lists all locally stored reports (newest first).
- Displays clear, color-coded synchronization tags (`PENDING_SYNC` in orange, `SYNCED` in green).
- Explicitly marks all reports as `UNVERIFIED` (gray badge).

### 4. Report Detail (`ReportDetailScreen.tsx`)
- Displays all captured data (coordinates, timestamps, descriptions).
- Re-iterates that verification is strictly performed by the backend/dispatcher.
- Shows `MOBILE_APP (Offline)` as the source if it was created without an active connection.

## Offline Implementation
The system relies on `@react-native-async-storage/async-storage`.
- Reports are persisted locally immediately upon submission.
- Network requests use `try/catch`. If the fetch fails, the report remains safely preserved as `PENDING_SYNC`.
- Data is never replaced with synthetic information. If GPS cannot be fetched, the report simply cannot be created (as it is useless to the Risk Engine without coordinates).

## Backend Integration
- `OfflineStorage.ts` integrates with `POST /api/v1/field-reports`.
- Uses real IP binding (`10.0.2.2` for Android emulator) to hit the Node.js backend.
- Gracefully handles `HTTP 409` (duplicate constraint) by marking the report as `SYNCED` (since the server already has it, e.g. via mesh).

## What is NOT Implemented Yet
- **Physical BLE:** The UI displays `message_id` and prepares the data model for BLE relay, but the physical `react-native-ble-plx` logic is explicitly deferred to the next stage.
- **Photo Evidence:** Camera integration was skipped in this baseline UI phase to prioritize the core text-and-GPS pipeline, but can be added into the Expo scaffolding easily later.
