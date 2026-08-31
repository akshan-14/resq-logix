# Phase 7: Real-World Data Sources

This document details the verified real-world data sources to be integrated into ResQ-Logix, transitioning away from synthetic generation.

| Source | URL/API | Data | Frequency | Geographic Coverage | Used For |
|--------|---------|------|-----------|---------------------|----------|
| Open-Meteo (Weather API) | pi.open-meteo.com/v1/forecast | Rainfall, Temp, Weather Alerts | Hourly/Live | Global | Phase 4, Phase 5 Live Inference |
| Open-Meteo (Elevation API) | pi.open-meteo.com/v1/elevation | Terrain elevation (SRTM-based) | Static | Global | Phase 4 Feature Engineering |
| OSRM Public API | outer.project-osrm.org/route/v1/ | Road distance, routing | Live/Static | Global | Phase 4, Phase 6 Distance |
| Overpass API (OSM) | overpass-api.de/api/interpreter | Road existence, bridges, infrastructure | Live Updates | Global | Phase 4 Live Inference |
| data.gov.in | data.gov.in/api | Historical Rainfall, Census Demographics | Periodic | India | Phase 4, Phase 5 Training |
| Humanitarian Data Exchange (HDX) | data.humdata.org | Disaster statistics, impacted populations | Periodic | Global | Phase 5 Training Data |
| EM-DAT | public.emdat.be | Historical disaster impacts and severity | Periodic | Global | Phase 5 Training Data |
| xView2 Challenge Dataset | xview2.org | Post-disaster satellite imagery + labels | Static (2019) | Global (Disaster events) | Phase 4 (Satellite CV Training) |
| Bhuvan / ISRO | huvan.nrsc.gov.in | Satellite maps, disaster layers | Periodic | India | Reference / Manual Review (Restricted API) |
| ResQ Logistics DB | Local SQLite (esq-logix.db) | Inventory, warehouse status, vehicle status | Live | Local/System | Phase 5, Phase 6 Live Inference |
| ResQ Mobile App (Planned) | POST /api/v1/field-reports | Road blockages, SOS, bridge status, connectivity | Live | Field Operations Area | Phase 4, Phase 5 Live Inference |

## Detailed Source Verification

### 1. Weather & Rainfall (Open-Meteo)
- **Status**: ACCESSIBLE
- **API Endpoint**: https://api.open-meteo.com/v1/forecast
- **Auth/License**: No API key required for non-commercial/low-volume. CC-BY 4.0.
- **Fields Used**: precipitation, weathercode
- **Suitability**: Excellent for live demonstration and live inference. Replaces synthetic ainfall_mm and weather_severity.

### 2. Road Network & Routing (OSRM & OSM)
- **Status**: ACCESSIBLE
- **API Endpoints**: OSRM (http://router.project-osrm.org/route/v1/driving/), Overpass (https://overpass-api.de/api/interpreter)
- **Auth/License**: No API key (fair use limits apply). ODbL license.
- **Fields Used**: distance, duration, highway tags, ridge tags.
- **Suitability**: Live route distances replace Haversine distances. Overpass can determine if a bridge exists at coordinates, separating "Bridge Exists" from "Bridge Damaged".

### 3. Elevation (Open-Meteo Elevation / SRTM)
- **Status**: ACCESSIBLE
- **API Endpoint**: https://api.open-meteo.com/v1/elevation
- **Auth/License**: Free API without key.
- **Fields Used**: elevation in meters.
- **Suitability**: We can query start and end coordinates to calculate elevation_change_m, replacing random generation. 

### 4. Demographics & Population (data.gov.in / WorldPop)
- **Status**: ACCESSIBLE (Bulk/Manual)
- **Demographics**: OpenStreetMap Nominatim + Open-Meteo Geocoding | Provides static real census data via geographic lookup. Instead of caching heavy TIFF rasters locally or relying on unauthenticated WorldPop endpoints (which frequently reject programmatic point queries), we reverse-geocode the Lat/Lon into a known Administrative Region/City, then query Open-Meteo's geocoding endpoint for the census population count. Cached locally to minimize network abuse.
- **Fields Used**: population_density, 	otal_population

### 5. Historical Disaster Data (HDX / EM-DAT)
- **Status**: ACCESSIBLE (Bulk Download)
- **Note**: These are static/periodically updated datasets. They do not provide "live" APIs for an ongoing disaster event, but are crucial for extracting real training labels (deaths, injuries, affected populations) to retrain Phase 5.

### 6. Satellite Imagery (xView2 / Bhuvan)
- **Status**: PARTIALLY ACCESSIBLE
- **Note**: xView2 provides excellent labeled pre/post disaster images for training a road/building damage model. However, LIVE inference requires a live satellite feed (e.g., Planet Labs, Maxar) which is costly. Bhuvan provides Indian data but programmatic live access is restricted.
- **Proposed Architecture**: Train model on xView2. In live mode, either mock the satellite feed input (explicitly labeled DEMO) or mark satellite imagery as UNAVAILABLE in live mode.

### 7. Field Observations (Mobile App / BLE)
- **Status**: PENDING IMPLEMENTATION
- **Note**: Crucial features like oad_blockage, ridge_condition, and medical_emergency_count cannot be reliably obtained from external APIs during a chaotic disaster. They must be crowd-sourced/field-sourced. We will build ingestion APIs to accept this data from the planned mobile app. If unavailable, they will be marked as INSUFFICIENT_CONTEXT rather than fabricated.
