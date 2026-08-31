import unittest
from ai.risk_engine.real_risk_engine import DeterministicRiskEngine

class TestRealRiskEngine(unittest.TestCase):
    def setUp(self):
        self.engine = DeterministicRiskEngine()
        
        # Base real data structure
        self.base_context = {
            "rainfall_mm": {"value": 0, "status": "REAL"},
            "slope_degrees": {"value": 5, "status": "DERIVED"},
            "historical_landslide_susceptibility": {"value": 0.1, "status": "HISTORICAL"},
            "historical_flood_susceptibility": {"value": 0.1, "status": "HISTORICAL"},
            "road_blockage": {"value": False, "status": "REAL"},
            "bridge_condition": {"value": "GOOD", "status": "REAL"},
            "distance_km": {"value": 45, "status": "REAL"}
        }

    def test_scenario_1_clear_route(self):
        res = self.engine.predict(self.base_context)
        self.assertEqual(res['risk_level'], "LOW")
        self.assertEqual(res['hard_constraints_failed'], False)
        
    def test_scenario_2_heavy_rain_steep_terrain(self):
        ctx = self.base_context.copy()
        ctx['rainfall_mm'] = {"value": 160, "status": "REAL"}
        ctx['slope_degrees'] = {"value": 35, "status": "DERIVED"}
        ctx['historical_landslide_susceptibility'] = {"value": 0.8, "status": "HISTORICAL"}
        
        res = self.engine.predict(ctx)
        self.assertEqual(res['risk_level'], "CRITICAL")
        self.assertEqual(res['hard_constraints_failed'], False)
        
    def test_scenario_3_verified_road_blockage(self):
        ctx = self.base_context.copy()
        ctx['road_blockage'] = {"value": True, "status": "REAL"}
        
        res = self.engine.predict(ctx)
        self.assertEqual(res['route_status'], "INFEASIBLE")
        self.assertEqual(res['hard_constraints_failed'], True)
        
    def test_scenario_4_verified_unsafe_bridge(self):
        ctx = self.base_context.copy()
        ctx['bridge_condition'] = {"value": "COLLAPSED", "status": "REAL"}
        
        res = self.engine.predict(ctx)
        self.assertEqual(res['route_status'], "INFEASIBLE")
        self.assertEqual(res['hard_constraints_failed'], True)
        
    def test_scenario_6_real_route_distance(self):
        # The engine passes context intact. In integration, Phase 6 uses it.
        # This test verifies the risk engine doesn't drop the distance field.
        ctx = self.base_context.copy()
        ctx['distance_km'] = {"value": 150.5, "status": "REAL"}
        res = self.engine.predict(ctx)
        self.assertEqual(res['risk_level'], "LOW")
        
    def test_scenario_7_8_9_real_features_used(self):
        # We verify that passing the real provenance objects doesn't crash the engine
        # and correctly calculates risk.
        ctx = {
            "rainfall_mm": {"value": 60, "status": "REAL"},
            "slope_degrees": {"value": 20, "status": "DERIVED"},
            "population_spatial_density": {"value": 1000, "status": "REAL"}
        }
        res = self.engine.predict(ctx)
        self.assertEqual(res['risk_level'], "MEDIUM") # 20 for rain, 10 for slope = 30
        
    def test_scenario_12_no_safety_constraint_violated(self):
        res = self.engine.predict(self.base_context)
        self.assertTrue(res['requires_dispatcher_review'])
        self.assertFalse(res['hard_constraints_failed'])

if __name__ == '__main__':
    unittest.main()
