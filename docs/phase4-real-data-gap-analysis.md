# Phase 4 Real-Data Gap Analysis

This document analyzes the gap between the features currently required by the Phase 4 ML Model and the actual real-world data sources available, separating current live conditions from historical risk and field observations.

## Feature Audit Table

| Feature | Current Source | Real Source | Status | Historical Training | Live Prediction | Problem |
|---------|---------------|-------------|--------|--------------------|-----------------|---------|
| `distance_km` | OSRM API | OSRM Routing | READY | Use OSRM distances for historical routes | Live OSRM Query | None. |
| `elevation_change_m` | Open-Meteo | Open-Meteo (SRTM) | READY | Calculate diff from static SRTM | Live SRTM Query | None. Static geographic feature. |
| `terrain_difficulty` | Synthetic (0-10)| SRTM / DEM Slope derivation | PARTIAL | Derive slope/ruggedness from DEM | Derive from Live DEM | Needs logic to calculate slope/variance from elevation arrays, not just a single point. |
| `rainfall_mm` | Open-Meteo API | Open-Meteo Forecast | READY | Historical Weather APIs (ERA5) | Live Forecast | Must align historical ERA5 training data with live forecast data. |
| `weather_severity`| Derived | Open-Meteo weathercodes | PARTIAL | Derived from historical ERA5 codes | Derived from live forecast | Needs a standardized heuristic (e.g., code 71-77 = severe snow). |
| `population_density`| Nominatim + OM | WorldPop GeoTIFF (100m) | NEEDS DATASET| Extract density from historical raster | Extract from static raster | Current implementation gives Total City Population, NOT density. Model needs density/km2. |
| `road_condition`| Synthetic (0-10)| OSM highway tags (surface) | PARTIAL | OSM historical dumps | Live Overpass query | OSM has `surface=paved/unpaved` but not continuous "condition" 0-10. |
| `flood_risk` | Synthetic (0-1)| Copernicus/NDEM Flood Hazard Maps | NEEDS DATASET| Historical flood inundation layers | Static hazard lookup | Risk is a STATIC baseline. Live flooding is a separate field observation. |
| `landslide_risk`| Synthetic (0-1)| GSI / ISRO Susceptibility Maps | NEEDS DATASET| Historical landslide inventories | Static hazard lookup | Same as flood risk. Must differentiate susceptibility (static) from active landslide (live). |
| `road_blockage` | UNAVAILABLE | ResQ Mobile App (Field) | NEEDS FIELD APP| Post-disaster reports (e.g. from NDMA) | Live App Reports | Cannot be reliably sourced from APIs during disaster. Requires crowdsourcing. |
| `bridge_condition`| UNAVAILABLE | ResQ Mobile App (Field) | NEEDS FIELD APP| Historical damage assessments | Live App Reports | OSM can say a bridge exists, but NOT its structural integrity post-disaster. |
| `connectivity` | Synthetic (0-1)| Cellular coverage maps / BLE | NEEDS DATASET| Static coverage maps (OpenCelliD) | Static lookup | Connectivity changes during disasters, requiring field app telemetry. |

## Critical Distinctions

It is crucial to distinguish between different categories of data to avoid temporal or logical leakage in the ML models:

1. **Current Live Condition**: E.g., `rainfall_mm` (happening right now).
2. **Historical Risk / Susceptibility**: E.g., `landslide_risk` (the geological likelihood of a landslide occurring here, independent of today's weather). This is STATIC geographic information.
3. **Static Geographic Information**: E.g., `elevation_change_m`, `distance_km`.
4. **Field Observation**: E.g., `road_blockage`, `bridge_condition`. (Current live physical state).
5. **Derived Feature**: E.g., `weather_severity` (calculated from rainfall + wind + temperature).

**DO NOT substitute Historical Risk for Field Observation.**
A high `flood_risk` means the area is prone to flooding, it DOES NOT mean it is currently flooded. Current flooding must come from a Field Observation (`flood_observation`) or live Satellite Inundation maps.
