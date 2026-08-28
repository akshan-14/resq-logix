import os
import joblib
import pandas as pd
import numpy as np

class AccessibilityMLModel:
    def __init__(self):
        self.models_dir = os.path.join(os.path.dirname(__file__), 'models')
        self.clf_path = os.path.join(self.models_dir, 'risk_classifier.joblib')
        self.reg_path = os.path.join(self.models_dir, 'accessibility_regressor.joblib')
        self.features_path = os.path.join(self.models_dir, 'features.joblib')
        
        self.clf_model = None
        self.reg_model = None
        self.features = None
        
        self._load_models()
        
    def _load_models(self):
        if os.path.exists(self.clf_path) and os.path.exists(self.reg_path):
            self.clf_model = joblib.load(self.clf_path)
            self.reg_model = joblib.load(self.reg_path)
            self.features = joblib.load(self.features_path)
        else:
            raise FileNotFoundError("Trained models not found. Run train_model.py first.")
            
    def _extract_feature_importances(self, df_input):
        # Tree-based models expose feature_importances_ in the final estimator
        estimator = self.clf_model.named_steps['classifier']
        importances = estimator.feature_importances_
        
        # Sort features by importance
        feature_importance_pairs = list(zip(self.features, importances))
        feature_importance_pairs.sort(key=lambda x: x[1], reverse=True)
        
        # We only return the top factors that are actually present/high in the input
        # For simplicity in this demo, return top 3 overall importance factors
        top_reasons = []
        for feature, imp in feature_importance_pairs[:4]:
            val = df_input.iloc[0][feature]
            if val > 0: # Contextualize if it's contributing
                clean_name = feature.replace('_', ' ').title()
                top_reasons.append(f"{clean_name} (Model feature importance: {imp:.2f})")
                
        if not top_reasons:
            top_reasons.append("Model determined based on general patterns.")
            
        return top_reasons
        
    def predict(self, route_data):
        # 1. Validate and fill missing inputs with defaults
        if not isinstance(route_data, dict):
            raise ValueError("Input must be a dictionary")
            
        processed_data = {}
        for feature in self.features:
            val = route_data.get(feature, 0) # default to 0 if missing
            if val < 0: val = 0 # safety cap
            processed_data[feature] = val
            
        df = pd.DataFrame([processed_data])
        
        # 2. OPERATIONAL SAFETY RULE (Overrides ML)
        # If road is completely blocked, we don't need ML to tell us it's critical.
        if processed_data.get('road_blockage', 0) >= 10:
            return {
                "accessibility_score": 0,
                "risk_level": "CRITICAL",
                "risk_probabilities": {"LOW": 0.0, "MEDIUM": 0.0, "HIGH": 0.0, "CRITICAL": 1.0},
                "reasons": ["OPERATIONAL OVERRIDE: Route is completely blocked (Road Blockage = 10)"]
            }
            
        # 3. ML Inference
        try:
            # Accessibility Score Regression
            acc_score = self.reg_model.predict(df)[0]
            acc_score = max(0, min(100, round(acc_score)))
            
            # Risk Level Classification
            risk_level = self.clf_model.predict(df)[0]
            
            # Probabilities
            probs = self.clf_model.predict_proba(df)[0]
            classes = self.clf_model.classes_
            prob_dict = {cls: round(float(prob), 4) for cls, prob in zip(classes, probs)}
            
            # Explainability
            reasons = self._extract_feature_importances(df)
            
            return {
                "accessibility_score": acc_score,
                "risk_level": risk_level,
                "risk_probabilities": prob_dict,
                "reasons": reasons
            }
            
        except Exception as e:
            return {
                "accessibility_score": 0,
                "risk_level": "CRITICAL",
                "risk_probabilities": {},
                "reasons": [f"Error during ML inference: {str(e)}"]
            }

if __name__ == "__main__":
    # Quick test
    try:
        model = AccessibilityMLModel()
        res = model.predict({
            "distance_km": 65,
            "road_condition": 7,
            "terrain_difficulty": 8,
            "rainfall_mm": 120,
            "flood_risk": 7,
            "landslide_risk": 9,
            "road_blockage": 3,
            "connectivity": 5,
            "elevation_change_m": 850
        })
        print(res)
    except Exception as e:
        print(e)
