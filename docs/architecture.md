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

## 6. AI (`ai/`)
- Evaluates emergency severity via a rule-based Python classifier.
- Analyzes keywords, casualty counts, and flags (fire, trapped) to generate a score (1-10) and category (LOW, MEDIUM, HIGH, CRITICAL).
