# BLE Data Protocol

## Purpose
The Bluetooth Low Energy (BLE) layer is designed strictly to transport compact, structured field observations in disaster zones without internet. It is NOT designed to transport maps, images, or large datasets.

## Mesh Architecture
- **Origin Node (Device A):** Creates a report, saves it offline, and begins BLE broadcasting.
- **Relay Node (Device B):** Receives the broadcast, checks if `hop_count < MAX_HOPS` (e.g., 5). If so, it increments the hop count, saves it locally, and re-broadcasts.
- **Gateway Node (Device C):** Receives the broadcast and has an active internet connection. It immediately forwards the payload to the Backend API.

## Message Format
```json
{
  "message_id": "msg-12345",
  "report_id": "rep-9876",
  "origin_device_id": "dev-abc",
  "hop_count": 0,
  "timestamp": "2024-05-01T12:00:00Z",
  "payload": {
    "report_type": "ROAD_BLOCKAGE",
    "latitude": 30.1,
    "longitude": 78.2,
    "severity": "HIGH",
    "status": "BLOCKED"
  },
  "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

## Security & Duplicate Prevention
- **Duplicate Prevention:** Nodes track `message_id`. If a node receives a known `message_id`, it drops it.
- **Validation:** The Backend API enforces strict schema checks and duplicate report detection via `report_id`.
- **Security Limitation:** The current prototype lacks end-to-end encryption for BLE messages, meaning nearby malicious nodes could theoretically intercept or spoof plaintext JSON payloads. Future iterations require payload signing.
