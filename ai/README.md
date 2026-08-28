# Accessibility ML Intelligence Engine

This module contains the Machine Learning pipeline for predicting route accessibility and risk levels in the North Eastern Region. It is designed to integrate with the Logistics Management Module to allocate resources based on road, weather, and disaster conditions.

## ⚠️ Synthetic Prototype Disclaimer
**IMPORTANT:** The ML models in this repository are currently trained on **synthetic prototype data** (`ai/data/accessibility_training.csv`). The synthetic dataset was generated using non-linear interactions, polynomials, and noise to approximate real-world behavior for hackathon demonstration purposes. 
- Do NOT claim this model is trained on real government data.
- Real-world deployment requires retraining the model on historical road, weather, terrain, and disaster datasets.

## Dataset
- **Phase 4 (Accessibility)**: 1500 rows. Features: `distance_km`, `road_condition`, `terrain_difficulty`, etc.
- **Phase 5 (Priority/Demand)**: 2500 rows. Features: `population`, `sos_count`, `medical_emergency_count`, `medicine_supply_days_remaining`, `accessibility_score`, etc.
- **Target Variables**: 
  - `accessibility_score` & `priority_score` (Regression: 0-100)
  - `risk_level` & `priority_level` (Classification: LOW, MEDIUM, HIGH, CRITICAL)

## Training Pipeline
The training pipelines (`train_model.py` and `train_priority_model.py`):
1. Loads the CSV and handles missing values/scaling via Scikit-Learn `Pipeline`.
2. Splits data into 80% train / 20% unseen test sets.
3. Compares **RandomForestClassifier** vs **GradientBoostingClassifier**.
4. Selects the best classification model based on the weighted F1-score.
5. Trains a **RandomForestRegressor** for the numerical scores.
6. Saves the trained models in `ai/models/` using `joblib`.

## Inference & Operational Safety
The inference classes (`AccessibilityMLModel` and `PriorityIntelligenceModel`) handle:
- **ML Prediction**: Outputs the predicted level, probability distribution, and numerical score.
- **Explainability**: Extracts the model's `feature_importances_` to explain which factors drove the prediction.
- **Operational Overrides**: 
  - *Accessibility*: If `road_blockage` is `10`, bypasses ML and returns `CRITICAL`.
  - *Priority*: If medical emergencies are high and medicine is low, bypasses ML and returns `CRITICAL`.

## How to Run

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```
2. **Generate Synthetic Data**
   ```bash
   python generate_synthetic_data.py
   python generate_priority_data.py
   ```
3. **Train Models**
   ```bash
   python train_model.py
   python train_priority_model.py
   ```
4. **Run Inference Demos**
   ```bash
   python test_ml_accessibility.py
   python test_ml_priority.py
   ```

## Future Real Data Integration
For production, the synthetic dataset will be replaced by a live data ingestion pipeline combining:
- Real Road Data (Mapbox / Google Maps)
- Real Weather Data (IMD API)
- Historical Disaster Data
- Crowdsourced Mesh Data (from the ResQ-Logix BLE nodes)

## Phase 6: AI Decision & Dispatch Recommendation Engine
Phase 6 brings the intelligence together into a deterministic optimization engine.
It takes:
- **Phase 4 Accessibility** (Risk and Score)
- **Phase 5 Priority** (Level and Score)
- **Logistics Context** (Vehicles, Warehouses, Inventory, Requests via `LogisticsContextAdapter`)

And outputs a transparent, explainable **Recommendation** containing:
- Selected feasible Warehouse
- Selected feasible Vehicle
- Decision constraints and warnings
- Await Human Approval flag

**Note**: Phase 6 is an operational constraint engine, NOT another ML model. It does not automatically dispatch resources, but rather recommends actions for human approval.
