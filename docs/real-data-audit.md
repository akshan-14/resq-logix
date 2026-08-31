# Phase 7: Real-World Data Audit

This document audits the existing synthetic dependencies within the ResQ-Logix ML models and integration pipelines.

## Synthetic Data Generation Locations
1. i/generate_synthetic_data.py: Generates artificial feature vectors and targets for the Phase 4 Accessibility ML model.
2. i/generate_priority_data.py: Generates artificial feature vectors and targets for the Phase 5 Priority Intelligence model.

## Synthetic Injection in LIVE Mode
The current architecture silently injects synthetic data in the following places when live data is unavailable or missing:
1. i/logistics_adapter.py (lines 28, 31, 34, 36): Falls back to data/logistics_context_demo.json on any network or parsing error during API fetch.
2. i/run_decision.py (lines 32-51): Hardcodes a synthetic context dictionary containing static values for population, ainfall_mm, oad_blockage, etc., if eq['context'] is missing.
3. i/test_integration.py (lines 39-59): Injects a similar static synthetic context to bypass ML input validation.

## Feature Audit

| Feature | Current Source | Synthetic/Real | Proposed Real Source | How Obtained | Used By |
|---------|----------------|----------------|----------------------|--------------|---------|
| distance_km | generate_synthetic_data.py (Random 5-500) | Synthetic | OSRM / OpenStreetMap | API Route distance | Phase 4 |
| road_condition | generate_synthetic_data.py (Random 0-10) | Synthetic | OSM / Field Reports | Overpass API / Mobile App | Phase 4 |
| terrain_difficulty | generate_synthetic_data.py (Random 0-10) | Synthetic | SRTM Elevation + OSM | Derived from slope/topography | Phase 4 |
| rainfall_mm | generate_synthetic_data.py (Random 0-300) | Synthetic | IMD / Open-Meteo API | Weather API by Lat/Lon | Phase 4, Phase 5 |
| flood_risk | generate_synthetic_data.py (Derived formula) | Synthetic | Gov Datasets / Satellites | Authoritative flood maps / APIs | Phase 4, Phase 5 |
| landslide_risk | generate_synthetic_data.py (Derived formula) | Synthetic | Geological Survey / Field | Authoritative maps / Field App | Phase 4, Phase 5 |
| road_blockage | generate_synthetic_data.py (Derived + Noise)| Synthetic | Field Reports / OSM | Mobile App / Live Routing APIs | Phase 4, Phase 5 |
| connectivity | generate_synthetic_data.py (Random 0-10) | Synthetic | Field App / Telecom APIs | Mobile device connectivity status | Phase 4, Phase 5 |
| elevation_change_m | generate_synthetic_data.py (Derived formula) | Synthetic | SRTM / NASA Elevation | Query elevation profile along route| Phase 4 |
| bridge_condition | generate_synthetic_data.py (Derived formula) | Synthetic | Field Reports / OSM | Mobile App / OSM Infrastructure | Phase 4 |
| population / pop_density| generate_priority_data.py (Random) | Synthetic | Census / WorldPop / data.gov.in| Geographic population queries | Phase 4, Phase 5 |
| weather_severity | generate_synthetic_data.py (Derived formula) | Synthetic | IMD / Open-Meteo API | Weather alerts / classifications | Phase 4, Phase 5 |
| sos_count | generate_priority_data.py (Derived formula) | Synthetic | Mobile App / Logistics DB | Aggregate active SOS events | Phase 5 |
| medical_emergency_count| generate_priority_data.py (Derived formula) | Synthetic | Mobile App / Logistics DB | Aggregate medical SOS requests | Phase 5 |
| injured_people | generate_priority_data.py (Derived formula) | Synthetic | Mobile App / Logistics DB | Field reports | Phase 5 |
| supply_days_remaining | generate_priority_data.py (Derived formula) | Synthetic | Logistics DB | Calculated from inventory/demand | Phase 5 |
| shelter_demand | generate_priority_data.py (Derived formula) | Synthetic | Logistics DB / Gov Reports | Official figures / Aggregated reqs | Phase 5 |
| disaster_severity | generate_priority_data.py (Random 0-10) | Synthetic | IMD / Gov Alerts | Official disaster categorization | Phase 5 |

## Model Training & Labels Audit
- **Phase 4 Labels (ccessibility_score, isk_level)**: Entirely fabricated using a hardcoded polynomial formula in generate_synthetic_data.py.
- **Phase 5 Labels (priority_score, priority_level)**: Entirely fabricated using a hardcoded weighted urgency formula in generate_priority_data.py.
- **Conclusion**: The current ML models are learning reverse-engineered synthetic formulas, not real-world patterns. We cannot simply feed real inputs into these models. They must be re-evaluated/re-trained on actual historical data or baseline physics/rules until field-labeled data is gathered.
