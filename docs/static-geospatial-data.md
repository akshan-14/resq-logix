# Static Geospatial Data Specifications

This document outlines the authoritative static geospatial datasets necessary for extracting ML features in ResQ-Logix for Northern mountainous India. 

## 1. WORLDPOP (Population Density)
- **SOURCE**: WorldPop Project (University of Southampton)
- **OFFICIAL URL**: https://data.worldpop.org/GIS/Population/Global_2000_2020/2020/IND/
- **DATASET NAME**: `ind_ppp_2020_UNadj.tif` (Unconstrained People Per Pixel)
- **YEAR**: 2020
- **RESOLUTION**: 3 arc-seconds (~100m at equator)
- **GEOGRAPHIC COVERAGE**: India (Regional subset recommended for HP, UK, J&K)
- **FORMAT**: GeoTIFF
- **LICENSE**: CC-BY 4.0
- **ACCESS METHOD**: Bulk Download (HTTP/FTP)
- **FEATURES**: `population_spatial_density`, `population_within_5km`
- **LIMITATIONS**: Static 2020 estimates. Does not track seasonal migration.
- **HISTORICAL/LIVE/STATIC**: STATIC
- **ML USE**: Replaces Phase 4 administrative population with spatial density.

## 2. DEM / SRTM (Terrain & Elevation)
- **SOURCE**: NASA JPL / Open-Meteo SRTM
- **OFFICIAL URL**: https://lpdaac.usgs.gov/products/srtmgl3v003/
- **DATASET NAME**: SRTMGL3 (SRTM 90m Digital Elevation Model)
- **YEAR**: 2000 (Last updated 2013)
- **RESOLUTION**: 3 arc-seconds (~90m)
- **GEOGRAPHIC COVERAGE**: Global (Northern India subset)
- **FORMAT**: GeoTIFF (HGT)
- **LICENSE**: Public Domain
- **ACCESS METHOD**: USGS EarthExplorer / Bulk Download
- **FEATURES**: `elevation_m`, `slope_degrees`, `terrain_ruggedness_std`
- **LIMITATIONS**: Can suffer from voids in extremely steep Himalayan ravines.
- **HISTORICAL/LIVE/STATIC**: STATIC
- **ML USE**: Calculates derived slope to replace synthetic `terrain_difficulty`.

## 3. ISRO/NRSC (Landslide Susceptibility)
- **SOURCE**: ISRO / NRSC / Bhuvan
- **OFFICIAL URL**: https://bhuvan-app1.nrsc.gov.in/disaster/disaster.php
- **DATASET NAME**: ISRO Landslide Susceptibility Zonation
- **YEAR**: 2023 (Atlas)
- **RESOLUTION**: Variable (Typically 1:50,000 scale / ~15m-30m rasterized)
- **GEOGRAPHIC COVERAGE**: Himalayan Region, Western Ghats
- **FORMAT**: GeoTIFF / WMS
- **LICENSE**: Restricted (Government use / non-commercial)
- **ACCESS METHOD**: Bhuvan Portal (Manual download or requested API access)
- **FEATURES**: `historical_landslide_susceptibility`
- **LIMITATIONS**: Does not indicate *current* landslides, only geological vulnerability.
- **HISTORICAL/LIVE/STATIC**: HISTORICAL RISK (STATIC)
- **ML USE**: Baseline hazard constraint for routing.

## 4. FLOODS (Copernicus / NDEM)
- **SOURCE**: Copernicus Emergency Management Service (EMS) / NDEM India
- **OFFICIAL URL**: https://emergency.copernicus.eu/
- **DATASET NAME**: Global Flood Hazard Map
- **YEAR**: Periodically Updated
- **RESOLUTION**: ~100m
- **GEOGRAPHIC COVERAGE**: Global / India
- **FORMAT**: GeoTIFF
- **LICENSE**: Open Data (Copernicus)
- **ACCESS METHOD**: Copernicus Open Access Hub
- **FEATURES**: `historical_flood_susceptibility`
- **LIMITATIONS**: Highly dependent on historical basin modeling. Misses flash floods in unmapped narrow gorges.
- **HISTORICAL/LIVE/STATIC**: HISTORICAL RISK (STATIC)
- **ML USE**: Baseline inundation hazard.

## 5. LAND-USE / LAND-COVER (LULC)
- **SOURCE**: ESA WorldCover / NRSC LULC
- **OFFICIAL URL**: https://esa-worldcover.org/en
- **DATASET NAME**: ESA WorldCover 10m
- **YEAR**: 2021
- **RESOLUTION**: 10m
- **GEOGRAPHIC COVERAGE**: Global
- **FORMAT**: GeoTIFF
- **LICENSE**: CC-BY 4.0
- **ACCESS METHOD**: AWS S3 / Direct Download
- **FEATURES**: `land_cover_class` (Forest, Urban, Water, Bare)
- **LIMITATIONS**: Heavy processing required for 10m global rasters.
- **HISTORICAL/LIVE/STATIC**: STATIC
- **ML USE**: Currently UNAVAILABLE/UNIMPLEMENTED in Phase 4 due to lack of distinct label requirement.

## 6. GEOLOGY / GEOMORPHOLOGY
- **SOURCE**: Geological Survey of India (GSI)
- **OFFICIAL URL**: https://bhukosh.gsi.gov.in/Bhukosh/MapViewer.aspx
- **DATASET NAME**: Lithology and Fault Lines 1:50k
- **YEAR**: Ongoing
- **RESOLUTION**: 1:50,000 scale vector
- **GEOGRAPHIC COVERAGE**: India
- **FORMAT**: Shapefile (SHP) / GeoJSON
- **LICENSE**: Restricted (GSI terms)
- **ACCESS METHOD**: Bhukosh Portal manual request
- **FEATURES**: Fault proximity, rock type.
- **LIMITATIONS**: Highly inaccessible programmatically.
- **HISTORICAL/LIVE/STATIC**: STATIC
- **ML USE**: UNAVAILABLE.

## 7. OPENSTREETMAP (Static Infrastructure)
- **SOURCE**: OSM Foundation
- **OFFICIAL URL**: https://planet.openstreetmap.org/
- **DATASET NAME**: India OSM Extract (Geofabrik)
- **YEAR**: Live / Daily
- **RESOLUTION**: Vector precision
- **GEOGRAPHIC COVERAGE**: India
- **FORMAT**: PBF / GeoJSON via Overpass
- **LICENSE**: ODbL
- **ACCESS METHOD**: Geofabrik Download / Overpass API
- **FEATURES**: `road_surface` (paved/unpaved), `bridge_exists`.
- **LIMITATIONS**: Crowd-sourced; rural Himalayan roads often lack `surface` tags.
- **HISTORICAL/LIVE/STATIC**: STATIC (Regularly updated)
- **ML USE**: Replaces synthetic road condition (future implementation).

## 8. WEATHER (IMD / ERA5)
- **SOURCE**: ECMWF / Copernicus (ERA5) and IMD
- **OFFICIAL URL**: https://cds.climate.copernicus.eu/
- **DATASET NAME**: ERA5 Hourly Data on Single Levels
- **YEAR**: 1979 - Present
- **RESOLUTION**: ~31km
- **GEOGRAPHIC COVERAGE**: Global
- **FORMAT**: NetCDF / GRIB
- **LICENSE**: Copernicus Open Data
- **ACCESS METHOD**: CDS API
- **FEATURES**: `historical_rainfall_mm`, `historical_weathercode`
- **LIMITATIONS**: 31km resolution is too coarse for precise mountain valley micro-climates, but best available for historical baselines.
- **HISTORICAL/LIVE/STATIC**: HISTORICAL (For Training) / LIVE (Open-Meteo for Inference)
- **ML USE**: Mandatory for generating the new training datasets for Phase 4.
