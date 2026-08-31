# Historical Disaster Data Sources

This document evaluates authoritative sources for constructing a real historical training dataset for Northern India (Himachal Pradesh, Uttarakhand, J&K).

## 1. National Disaster Management Authority (NDMA)
- **Official Source**: NDMA / MHA India
- **URL**: ndma.gov.in
- **Geographic Coverage**: India
- **Available Variables**: Disaster situational reports, state-wise casualties, damages.
- **File Format**: PDF Reports
- **Limitations**: Data is trapped in unstructured PDFs. Does not provide a machine-readable CSV/GeoJSON of exact coordinate-level road blockages or bridge failures.
- **ML Label Suitability**: INSUFFICIENT. Cannot programmatically extract thousands of `y_route_blocked` coordinates without NLP/manual digitization.

## 2. ISRO / NRSC Bhuvan Disaster Services
- **Official Source**: ISRO
- **URL**: bhuvan-app1.nrsc.gov.in/disaster
- **Geographic Coverage**: India
- **Available Variables**: Inundation maps, landslide locations (historical).
- **File Format**: WMS / Shapefiles (Restricted)
- **Limitations**: Highly authoritative, but raw spatial event vectors (exact time and coordinate of road failure) are restricted to government agencies and not open for programmatic API bulk download.
- **ML Label Suitability**: PARTIAL / INSUFFICIENT. Without API access to the underlying event database, we cannot map historical routes to failures.

## 3. Humanitarian Data Exchange (HDX)
- **Official Source**: UNOCHA
- **URL**: data.humdata.org
- **Geographic Coverage**: Global
- **Available Variables**: Displaced persons, structural damage points (UNITAR).
- **File Format**: CSV, SHP, GeoJSON
- **Limitations**: Often provides administrative-level aggregates (e.g., "Uttarkashi District: 500 displaced"). Point-level road blockage datasets are extremely rare and event-specific.
- **ML Label Suitability**: INSUFFICIENT for continuous route-risk modeling.

## 4. EM-DAT (International Disaster Database)
- **Official Source**: CRED
- **URL**: emdat.be
- **Geographic Coverage**: Global
- **Available Variables**: Disaster start/end dates, total deaths, total affected.
- **File Format**: CSV/Excel
- **Limitations**: No spatial coordinates for specific roads or bridges. Only country/state level aggregates.
- **ML Label Suitability**: INSUFFICIENT.

## 5. xView2 Challenge Dataset
- **Official Source**: DIUx
- **URL**: xview2.org
- **Available Variables**: Pre/post disaster satellite imagery, building damage polygons.
- **Limitations**: Focuses on building damage, not mountain road blockages.
- **ML Label Suitability**: INSUFFICIENT for Route Risk.
