# Phase 5 Deterministic Priority Engine

## Why Supervised ML Was Suspended for Phase 5
Supervised Machine Learning relies on ground truth labels to train a statistical representation of historical outcomes. In the context of disaster logistics, "Priority" is not an observable physical phenomenon (like rainfall or slope) but rather a subjective operational policy decision. 
During the audit (Stage 5), we confirmed that no large-scale, machine-readable dataset of historical, operationally-verified "priority scores" exists for our region. The legacy Phase 5 ML model was merely learning a synthetic, hardcoded polynomial equation. Consequently, running this in LIVE mode was unscientific and violated the project's real-data directive. The legacy model is now isolated to `DEMO` mode.

## Deterministic Priority Engine
The new LIVE Phase 5 engine (`ai/priority_engine/deterministic_priority_engine.py`) uses a clear, explainable heuristic approach. It evaluates verifiable field conditions and converts them into an operational ranking score.

### Real Features Evaluated
- `sos_count`: High volume indicates severe unmet needs.
- `medical_emergency_count`: Indicates immediate threats to life.
- `population_spatial_density`: High density means a higher impact radius.
- `request_age_hours`: Older requests gain priority over time.
- `accessibility_risk` (Phase 4): High risk isolates communities, acting as an urgency multiplier.
- `medicine_supply_days_remaining` (Future Field Data): Critically low supplies trigger safety overrides.

### UNAVAILABLE vs Zero
The engine respects strict provenance tags. It distinguishes a `0` (e.g., "Field teams confirm 0 active SOS signals") from `UNAVAILABLE` (e.g., "The network is down and we don't know the SOS count"). Missing features are safely bypassed rather than assumed zero, preventing the engine from downgrading a crisis just because sensors failed.

## Priority Rules & Score Methodology
The Engine calculates a `DETERMINISTIC_OPERATIONAL_PRIORITY_SCORE` (0-100). This is explicitly **NOT** a probability.

1. **Medical Urgency:** Each active medical emergency adds +5 points (capped at 40).
2. **SOS Volume:** Each active SOS signal adds +2 points (capped at 30).
3. **Population Impact:** Density > 1000/km2 adds +15 points.
4. **Time Urgency:** Requests older than 24h add +15 points.
5. **Isolation:** Phase 4 risk > 70 adds +10 points.

### Priority Bands
- **CRITICAL**: 80 - 100
- **HIGH**: 60 - 79
- **MEDIUM**: 35 - 59
- **LOW**: 0 - 34

### Safety Overrides
Operational safety rules catch extreme scenarios. For example, if there are active medical emergencies AND medicine supply is <= 2 days, the system triggers a `CRITICAL SHORTAGE` operational flag, adds +20 points, and automatically forces the level to at least HIGH/CRITICAL.

## Phase 4 → Phase 5 → Phase 6 Flow
1. **Phase 4 (Risk Engine)** determines if the route is physically passable. If `INFEASIBLE`, the process stops.
2. **Phase 5 (Priority Engine)** calculates humanitarian urgency using Phase 4 risk as a contributing isolation factor.
3. **Phase 6 (Decision Engine)** combines the priority, feasibility, and warehouse constraints to find the optimal vehicle and route, yielding a `RECOMMENDATION_READY` result for the human dispatcher.

## Future Database & Mobile BLE Integration
To fully leverage this engine, the future `resq-logix.db` schema must include a `field_reports` table populated by the offline mobile app via BLE mesh routing. This will provide live, ground-truth data for features like `injured_people`, `road_blockage`, and `supply_days_remaining`, which currently default to `UNAVAILABLE`.
