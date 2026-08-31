# Training Data Leakage Analysis

Data leakage occurs when the ML model is trained with features that contain information from the future (post-event) or information that inadvertently gives away the target label.

## Strict Feature Separation
1. **Prediction-Time Features**: Features that would be known *at the moment of prediction*.
   - Live Rainfall Forecast
   - Static Terrain (Slope, Elevation)
   - Static Geological Hazard (Landslide Susceptibility)
   - Spatial Population

2. **Post-Event Labels (The Target)**:
   - Route Blocked (True/False)
   - Bridge Collapsed (True/False)

## Critical Leakage Avoidance
If we were able to obtain a dataset of historical road closures, we MUST NOT include `road_blockage_reported` as an input feature if the target is `predict_route_risk`. 

Additionally, we cannot use post-disaster satellite imagery (e.g., Copernicus inundation maps captured 2 days *after* the storm) as an input feature for predicting the flood. Inputs must be strictly limited to pre-event static datasets and time-aligned weather observations.
