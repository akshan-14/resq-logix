import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, RandomForestRegressor
from sklearn.metrics import classification_report, f1_score, mean_absolute_error, mean_squared_error, r2_score, confusion_matrix

def train_and_evaluate():
    print("=== ResQ-Logix ML Training Pipeline ===")
    
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'accessibility_training.csv')
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}. Please run generate_synthetic_data.py first.")
        return
        
    df = pd.read_csv(data_path)
    print(f"Loaded dataset with {len(df)} rows.")
    
    # Features and targets
    features = [
        'distance_km', 'road_condition', 'terrain_difficulty', 'rainfall_mm',
        'flood_risk', 'landslide_risk', 'road_blockage', 'connectivity',
        'elevation_change_m', 'bridge_condition', 'population_density', 'weather_severity'
    ]
    
    X = df[features]
    y_class = df['risk_level']
    y_reg = df['accessibility_score']
    
    # Train-test split
    X_train, X_test, y_class_train, y_class_test, y_reg_train, y_reg_test = train_test_split(
        X, y_class, y_reg, test_size=0.2, random_state=42
    )
    
    # Preprocessing
    # We'll use SimpleImputer for missing values and StandardScaler (though tree models don't strictly need it, good for pipeline)
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, features)
        ]
    )
    
    # --- Classification Model (Risk Level) ---
    print("\n--- Training Classification Models ---")
    
    # Model 1: Random Forest
    rf_clf = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced'))
    ])
    rf_clf.fit(X_train, y_class_train)
    rf_preds = rf_clf.predict(X_test)
    rf_f1 = f1_score(y_class_test, rf_preds, average='weighted')
    
    # Model 2: Gradient Boosting
    gb_clf = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', GradientBoostingClassifier(n_estimators=100, random_state=42))
    ])
    gb_clf.fit(X_train, y_class_train)
    gb_preds = gb_clf.predict(X_test)
    gb_f1 = f1_score(y_class_test, gb_preds, average='weighted')
    
    print(f"RandomForestClassifier Weighted F1-Score: {rf_f1:.4f}")
    print(f"GradientBoostingClassifier Weighted F1-Score: {gb_f1:.4f}")
    
    # Select best model based on F1-score
    best_clf = rf_clf if rf_f1 >= gb_f1 else gb_clf
    best_clf_name = "RandomForestClassifier" if rf_f1 >= gb_f1 else "GradientBoostingClassifier"
    best_preds = rf_preds if rf_f1 >= gb_f1 else gb_preds
    
    print(f"\nSelected Model: {best_clf_name}")
    print("\nClassification Report:")
    print(classification_report(y_class_test, best_preds))
    print("Confusion Matrix:")
    print(confusion_matrix(y_class_test, best_preds))
    
    # --- Regression Model (Accessibility Score) ---
    print("\n--- Training Regression Model ---")
    reg_model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    
    reg_model.fit(X_train, y_reg_train)
    reg_preds = reg_model.predict(X_test)
    
    print(f"MAE:  {mean_absolute_error(y_reg_test, reg_preds):.4f}")
    print(f"RMSE: {np.sqrt(mean_squared_error(y_reg_test, reg_preds)):.4f}")
    print(f"R²:   {r2_score(y_reg_test, reg_preds):.4f}")
    
    # Save models
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    joblib.dump(best_clf, os.path.join(models_dir, 'risk_classifier.joblib'))
    joblib.dump(reg_model, os.path.join(models_dir, 'accessibility_regressor.joblib'))
    # Save feature names for explainability
    joblib.dump(features, os.path.join(models_dir, 'features.joblib'))
    
    print("\nModels successfully trained and saved to ai/models/")

if __name__ == "__main__":
    train_and_evaluate()
