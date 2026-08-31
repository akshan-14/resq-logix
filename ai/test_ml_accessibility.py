import json
from predict_accessibility import AccessibilityMLModel

def run_tests():
    print("\n=== ResQ-Logix ML Inference Demonstration ===")
    
    try:
        model = AccessibilityMLModel()
    except Exception as e:
        print(f"Failed to load ML model: {e}")
        return

    scenarios = [
        {
            "name": "1. Good Route (Clear Highway)",
            "data": {
                "distance_km": 120, "road_condition": 1, "terrain_difficulty": 1,
                "rainfall_mm": 0, "flood_risk": 0, "landslide_risk": 0,
                "road_blockage": 0, "connectivity": 1, "elevation_change_m": 50,
                "bridge_condition": 1, "population_density": 500, "weather_severity": 0
            }
        },
        {
            "name": "2. Mountainous Monsoon Route",
            "data": {
                "distance_km": 85, "road_condition": 6, "terrain_difficulty": 9,
                "rainfall_mm": 180, "flood_risk": 5, "landslide_risk": 8,
                "road_blockage": 4, "connectivity": 6, "elevation_change_m": 1200,
                "bridge_condition": 5, "population_density": 100, "weather_severity": 7
            }
        },
        {
            "name": "3. Completely Blocked Route (Operational Override)",
            "data": {
                "distance_km": 40, "road_condition": 8, "terrain_difficulty": 5,
                "rainfall_mm": 50, "flood_risk": 2, "landslide_risk": 3,
                "road_blockage": 10,  # CRITICAL THRESHOLD
                "connectivity": 8, "elevation_change_m": 300,
                "bridge_condition": 9, "population_density": 200, "weather_severity": 3
            }
        },
        {
            "name": "4. Missing/Invalid Input (Negative/Missing handled)",
            "data": {
                "distance_km": -50, # Invalid negative
                "road_condition": 4,
                # Missing flood_risk, terrain_difficulty, etc.
                "rainfall_mm": 20
            }
        },
        {
            "name": "5. Borderline Medium-Risk Route",
            "data": {
                "distance_km": 150, "road_condition": 4, "terrain_difficulty": 4,
                "rainfall_mm": 60, "flood_risk": 3, "landslide_risk": 2,
                "road_blockage": 1, "connectivity": 3, "elevation_change_m": 400,
                "bridge_condition": 2, "population_density": 1000, "weather_severity": 4
            }
        }
    ]

    for scenario in scenarios:
        print(f"\n--- {scenario['name']} ---")
        print(f"Input: {json.dumps(scenario['data'])}")
        
        result = model.predict(scenario['data'])
        
        print(f"Predicted Accessibility Score: {result['accessibility_score']}/100")
        print(f"Predicted Risk Level: {result['risk_level']}")
        
        if result.get("risk_probabilities"):
            print("Probabilities:")
            for cls, prob in result["risk_probabilities"].items():
                print(f"  {cls}: {prob:.2f}")
                
        print("Reasons/Top Features:")
        for r in result["reasons"]:
            print(f"  - {r}")

if __name__ == "__main__":
    run_tests()
