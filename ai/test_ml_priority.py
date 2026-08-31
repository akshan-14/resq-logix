import json
from predict_priority import PriorityIntelligenceModel
from predict_accessibility import AccessibilityMLModel

def run_tests():
    print("\n=== ResQ-Logix ML Demand & Priority Inference ===")
    
    try:
        model = PriorityIntelligenceModel()
        acc_model = AccessibilityMLModel() # For Phase 4 integration demo
    except Exception as e:
        print(f"Failed to load ML models: {e}")
        return

    scenarios = [
        {
            "name": "1. Normal Low-Demand Location",
            "data": {
                "population": 1200, "population_density": 50, "vulnerable_population": 100,
                "sos_count": 0, "medical_emergency_count": 0, "injured_people": 0,
                "food_supply_days_remaining": 14, "water_supply_days_remaining": 14,
                "medicine_supply_days_remaining": 14, "shelter_demand": 0,
                "distance_to_nearest_hospital_km": 15, "distance_to_nearest_warehouse_km": 30,
                "accessibility_score": 90, "accessibility_risk": 10,
                "rainfall_mm": 10, "flood_risk": 0, "landslide_risk": 0,
                "weather_severity": 1, "road_blockage": 0, "connectivity": 1,
                "disaster_severity": 0, "request_age_hours": 2
            }
        },
        {
            "name": "2. Moderate Supply Shortage",
            "data": {
                "population": 4500, "population_density": 120, "vulnerable_population": 500,
                "sos_count": 2, "medical_emergency_count": 1, "injured_people": 2,
                "food_supply_days_remaining": 4, "water_supply_days_remaining": 6,
                "medicine_supply_days_remaining": 8, "shelter_demand": 50,
                "distance_to_nearest_hospital_km": 40, "distance_to_nearest_warehouse_km": 60,
                "accessibility_score": 60, "accessibility_risk": 40,
                "rainfall_mm": 80, "flood_risk": 3, "landslide_risk": 2,
                "weather_severity": 4, "road_blockage": 2, "connectivity": 3,
                "disaster_severity": 4, "request_age_hours": 12
            }
        },
        {
            "name": "3. High Population + Disaster",
            "data": {
                "population": 45000, "population_density": 800, "vulnerable_population": 8000,
                "sos_count": 85, "medical_emergency_count": 12, "injured_people": 30,
                "food_supply_days_remaining": 3, "water_supply_days_remaining": 2,
                "medicine_supply_days_remaining": 5, "shelter_demand": 1200,
                "distance_to_nearest_hospital_km": 5, "distance_to_nearest_warehouse_km": 15,
                "accessibility_score": 40, "accessibility_risk": 60,
                "rainfall_mm": 150, "flood_risk": 6, "landslide_risk": 4,
                "weather_severity": 6, "road_blockage": 5, "connectivity": 7,
                "disaster_severity": 7, "request_age_hours": 24
            }
        },
        {
            "name": "4. Medical Emergency + Severe Shortage (Operational Override Expected)",
            "data": {
                "population": 3000, "population_density": 60, "vulnerable_population": 400,
                "sos_count": 15, "medical_emergency_count": 22, "injured_people": 25,
                "food_supply_days_remaining": 5, "water_supply_days_remaining": 5,
                "medicine_supply_days_remaining": 1, "shelter_demand": 10,
                "distance_to_nearest_hospital_km": 80, "distance_to_nearest_warehouse_km": 100,
                "accessibility_score": 70, "accessibility_risk": 30,
                "rainfall_mm": 20, "flood_risk": 1, "landslide_risk": 1,
                "weather_severity": 2, "road_blockage": 1, "connectivity": 4,
                "disaster_severity": 3, "request_age_hours": 6
            }
        },
        {
            "name": "5. Critical Disaster + Poor Accessibility (Phase 4 Integration Demo)",
            "data": {
                "population": 8500, "population_density": 90, "vulnerable_population": 1200,
                "sos_count": 34, "medical_emergency_count": 18, "injured_people": 40,
                "food_supply_days_remaining": 2, "water_supply_days_remaining": 1,
                "medicine_supply_days_remaining": 1, "shelter_demand": 500,
                "distance_to_nearest_hospital_km": 120, "distance_to_nearest_warehouse_km": 150,
                
                # These variables come from Phase 4
                "distance_km": 120, "road_condition": 8, "terrain_difficulty": 9,
                "rainfall_mm": 150, "flood_risk": 7, "landslide_risk": 8,
                "road_blockage": 7, "connectivity": 8, "elevation_change_m": 800,
                "bridge_condition": 6, "weather_severity": 8,
                
                "disaster_severity": 9, "request_age_hours": 48
            }
        }
    ]

    for scenario in scenarios:
        print(f"\n--- {scenario['name']} ---")
        
        # Phase 4 Integration logic for scenario 5
        data = scenario['data']
        if "distance_km" in data:
            print("[Phase 4 Integration] Querying Accessibility Intelligence Engine...")
            acc_result = acc_model.predict(data)
            data['accessibility_score'] = acc_result['accessibility_score']
            # Reverse engineer risk for Phase 5 if needed, or define it explicitly:
            data['accessibility_risk'] = 100 - acc_result['accessibility_score']
            print(f"  -> Extracted Phase 4 Accessibility Score: {data['accessibility_score']}")
            
        print("Input Summary:")
        print(f"  Pop: {data.get('population', 0)} | SOS: {data.get('sos_count', 0)} | Med Emergencies: {data.get('medical_emergency_count', 0)}")
        print(f"  Med Supply: {data.get('medicine_supply_days_remaining', 0)} days | Accessibility: {data.get('accessibility_score', 0)}")
        
        result = model.predict(data)
        
        print(f"\nPredicted Priority Score: {result['priority_score']}/100")
        print(f"Predicted Priority Level: {result['priority_level']}")
        
        if result.get("probabilities"):
            print("Probabilities:")
            for cls, prob in result["probabilities"].items():
                print(f"  {cls}: {prob:.2f}")
                
        if result.get("operational_flags"):
            print("OPERATIONAL FLAGS (Safety Overrides):")
            for flag in result["operational_flags"]:
                print(f"  [!] {flag}")
                
        print("\nTop Model Factors (Global Feature Importance, not causation):")
        for r in result["top_factors"]:
            print(f"  - {r}")

if __name__ == "__main__":
    run_tests()
