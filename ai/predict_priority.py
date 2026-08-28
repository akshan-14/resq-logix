import os
import joblib
import pandas as pd
import numpy as np

class PriorityIntelligenceModel:
    def __init__(self):
        self.models_dir = os.path.join(os.path.dirname(__file__), 'models')
        self.clf_path = os.path.join(self.models_dir, 'priority_classifier.joblib')
        self.reg_path = os.path.join(self.models_dir, 'priority_regressor.joblib')
        self.features_path = os.path.join(self.models_dir, 'priority_feature_metadata.joblib')
        
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
            raise FileNotFoundError("Priority trained models not found. Run train_priority_model.py first.")
            
    def _extract_feature_importances(self):
        # We extract global feature importances for explainability
        estimator = self.clf_model.named_steps['classifier']
        importances = estimator.feature_importances_
        
        feature_importance_pairs = list(zip(self.features, importances))
        feature_importance_pairs.sort(key=lambda x: x[1], reverse=True)
        return feature_importance_pairs
        
    def predict(self, request_data):
        if not isinstance(request_data, dict):
            raise ValueError("Input must be a dictionary")
            
        processed_data = {}
        for feature in self.features:
            val = request_data.get(feature, 0)
            if val is None or pd.isna(val):
                val = 0
            if isinstance(val, (int, float)) and val < 0: 
                val = 0 # safety cap for non-negative requirements
            processed_data[feature] = val
            
        df = pd.DataFrame([processed_data])
        
        # ML Inference
        try:
            acc_score_raw = self.reg_model.predict(df)[0]
            acc_score = max(0, min(100, round(acc_score_raw)))
            
            risk_level = self.clf_model.predict(df)[0]
            
            probs = self.clf_model.predict_proba(df)[0]
            classes = self.clf_model.classes_
            prob_dict = {cls: round(float(prob), 4) for cls, prob in zip(classes, probs)}
            
            # Global Feature Importances
            global_importances = self._extract_feature_importances()
            top_factors = [
                f"{feat.replace('_', ' ').title()} (Model Importance: {imp:.3f})"
                for feat, imp in global_importances[:5]
            ]
            
            # OPERATIONAL SAFETY RULES
            # ML makes predictions based on patterns, but hard operational rules must catch extreme anomalies
            operational_flags = []
            
            if processed_data.get('medical_emergency_count', 0) >= 15 and processed_data.get('medicine_supply_days_remaining', 14) <= 2:
                operational_flags.append("CRITICAL SHORTAGE: High medical emergencies with <= 2 days medicine remaining.")
                # Force critical if operational override applies
                if risk_level not in ["CRITICAL", "HIGH"]:
                    risk_level = "CRITICAL"
                    acc_score = max(acc_score, 90)
                    
            if processed_data.get('road_blockage', 0) >= 9 and processed_data.get('food_supply_days_remaining', 14) <= 1:
                operational_flags.append("ISOLATION STARVATION RISK: Route blocked and food <= 1 day.")
                if risk_level != "CRITICAL":
                    risk_level = "CRITICAL"
                    acc_score = max(acc_score, 95)
                    
            return {
                "priority_score": acc_score,
                "priority_level": risk_level,
                "probabilities": prob_dict,
                "top_factors": top_factors,
                "operational_flags": operational_flags
            }
            
        except Exception as e:
            return {
                "priority_score": 100, # Fail-safe safe fallback for errors
                "priority_level": "CRITICAL",
                "probabilities": {},
                "top_factors": [],
                "operational_flags": [f"Error during ML inference: {str(e)}"]
            }
