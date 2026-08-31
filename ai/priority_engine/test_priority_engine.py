import unittest
from ai.priority_engine.deterministic_priority_engine import DeterministicPriorityEngine

class TestDeterministicPriorityEngine(unittest.TestCase):
    def setUp(self):
        self.engine = DeterministicPriorityEngine()
        
    def test_scenario_1_no_sos_normal_request(self):
        ctx = {
            "sos_count": {"value": 0, "status": "REAL"},
            "medical_emergency_count": {"value": 0, "status": "REAL"},
            "population_density": {"value": 100, "status": "REAL"},
            "request_age_hours": {"value": 2, "status": "REAL"}
        }
        res = self.engine.predict(ctx)
        self.assertEqual(res['priority_level'], "LOW")
        
    def test_scenario_2_multiple_sos(self):
        ctx = {
            "sos_count": {"value": 20, "status": "REAL"},
            "medical_emergency_count": {"value": 0, "status": "REAL"}
        }
        res = self.engine.predict(ctx)
        self.assertEqual(res['priority_level'], "LOW") # 30 points
        
    def test_scenario_3_medical_emergencies(self):
        ctx = {
            "sos_count": {"value": 5, "status": "REAL"},
            "medical_emergency_count": {"value": 10, "status": "REAL"} # 40 points
        }
        res = self.engine.predict(ctx)
        self.assertEqual(res['priority_level'], "MEDIUM") # 10 + 40 = 50 points
        
    def test_scenario_7_critical_combination(self):
        ctx = {
            "sos_count": {"value": 100, "status": "REAL"}, # max 30
            "medical_emergency_count": {"value": 50, "status": "REAL"}, # max 40
            "population_density": {"value": 2000, "status": "REAL"}, # 15
            "request_age_hours": {"value": 48, "status": "REAL"} # 15
        }
        # 30 + 40 + 15 + 15 = 100
        res = self.engine.predict(ctx)
        self.assertEqual(res['priority_level'], "CRITICAL")
        self.assertEqual(res['priority_score'], 100.0)
        
    def test_scenario_8_missing_optional_feature(self):
        ctx = {
            "sos_count": {"value": 10, "status": "REAL"},
            "population_density": {"status": "UNAVAILABLE"}
        }
        res = self.engine.predict(ctx)
        self.assertTrue(res['priority_score'] > 0)
        
    def test_scenario_10_unavailable_vs_zero(self):
        ctx1 = {"sos_count": {"value": 0, "status": "REAL"}}
        res1 = self.engine.predict(ctx1)
        
        ctx2 = {"sos_count": {"status": "UNAVAILABLE"}}
        res2 = self.engine.predict(ctx2)
        
        self.assertEqual(res1['priority_score'], res2['priority_score']) # both add 0, but parsing is safe
        
    def test_safety_override(self):
        ctx = {
            "medical_emergency_count": {"value": 5, "status": "REAL"},
            "medicine_supply_days_remaining": {"value": 1, "status": "REAL"}
        }
        res = self.engine.predict(ctx)
        self.assertTrue(any("CRITICAL SHORTAGE" in flag for flag in res['operational_flags']))
        self.assertTrue(res['priority_score'] >= 60) # 25 for medical + 15 for low supply + 20 override = 60

if __name__ == '__main__':
    unittest.main()
