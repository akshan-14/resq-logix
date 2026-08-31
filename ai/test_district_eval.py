import unittest
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from risk_engine.real_risk_engine import DeterministicRiskEngine
from run_district_eval import evaluate_district

class DummyConnection:
    def cursor(self):
        return self
    def execute(self, query, params=None):
        pass
    def fetchall(self):
        return []
    def close(self):
        pass

class TestDistrictEval(unittest.TestCase):
    def setUp(self):
        self.dummy_conn = DummyConnection()
        self.base_district = {"id": "D-TEST", "name": "Test District", "state": "Test", "lat": 26.0, "lon": 91.0}

    def test_all_inputs_available(self):
        # We can test the underlying risk engine to simulate inputs,
        # but evaluate_district fetches them live. Instead of mocking the network,
        # we can test DeterministicRiskEngine directly with district-like payloads
        # to ensure it maps correctly to RED/YELLOW etc.
        
        engine = DeterministicRiskEngine()
        context = {
            'rainfall_mm': {'status': 'SUCCESS', 'value': 20.0},
            'historical_landslide_susceptibility': {'status': 'SUCCESS', 'value': 0.8},
            'historical_flood_susceptibility': {'status': 'SUCCESS', 'value': 0.1},
            'slope_degrees': {'status': 'UNAVAILABLE', 'value': 0},
        }
        res = engine.predict(context)
        
        self.assertEqual(res['risk_level'], 'LOW') # LS > 0.7 adds 20. 20 < 30 -> LOW.
        # Actually, let's trace: LS > 0.7 = 20 risk. 20 < 30, so LOW.
        # Let's add rainfall 60 to push it over 30
        
        context['rainfall_mm']['value'] = 60.0
        res = engine.predict(context)
        # RF 60 > 50 = +20. LS 0.8 > 0.7 = +20. RF 60 + LS 0.8 = +20 (interaction).
        # Total = 60. >= 60 is HIGH.
        self.assertEqual(res['risk_level'], 'HIGH')

    def test_unavailable_inputs(self):
        engine = DeterministicRiskEngine()
        context = {
            'rainfall_mm': {'status': 'UNAVAILABLE'},
            'historical_landslide_susceptibility': {'status': 'UNAVAILABLE'},
            'historical_flood_susceptibility': {'status': 'UNAVAILABLE'}
        }
        res = engine.predict(context)
        # Should default to 0.0, resulting in LOW risk (GREEN), but with UNAVAILABLE flags.
        # Wait, the engine itself returns LOW, but the data points should show UNAVAILABLE on the dashboard.
        self.assertEqual(res['risk_level'], 'LOW')

    def test_verified_blockage_forces_red(self):
        engine = DeterministicRiskEngine()
        context = {
            'rainfall_mm': {'status': 'SUCCESS', 'value': 0.0},
            'road_blockage': {'status': 'SUCCESS', 'value': True}
        }
        res = engine.predict(context)
        self.assertTrue(res['hard_constraints_failed'])
        self.assertEqual(res['risk_level'], 'INFEASIBLE')
        self.assertIn("Verified Road Blockage reported from field.", res['reasons'])

if __name__ == '__main__':
    unittest.main()
