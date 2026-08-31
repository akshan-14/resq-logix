# 🚨 ResQ-Logix: AI-Powered Disaster Logistics Platform

**ResQ-Logix** is a modern, offline-first command centre and logistics accessibility platform built specifically for disaster response in the North Eastern Region (NER) of India. 

Designed for MoDNER officials, district disaster management teams, and field responders, this platform bridges the gap between chaotic disaster data and actionable, life-saving logistics during floods, landslides, and critical network outages.

---

## 🌟 Key Features

### 1. 🗺️ Command Centre Dashboard
A comprehensive React-based web dashboard that provides a God's-eye view of disaster zones.
- **Interactive Map:** Centered on Assam, Meghalaya, Arunachal Pradesh, and Manipur with precise terrain mapping.
- **Live Overlays:** Real-time markers for relief camps, flooded zones, blocked roads, and deployed vehicles.
- **Status KPIs:** Instantly track active deliveries, critical demands, and operational hubs.

### 2. 🧠 AI Smart Dispatch & Risk Engine
- **Deterministic Routing:** Evaluates bridge failures, landslide risks, and flood levels to safely route supply trucks.
- **Auto-Assignment:** Intelligently matches the closest available vehicles (trucks, boats, helicopters) to critical demands based on terrain constraints.
- **Copernicus Satellite Integration:** Pipeline ready to analyze real-world elevation and flood proxy data.

### 3. 📡 Offline-First Mobile App (BLE Mesh)
A React Native mobile application built for field responders operating in areas with **zero cellular connectivity**.
- **Bluetooth Low Energy (BLE) Mesh:** Responders can broadcast SOS alerts and incident reports directly to nearby devices.
- **Hop-Count Deduplication:** Ensures reports traverse the mesh network efficiently until they reach an internet-connected gateway.
- **Trusted Reporter Tier:** Official NDRF/SDRF personnel have elevated priority in the network, filtering out crowdsourced noise.
- **Delivery Confirmation Loop:** Drivers can mark critical medical/food supplies as delivered via GPS, syncing automatically when connectivity is restored.

### 4. 📊 Historical Analytics & Simulation
- **Historical Risk Analysis:** Visual charts comparing Baseline Risk proxies against Actual Successful Deliveries.
- **Scenario Simulator:** Stress-test logistics responses by simulating a Category 4 Cyclone or a major Brahmaputra flood event.

---

## 🛠️ Technology Stack

**Frontend:**
- React (Vite)
- React-Leaflet (OpenStreetMap)
- Recharts (Data Visualization)
- Lucide React (Icons)
- **Deployed on Vercel**

**Backend:**
- Node.js & Express
- SQLite (Self-Seeding for Demos)
- UUID & RESTful API Architecture
- **Deployed on Render**

**Mobile (Field App):**
- React Native (Expo)
- React Navigation
- React Native BLE PLX / Peripheral (Mesh Networking)
- AsyncStorage (Offline Queuing)

**AI & Data Pipeline:**
- Python 3
- HDX (Humanitarian Data Exchange) Simulation
- Deterministic Risk Calculation Algorithms

---

## 🚀 Live Demo

- **Command Centre (Web):** [https://resq-logix.vercel.app](https://resq-logix.vercel.app)
- **API (Backend):** [https://resq-logix-backend.onrender.com](https://resq-logix-backend.onrender.com)

---

## 💻 Local Setup

1. **Clone the repository:**
   \\\ash
   git clone https://github.com/akshan-14/resq-logix.git
   \\\

2. **Run the Backend:**
   \\\ash
   cd backend
   npm install
   npm run start:prod
   \\\

3. **Run the Frontend:**
   \\\ash
   cd frontend
   npm install
   npm run dev
   \\\

4. **Build the Mobile App:**
   \\\ash
   cd mobile
   npm install
   eas build -p android --profile preview
   \\\

---
*Built with ❤️ for disaster resilience.*
