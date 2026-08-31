# Phase 4 Hybrid Real-Data Risk Engine

## Why Supervised Route-Blockage ML Was Stopped
During Stage 3, it was determined that there is no publicly available, machine-readable historical dataset providing exact coordinates and timestamps of route blockages corresponding to disaster events in Northern India. Without true historical target labels (`y`), training a standard supervised machine learning model (`X -> y`) is impossible without fabricating data. Fabricating target labels (e.g., assuming a road is blocked just because it rained heavily) violates core scientific principles and the rules of the project. Therefore, the legacy synthetic polynomial generator was retained purely for `DEMO` purposes, and Phase 4 was re-architected as a Deterministic Risk Engine.

## Real Data Sources Used
The new engine (`ai/risk_engine/real_risk_engine.py`) consumes real features produced by Phase 2:
1. **Live Rainfall (Open-Meteo)**
2. **Static Terrain Slope and Elevation (SRTM DEM)**
3. **Historical Landslide & Flood Susceptibility (ISRO/Copernicus)**
4. **Field Intelligence (ResQ Database)** (e.g., `road_blockage`, `bridge_condition`)

## Deterministic Safety Rules
Hard safety constraints instantly short-circuit the decision process.
A route is marked `INFEASIBLE` if:
- Field observation reports an active `road_blockage`.
- Field observation reports a `bridge_condition` of "COLLAPSED" or "UNSAFE".
- Field observation reports an active landslide.

If critical safety context is missing, the route is marked `INSUFFICIENT_CONTEXT` rather than implicitly trusted.

## Risk-Level Methodology (Deterministic Score)
Instead of a fabricated ML probability, the engine calculates a transparent `DETERMINISTIC_RISK_SCORE` (0-100) based on threshold logic:
- `rainfall_mm` > 150mm adds +40 risk.
- `slope_degrees` > 30 adds +20 risk.
- High historical landslide susceptibility adds +20 risk.
- High rainfall compounding with high terrain susceptibility triggers an interaction penalty (+20 risk).
These determine the risk bands: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

## Missing-Data Behavior
The system relies on strict provenance tagging. If a feature's status is `UNAVAILABLE`, the engine gracefully defaults to baseline conditions (0.0) for that feature, rather than crashing or synthesizing a fake value. However, missing field intelligence triggers `INSUFFICIENT_CONTEXT`, forcing the dispatcher to verify the route.

## Human-in-the-Loop Integration (Phase 6)
The Phase 6 Decision Engine (`ai/decision_engine.py`) has been updated. The engine now defaults to the `DeterministicRiskEngine` for LIVE traffic. If Phase 4 returns `INFEASIBLE` or `INSUFFICIENT_CONTEXT`, Phase 6 immediately aborts the vehicle recommendation and returns the status, ensuring AI never auto-dispatches a vehicle down a blocked route. Even for valid recommendations, the system outputs `RECOMMENDATION_READY` to await human dispatcher approval.

## Future Role of ML
ML has not been abandoned. While route-blockage lacks labels, ML will be reintroduced when valid datasets are acquired for:
- Satellite-based damage detection.
- Natural Language Processing (NLP) of unstructured NDMA PDFs to automatically build the missing blockage dataset.
- Post-disaster demand forecasting.
The current architecture safely cordons the deterministic logic, allowing ML components to be slotted back in when data becomes available.
