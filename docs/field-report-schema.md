# Field Report Schema & Database Requirements

## Purpose
Field reports bridge the gap between ML models and ground truth.

## Proposed Future Schema (DO NOT IMPLEMENT YET)
To support the mobile app, the `resq-logix.db` will require a new `field_reports` table. 

**Proposed Table: `field_reports`**
- `report_id` (TEXT PRIMARY KEY)
- `report_type` (TEXT NOT NULL) - e.g., 'ROAD_BLOCKAGE', 'MEDICAL_EMERGENCY'
- `status` (TEXT) - e.g., 'BLOCKED', 'COLLAPSED'
- `latitude` (REAL NOT NULL)
- `longitude` (REAL NOT NULL)
- `severity` (TEXT) - 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
- `description` (TEXT)
- `people_affected` (INTEGER)
- `injured_people` (INTEGER)
- `reporter_id` (TEXT)
- `device_id` (TEXT)
- `timestamp` (TEXT NOT NULL)
- `verification_status` (TEXT DEFAULT 'UNVERIFIED')

## Human Verification Flow
1. Field report arrives at Backend (via Internet or BLE Gateway).
2. Saved as `UNVERIFIED`.
3. Dispatcher dashboard flags it.
4. Dispatcher verifies via radio/sat-phone or cross-referencing.
5. Marked as `VERIFIED`.
6. Phase 4 and Phase 5 engines consume it in the next execution cycle.
