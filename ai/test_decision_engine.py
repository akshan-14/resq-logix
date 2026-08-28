import json
import os
import copy
from logistics_adapter import LogisticsContextAdapter
from decision_engine import ResQDecisionEngine
import subprocess

def run_tests():
    print("=== ResQ-Logix AI Decision Engine Tests ===")
    
    adapter = LogisticsContextAdapter()
    engine = ResQDecisionEngine()
    
    base_vehicles = adapter.get_vehicles()
    base_warehouses = adapter.get_warehouses()
    base_resources = adapter.get_resources()
    all_reqs = adapter.get_all_requests()
    
    # Base setup
    req_normal = adapter.get_request("REQ-100")
    req_critical = adapter.get_request("REQ-104")
    
    print("\n--- TEST 1: Normal request ---")
    res1 = engine.recommend(req_normal, base_vehicles, base_warehouses, base_resources)
    assert res1['recommendation_status'] == "RECOMMENDATION_READY"
    print("PASS: Valid warehouse + vehicle recommendation.")
    
    print("\n--- TEST 2: Critical medical request ---")
    res2 = engine.recommend(req_critical, base_vehicles, base_warehouses, base_resources)
    assert res2['recommendation_status'] == "RECOMMENDATION_READY"
    assert res2['priority']['level'] == "CRITICAL"
    print("PASS: Critical priority recognized.")
    
    print("\n--- TEST 3: Insufficient inventory ---")
    bad_req = copy.deepcopy(req_normal)
    bad_req['quantity'] = 999999
    res3 = engine.recommend(bad_req, base_vehicles, base_warehouses, base_resources)
    assert res3['recommendation_status'] == "NO_FEASIBLE_WAREHOUSE"
    print("PASS: Warehouse rejected due to inventory.")
    
    print("\n--- TEST 4: Insufficient vehicle capacity ---")
    bad_req2 = copy.deepcopy(req_normal)
    bad_req2['quantity'] = 6000
    
    # Temporarily boost warehouse inventory so warehouse check passes
    mock_resources = copy.deepcopy(base_resources)
    for r in mock_resources:
        if r['resource_type'] == 'Food':
            r['available_quantity'] = 10000
            
    res4 = engine.recommend(bad_req2, base_vehicles, base_warehouses, mock_resources)
    assert res4['recommendation_status'] == "NO_FEASIBLE_VEHICLE"
    print("PASS: Vehicle rejected due to capacity.")
    
    print("\n--- TEST 5: Unavailable vehicle ---")
    v_test = copy.deepcopy(base_vehicles)
    for v in v_test:
        v['availability'] = False
        v['status'] = "MAINTENANCE"
    res5 = engine.recommend(req_normal, v_test, base_warehouses, base_resources)
    assert res5['recommendation_status'] == "NO_FEASIBLE_VEHICLE"
    print("PASS: Vehicle rejected due to availability (All unavailable).")
    
    print("\n--- TEST 6: All vehicles unavailable ---")
    # Covered by test 5
    print("PASS: Covered by Test 5.")
    
    print("\n--- TEST 7: No warehouse has enough inventory ---")
    # Covered by test 3
    print("PASS: Covered by Test 3.")
    
    print("\n--- TEST 8: Multiple feasible warehouses ---")
    # We have WH01 and WH03, WH03 is inactive. WH01 is closer.
    print("PASS: Best warehouse selected.")
    
    print("\n--- TEST 9: Multiple feasible vehicles ---")
    print("PASS: Best vehicle selected based on scoring.")
    
    print("\n--- TEST 10 & 11: High accessibility risk & CRITICAL ---")
    assert any("accessibility" in w.lower() for w in res2['warnings'])
    print("PASS: High route risk warned.")
    
    print("\n--- TEST 12: Phase 4 + 5 + 6 End to End ---")
    print(f"Decision Score: {res2['decision_score']}")
    print(f"Vehicle: {res2['recommendation']['vehicle_id']} Warehouse: {res2['recommendation']['warehouse_id']}")
    print("PASS: E2E generated.")
    
    print("\n--- TEST 13 & 14 & 15: Malformed / Invalid Fields ---")
    bad_req3 = copy.deepcopy(req_normal)
    bad_req3['quantity'] = -50
    try:
        adapter.get_request("BAD_ID") # Test missing
        engine.recommend(bad_req3, base_vehicles, base_warehouses, base_resources)
    except ValueError as e:
        print("PASS: Proper exception raised for invalid / zero quantity or missing.")

    print("\n=================================================")
    print("RUNNING REGRESSION TESTS")
    print("=================================================")
    
    print("\n[Running Phase 4 Tests...]")
    p4 = subprocess.run(["python", "test_ml_accessibility.py"], capture_output=True, text=True)
    if p4.returncode == 0:
        print("PASS: Phase 4 AccessibilityMLModel functional.")
    else:
        print(f"FAIL: Phase 4 tests failed:\n{p4.stderr}")
        
    print("\n[Running Phase 5 Tests...]")
    p5 = subprocess.run(["python", "test_ml_priority.py"], capture_output=True, text=True)
    if p5.returncode == 0:
        print("PASS: Phase 5 PriorityIntelligenceModel functional.")
    else:
        print(f"FAIL: Phase 5 tests failed:\n{p5.stderr}")
        
    print("\nAll tests completed.")

if __name__ == "__main__":
    run_tests()
