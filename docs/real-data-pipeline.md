# Phase 7: Real-World Data Pipeline Architecture

This document maps out the real-world data pipeline constructed for Phase 7 to replace the synthetic data generators.

## 1. Feature Engineering & Provenance

Every feature extracted from a real API or the Logistics Database is constructed with strict provenance tracking to ensure explainability in LIVE mode.

**Provenance Schema:**
`json
{
    "feature_name": {
        "value": 12.4,
        "unit": "mm",
        "source": "open-meteo",
        "timestamp": "2026-08-29T10:00:00Z",
        "status": "REAL" // REAL, DERIVED, DEMO, UNAVAILABLE, DATA_STALE
    }
}
`

## 2. Verified Data Sources

| Feature | Source / API | Resolution | Status | LIVE/TRAIN | Notes |
|---------|-------------|-------------|--------|------------|-------|
| ainfall_mm | Open-Meteo orecast API | Global (~10km) | REAL | LIVE | Fetched via lat/lon. Replaces random synth array. |
| 	emperature | Open-Meteo orecast API | Global (~10km) | REAL | LIVE | Used for weather_severity derivation. |
| elevation_m | Open-Meteo elevation API | Global (~90m) | REAL | LIVE | SRTM-backed. Can query diff for 	errain_difficulty. |
| distance_km | OSRM Public Routing API | Global | REAL | LIVE | True road distance routing. Replaces Haversine math. |
| `population` | Nominatim + Open-Meteo Geocoding | District/City | REAL | LIVE | Queries OSM for nearest Admin Region/City, then Open-Meteo for census pop. Replaces WorldPop placeholder. Cached locally. |
| sos_count | Logistics DB (sos_messages) | Point | DERIVED| LIVE | SELECT COUNT(*) where status=ACTIVE. |
| medical_emergency_count | Logistics DB (sos_messages) | Point | DERIVED| LIVE | SELECT COUNT(*) where status=ACTIVE & type='Medical'. |
| oad_blockage | Logistics DB / Mobile App | Point | UNAVAIL| LIVE | DB schema currently lacks this field. Explicitly marked UNAVAILABLE instead of guessing. |
|  ridge_condition| Logistics DB / Mobile App | Point | UNAVAIL| LIVE | Explicitly marked UNAVAILABLE. |
| injured_people | Logistics DB / Mobile App | Point | UNAVAIL| LIVE | Explicitly marked UNAVAILABLE. |

## 3. Failure Behavior (LIVE Mode vs DEMO Mode)

- **LIVE Mode**: 
  - If a network call to OSRM or Open-Meteo fails, times out, or returns invalid JSON, the fetcher catches the exception and returns a DATA_UNAVAILABLE status.
  - The eature_builder will mark that specific feature as status: UNAVAILABLE with a 
ull value.
  - We **NEVER** generate random values or inject logistics_context_demo.json in LIVE mode. 
  - Phase 4/5 models (once retrained) will be responsible for handling 
ull/missing inputs appropriately (e.g., falling back to population baselines, or returning INSUFFICIENT_CONTEXT for critical missing data like distance_km).

- **DEMO Mode**:
  - Only when explicitly toggled. Bypasses real APIs and loads the isolated synthetic data generators for hackathon/presentation safety.

## 4. Current Limitations

- **Field Reports**: The current SQLite schema ackend/resq-logix.db only has sos_messages. It lacks tables for oad_blockage, ridge_condition, and injured_people. We are returning UNAVAILABLE for these rather than fabricating data. Stage 9 will involve migrating the schema to accept the Mobile App field reports.
- **Rate Limits**: The public OSRM and Open-Meteo APIs are free but rate-limited. For production, these require dedicated instances or API keys.
