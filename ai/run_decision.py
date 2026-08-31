import os
import sys
import json

os.environ['LOGISTICS_API_URL'] = "http://localhost:3000"

# Redirect stdout to stderr to prevent stray prints from breaking JSON parsing in Node
original_stdout = sys.stdout
sys.stdout = sys.stderr

from logistics_adapter import LogisticsContextAdapter
from decision_engine import ResQDecisionEngine

def main():
    if len(sys.argv) < 2:
        original_stdout.write(json.dumps({"error": "Missing request_id argument"}) + "\n")
        sys.exit(1)
        
    req_id = sys.argv[1]
    
    adapter = LogisticsContextAdapter()
    
    try:
        vehicles = adapter.get_vehicles()
        warehouses = adapter.get_warehouses()
        resources = adapter.get_resources()
        req = adapter.get_request(req_id)
    except Exception as e:
        original_stdout.write(json.dumps({"error": str(e)}) + "\n")
        sys.exit(1)
        
    if 'context' not in req:
        req['context'] = {
            "population": 8500,
            "sos_count": 34,
            "medical_emergency_count": 18,
            "medicine_supply_days_remaining": 1,
            "food_supply_days_remaining": 2,
            "distance_km": 120,
            "road_condition": 8,
            "terrain_difficulty": 9,
            "rainfall_mm": 150,
            "flood_risk": 7,
            "landslide_risk": 8,
            "road_blockage": 7,
            "connectivity": 8,
            "elevation_change_m": 800,
            "bridge_condition": 6,
            "weather_severity": 8,
            "disaster_severity": 9
        }
        
    engine = ResQDecisionEngine()
    try:
        result = engine.recommend(req, vehicles, warehouses, resources)
        original_stdout.write(json.dumps(result) + "\n")
    except Exception as e:
        original_stdout.write(json.dumps({"error": f"Decision Engine crashed: {str(e)}"}) + "\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
