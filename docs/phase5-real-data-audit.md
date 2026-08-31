# Phase 5 Real-Data Audit & Priority Intelligence Refactor Assessment

This document provides a comprehensive architectural audit of the Phase 5 Priority Intelligence system, determining its feasibility for supervised machine learning and evaluating its readiness for a real-data transition.

## 1. Current Phase 5 Architecture
The current system (`ai/predict_priority.py`) relies on a Random Forest classification and regression model. It evaluates an array of demographic, disaster, and logistical supply features to generate a `priority_score` (0-100) and `priority_level` (LOW, MEDIUM, HIGH, CRITICAL). 
However, it currently relies on `generate_priority_data.py`, which is entirely synthetic.

## 2. Complete Feature Inventory & Current Status
| Feature | Synthetic Status | Real-World Target Source | Real Feasibility |
| :--- | :--- | :--- | :--- |
| `population` | `np.random` | WorldPop (Static Raster) | High (Requires GIS extraction) |
| `population_density` | `np.random` | WorldPop (Static Raster) | High |
| `vulnerable_population` | `np.random` | Census demographics | Moderate (Needs spatial mapping) |
| `sos_count` | `np.random` | ResQ DB (`sos_messages`) | High (Already implemented) |
| `medical_emergency_count` | `np.random` | ResQ DB (`sos_messages`) | High (Already implemented) |
| `injured_people` | `np.random` | Mobile App / Field DB | Missing from current DB schema |
| `food_supply_days_remaining` | `np.random` | Field Reports | Missing from current DB schema |
| `water_supply_days_remaining` | `np.random` | Field Reports | Missing from current DB schema |
| `medicine_supply_days_remaining` | `np.random` | Field Reports | Missing from current DB schema |
| `shelter_demand` | `np.random` | Field Reports | Missing from current DB schema |
| `distance_to_nearest_hospital_km`| `np.random` | OSRM + OSM POI | High |
| `distance_to_nearest_warehouse_km`| `np.random` | ResQ DB (`warehouses`) + OSRM | High |
| `accessibility_score` / `risk` | `np.random` | Phase 4 Risk Engine | High |
| `rainfall_mm` | `np.random` | Open-Meteo | High (Already implemented) |
| `flood_risk` / `landslide_risk` | `np.random` | Copernicus / ISRO | High |
| `weather_severity` | `np.random` | Open-Meteo (Derived) | High |
| `road_blockage` / `connectivity` | `np.random` | Phase 4 Risk / Field DB | Missing from current DB schema |
| `disaster_severity` | `np.random` | Field DB / Derived | Missing from current DB schema |
| `request_age_hours` | `np.random` | ResQ DB (`created_at`) | High |

## 3. Synthetic Data Contamination & Hardcoded Equations
- **`generate_priority_data.py`** uses arbitrary, unscientific polynomial algebra to invent the target label:
  ```python
  medical_urgency = (medical_emergency_count * 5) + (14 - medicine_supply_days_remaining)**2
  raw_priority = (medical_urgency + survival_urgency + population_impact + sos_count*2 + time_urgency) * isolation_multiplier
  ```
  The ML model is merely memorizing this fake equation.

## 4. ML Feasibility & Real Labels Assessment
**SUPERVISED ML IS CURRENTLY INFEASIBLE.**
Just like Phase 4, there is no public, machine-readable historical dataset defining what a "Priority Score" was during the 2013 Uttarakhand floods. 
"Priority" is an inherently subjective operational decision (a policy), not a physically observable natural phenomenon (like rainfall). You cannot train a model on a policy without massive historical logs of previous dispatch decisions. 

## 5. Mobile/BLE Future Data Requirements & Database Gap Analysis
The current SQLite database (`resq-logix.db`) lacks the schema required to capture field intelligence. 
**Required Future Schema Additions:**
We must eventually create a `field_reports` table (synced via BLE) containing:
- `injured_people_count`
- `food_supply_days_remaining`
- `water_supply_days_remaining`
- `medicine_supply_days_remaining`
- `shelter_demand_count`
- `road_blockage_status`
- `bridge_condition_status`

## 6. Recommended Phase 5 Architecture
Since supervised ML cannot be justified without historical labels, Phase 5 must pivot to a **Deterministic Priority Engine**.
It should ingest the real `UNAVAILABLE`-tagged features from the Feature Builder and apply an explainable heuristic scoring rubric.
*Example Rule:* If `medical_emergency_count > 10` and `medicine_supply_days_remaining == 0`, add `+50` Priority Score.

## 7. Phase 4 → Phase 5 Integration
Phase 5 should use the `DETERMINISTIC_RISK_SCORE` outputted by Phase 4. However, it must treat it as an **Isolation Multiplier** (High route risk = High isolation = High priority for air-drops or heavy relief), NOT assume that a high risk route itself constitutes a priority request if nobody lives there.

## 8. LIVE vs DEMO Behavior
- **LIVE**: Uses Real APIs. If a feature (like `medicine_supply_days_remaining`) is not in the DB, it outputs `UNAVAILABLE` and is ignored in the scoring algorithm.
- **DEMO**: Safely runs the old legacy NumPy synthetic generators to demonstrate theoretical capability.
