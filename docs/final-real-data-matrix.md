# Final Real-Data ML Matrix

This matrix tracks the defensible, real-world source for every feature consumed by Phase 4 (Accessibility) and Phase 5 (Priority). 

## Feature Matrix

| Feature | Source | Real/Synthetic | Historical/Live/Static/Derived | Resolution | Unit | Geographic Coverage | Training Use | Inference Use | Status |
|---------|--------|----------------|--------------------------------|------------|------|---------------------|--------------|---------------|--------|
| **Phase 4 Features** | | | | | | | | | |
| `distance_km` | OSRM | Real | Static | Global | km | Global | Yes | Yes | READY |
| `elevation_change_m`| Open-Meteo SRTM | Real | Static | 90m | m | Global | Yes | Yes | READY |
| `rainfall_mm` | Open-Meteo Forecast | Real | Live | ~10km | mm | Global | Yes (ERA5) | Yes (Forecast)| READY |
| `weather_severity` | Open-Meteo Code | Real | Derived | ~10km | WMO Code | Global | Yes | Yes | PARTIAL (Needs code map) |
| `terrain_difficulty`| SRTM DEM | Real | Derived/Static | 90m | Scale | Global | Yes | Yes | NEEDS DATASET (Slope calculation logic) |
| `road_condition` | OSM surface tags | Real | Static | Way/Segment| Paved/Unpaved | Global | Yes | Yes | PARTIAL (OSM parsing needed) |
| `population_density`| WorldPop GeoTIFF | Real | Static | 100m-1km | people/km2| Global | Yes | Yes | NEEDS DATASET |
| `flood_risk` | NDEM / Copernicus | Real | Static Hazard | Variable | 0-1 Risk | Regional/Global | Yes | Yes | NEEDS DATASET |
| `landslide_risk` | GSI / ISRO Susceptibility| Real | Static Hazard | Variable | 0-1 Risk | India / Global | Yes | Yes | NEEDS DATASET |
| `road_blockage` | ResQ App / Field DB | Real | Live Field Obs | Point | Boolean | App Deployment Area | No (Simulated) | Yes | NEEDS FIELD APP |
| `bridge_condition` | ResQ App / Field DB | Real | Live Field Obs | Point | Boolean | App Deployment Area | No (Simulated) | Yes | NEEDS FIELD APP |
| `connectivity` | OpenCelliD / Field DB | Real | Static + Live | Grid/Point | Boolean | Global | Yes | Yes | PARTIAL |
| **Phase 5 Features** | | | | | | | | | |
| `affected_population`| WorldPop + Hazard Extent| Real | Derived | 100m | people | Global | Yes | Yes | NEEDS DATASET |
| `sos_count` | ResQ Logistics DB | Real | Live Field Obs | Point | count | System Wide | Yes | Yes | READY |
| `medical_emergency_count`| ResQ Logistics DB | Real | Live Field Obs | Point | count | System Wide | Yes | Yes | READY |
| `injured_people` | ResQ App / Field DB | Real | Live Field Obs | Point | count | App Deployment Area | Yes (HDX) | Yes | NEEDS FIELD APP |
| `food_supply_days_remaining`| ResQ Logistics DB | Real | Derived Field | Warehouse| days | System Wide | Yes | Yes | READY (Inventory logic needed)|
| `distance_to_nearest_hospital_km`| OSM Amenities | Real | Derived Static | Point | km | Global | Yes | Yes | NEEDS DATASET (OSM Overpass) |

## Satellite Data Possibilities
- **xView2**: Excellent for providing historical training labels (building damage scoring) via pre/post disaster imagery.
- **ISRO Bhuvan / NRSC**: Provides excellent landslide susceptibility maps for India. Highly suitable for the `landslide_risk` static feature. Not feasible for live REST API ingestion during an active event.
- **Copernicus EMS**: Provides post-disaster inundation mapping. Good for historical `flood_risk` baselines, but live access is restricted to authorized emergency management agencies.

## Training Data Requirements
The ML Models must be retrained on datasets that match the shape and variance of these real data sources. For example, `population_density` must be fed actual raster values (e.g., 2500 people/km2) rather than synthetic 0-10 arrays. Target labels (`accessibility_score` and `priority_score`) must be curated from actual historical disaster response logs (e.g., time to reach destination, mortality rates due to delayed response) rather than calculated via arbitrary formulas.
