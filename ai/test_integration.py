import os
import json

# Set environment variable to point to the local backend
os.environ['LOGISTICS_API_URL'] = "http://localhost:3000"

from logistics_adapter import LogisticsContextAdapter
from decision_engine import ResQDecisionEngine

def run_integration_test():
    print("=== ResQ-Logix AI End-to-End Integration Test ===")
    
    adapter = LogisticsContextAdapter()
    print(f"\nAdapter Mode: {adapter.mode}")
    
    if adapter.mode != "LIVE":
        print("FAIL: Adapter did not connect to the LIVE logistics API.")
        return
        
    try:
        vehicles = adapter.get_vehicles()
        warehouses = adapter.get_warehouses()
        resources = adapter.get_resources()
        requests = adapter.get_all_requests()
    except Exception as e:
        print(f"FAIL: Error fetching data from adapter: {e}")
        return
        
    print(f"Fetched {len(vehicles)} vehicles, {len(warehouses)} warehouses, {len(resources)} resources, {len(requests)} requests.")
    
    if len(requests) == 0:
        print("FAIL: No requests available to test.")
        return
        
    req = next((r for r in requests if r.get('request_id') == 'REQ-NER-002'), requests[0])
    req_id = req.get('request_id', 'UNKNOWN')
    print(f"\nSelecting Request: {req_id} for resource {req.get('requested_resource')} ({req.get('quantity')} {req.get('unit')})")
    
    if 'context' not in req:
        print("Notice: Injecting synthetic context for ML compatibility as live API currently lacks it.")
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
    print("\nRunning Decision Engine (Phase 4 -> Phase 5 -> Phase 6)...")
    
    try:
        result = engine.recommend(req, vehicles, warehouses, resources)
    except Exception as e:
        print(f"FAIL: Decision Engine crashed: {e}")
        return
        
    print("\n--- FINAL RECOMMENDATION ---")
    print(json.dumps(result, indent=2))
    
    if result.get("recommendation_status") in ["RECOMMENDATION_READY", "NO_FEASIBLE_WAREHOUSE", "NO_FEASIBLE_VEHICLE"]:
        print("\nPASS: End-to-end integration successful.")
        if result.get("recommendation_status") != "RECOMMENDATION_READY":
            print(f"Note: Rejected due to: {result.get('reasons')}")
    else:
        print("\nFAIL: Unknown recommendation status.")

if __name__ == "__main__":
    run_integration_test()
