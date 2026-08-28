# Architecture Overview

The system consists of several decoupled modules designed for offline-first disaster environments.

## 1. Victim Mobile App (`mobile/`)
- Triggers SOS.
- Broadcasts BLE messages.
- Does not rely on internet connectivity.

## 2. Store-and-Forward Mesh (`mesh/`)
- Relays messages between phones.
- Simulated via Python for the software prototype to demonstrate hop-by-hop transmission.
- Reduces TTL per hop and increments Hop Count.
- Prevents infinite loops using message cache duplicate detection.

## 3. Rescue Gateway & Backend (`backend/`)
- Receives messages from the mesh (or simulated LoRa bridge).
- Exposes REST API to the frontend dashboard.
- Uses `execSync` to pipe SOS context to the AI classifier synchronously before writing to the database.

## 4. Rescue Command Dashboard (`frontend/`)
- Web dashboard for command center.
- Visualizes incoming SOS alerts, severity, and location on a map.
- Displays Mesh Route (Victim -> Node 1 -> Node 2 -> Gateway).

## 5. Database (`database/`)
- Stores victims, locations, emergencies, and rescue status.
- Tracks `relay_events` for tracing exactly how a message reached the gateway.

## 6. AI Severity Classification (`ai/`)
- Evaluates emergency severity via a rule-based Python classifier.
- Analyzes keywords, casualty counts, and flags (fire, trapped) to generate a score (1-10) and category (LOW, MEDIUM, HIGH, CRITICAL).

## 7. Logistics & Supply Chain Management Module (`backend/` & `frontend/`)
The Logistics Management Module orchestrates regional disaster relief infrastructure across Northeast India:
- **Vehicle Fleet Management**: Tracks real-time vehicle locations (GPS coordinates), types (Ambulance, Supply Truck, Water Tanker, Rescue Vehicle, Van), payload capacities, fuel levels, and operational statuses (`AVAILABLE`, `ON_ROUTE`, `BUSY`, `MAINTENANCE`).
- **Regional Warehouses & Depots**: Manages strategic distribution hubs across Northeast India (Guwahati, Shillong, Imphal, Agartala, Aizawl, Itanagar, Kohima, Silchar).
- **Inventory & Resource Tracking**: Real-time stock counts for emergency relief items (Food, Drinking Water, Medicine, Emergency Kits, Blankets, Medical Supplies) categorized by demand priority.
- **Logistics Delivery Requests**: Tracks emergency relief demands from disaster zones with destination coordinates, quantities, and urgency levels, enabling systematic progression (`PENDING` -> `ASSIGNED` -> `IN_TRANSIT` -> `DELIVERED`).

## 8. AI Integration Pipeline Preparation
The logistics module exposes a structured data endpoint (`GET /api/v1/logistics/ai-context`) providing clean inputs for future AI optimization engines to perform:
1. **Demand Prioritization**: Ranking delivery requests by severity, casualty count, and urgency.
2. **Warehouse Allocation**: Identifying the nearest regional warehouse possessing required stock.
3. **Vehicle Assignment**: Matching available vehicle types and payload capacities to delivery payloads.
4. **Dynamic Route Recommendation**: Computing optimal disaster-resilient transit corridors across Northeast Indian terrain.

