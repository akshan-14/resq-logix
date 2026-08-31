# ResQ-Logix

**Smart India Hackathon 2026 - Problem Statement SIH2026002**

ResQ-Logix is an offline disaster emergency communication system that helps trapped victims send SOS information when cellular networks and internet connectivity are unavailable.

## Core Flow
1. **Normal Internet SOS**: If connected, mobile app hits REST API directly.
2. **Offline SOS Flow**: Victim Mobile App -> BLE SOS Broadcast -> Nearby Mobile Phones (Mesh).
3. **Store-and-Forward**: Phones act as relay nodes. They check their cache to prevent duplicate storms, decrement the TTL, increment the Hop Count, and broadcast.
4. **Gateway**: A dedicated hardware node (ESP32/LoRa) picks up the BLE signal and bridges it to the internet or long-range radio.
5. **AI Severity & Accessibility Intelligence**: The backend pipes emergency details to a Python classifier that ranks incident severity. Additionally, an Accessibility Intelligence engine computes risk scores for delivery routes based on terrain, weather, and landslides (crucial for the North Eastern Region logistics).
6. **Command Dashboard**: The React UI polls the backend and visualizes the crisis, displaying the exact route the message took to reach safety.

## Project Structure
- `frontend/`: Rescue Command Dashboard (React + Vite)
- `backend/`: API for receiving SOS and managing rescue status (Node.js/Express)
- `mobile/`: Victim Android App (React Native/Android)
- `mesh/`: Software simulation of the BLE store-and-forward mesh (Python)
- `database/`: Database schema and SQLite file
- `ai/`: AI severity classifier & Accessibility Intelligence (Python)
- `docs/`: Project documentation (including [Architecture](docs/architecture.md), [API](docs/api.md), and [Accessibility Intelligence](docs/accessibility.md))
