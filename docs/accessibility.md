# Accessibility Intelligence Engine

The Accessibility Intelligence engine is a core module of ResQ-Logix for the North Eastern Region. It calculates a route's **Accessibility Score (0-100)** and **Risk Profile**, enabling smart logistics and resource allocation during disasters.

## 1. How the Accessibility Score is Calculated

The AI uses a transparent, rule-based weighted model rather than a black-box neural network. This ensures emergency commanders can explicitly see *why* a route is deemed hazardous.

The final **Risk Score (0-100)** is the sum of these weighted factors:
- **Road Condition (20%)**
- **Terrain Difficulty (15%)**
- **Rainfall Severity (15%)**
- **Flood Risk (15%)**
- **Landslide Risk (15%)**
- **Road Blockage (10%)**
- **Network Connectivity (10%)**

*Note: If `road_blockage` reaches maximum severity (10/10), the Risk Score is immediately overridden to 100 (CRITICAL).*

The **Accessibility Score** is simply the inverse of the risk:
`Accessibility Score = 100 - Risk Score`

Risk Levels:
- **0-29**: LOW
- **30-59**: MEDIUM
- **60-79**: HIGH
- **80-100**: CRITICAL

## 2. Input Parameters

Each input is scored on a scale of `0` to `10`:
- **Distance**: Length of the route in kilometers.
- **Road Condition**: `0` = Perfect highway, `10` = Washed out/destroyed.
- **Terrain Difficulty**: `0` = Flat plains, `10` = Hazardous steep mountains.
- **Rainfall Severity**: `0` = Clear, `10` = Extreme monsoon downpour.
- **Flood Risk**: `0` = No risk, `10` = Currently flooded / high probability.
- **Landslide Risk**: `0` = Stable, `10` = Active landslide zone.
- **Road Blockage**: `0` = Clear, `10` = Completely impassable.
- **Connectivity**: `0` = 5G/4G available, `10` = Complete communication blackout.

## 3. Future Real-World Data Integration

Currently, the engine uses controlled demo data for hackathon demonstrations. In production, the `evaluate_route()` method will consume JSON payloads generated from:
- **Google Maps / Mapbox APIs** (Distance, base terrain, traffic blockages).
- **IMD (Indian Meteorological Department) API** (Live rainfall and weather severity).
- **Satellite / SAR Imagery** (Flood and landslide detection).
- **Crowdsourced Mesh Data** (Road blockages reported by offline victims via our BLE mesh).

## 4. Connection to the Logistics Module

Another developer is building the **Logistics Management Module** (warehouses, vehicles, inventory). 
Once merged, the workflow will be:
1. Logistics module requests a route to deliver resources.
2. It calls the `AccessibilityIntelligence` engine.
3. The AI returns the Accessibility Score and Risk Level.
4. If a route is HIGH/CRITICAL, the AI Recommendation Engine will reject standard vehicles and instead suggest alternative routes or specialized vehicles (e.g., helicopters or off-road 4x4s).
