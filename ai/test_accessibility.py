import json
from accessibility import AccessibilityIntelligence

def run_demo():
    engine = AccessibilityIntelligence()
    
    # Define 3 demo routes with varying conditions
    routes = [
        {
            "route_id": "Route A (Guwahati to Shillong)",
            "distance": 98,
            "road_condition": 2,      # Good roads
            "terrain_difficulty": 5,  # Hilly
            "rainfall_severity": 3,   # Light rain
            "flood_risk": 1,          # Low
            "landslide_risk": 3,      # Moderate
            "road_blockage": 0,       # Clear
            "connectivity": 2         # Good connection
        },
        {
            "route_id": "Route B (Silchar to Haflong)",
            "distance": 105,
            "road_condition": 7,      # Potholes, damaged
            "terrain_difficulty": 8,  # Steep mountainous
            "rainfall_severity": 8,   # Heavy monsoon
            "flood_risk": 4,          # Moderate
            "landslide_risk": 9,      # High landslide risk zone
            "road_blockage": 4,       # Partial blockage
            "connectivity": 8         # Poor network
        },
        {
            "route_id": "Route C (Kaziranga Highway)",
            "distance": 50,
            "road_condition": 9,      # Completely washed out
            "terrain_difficulty": 3,  # Flat but flooded
            "rainfall_severity": 10,  # Extreme
            "flood_risk": 10,         # Completely flooded
            "landslide_risk": 0,      # No landslides
            "road_blockage": 10,      # Completely blocked by water
            "connectivity": 5         # Intermittent
        }
    ]
    
    print("=== ResQ-Logix Accessibility Intelligence Demo ===")
    print("Evaluating controlled demo routes for North Eastern Region logistics...\n")
    
    for route in routes:
        result = engine.evaluate_route(route)
        print(f"--- {result['route_id']} ---")
        print(f"Distance: {result['distance_km']} km")
        print(f"Accessibility Score: {result['accessibility_score']}/100")
        print(f"Risk Score: {result['risk_score']}/100")
        print(f"Risk Level: {result['risk_level']}")
        print("Key Factors:")
        for reason in result['reasons']:
            print(f"  - {reason}")
        print("\n")

if __name__ == "__main__":
    run_demo()
