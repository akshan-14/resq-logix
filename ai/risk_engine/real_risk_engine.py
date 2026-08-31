from .safety_rules import evaluate_hard_safety_constraints
from .risk_features import calculate_deterministic_risk

class DeterministicRiskEngine:
    def __init__(self):
        pass
        
    def predict(self, context_data):
        """
        Assesses route risk using real operational data and strict deterministic rules.
        Replaces the unsupervised/synthetic ML model.
        Returns a dictionary compatible with Phase 6 expectations.
        """
        # 1. Hard Safety Constraints
        is_infeasible, is_insufficient, violations = evaluate_hard_safety_constraints(context_data)
        
        if is_infeasible:
            return {
                "route_status": "INFEASIBLE",
                "risk_level": "INFEASIBLE",
                "risk_score": 100,
                "accessibility_score": 0, # Legacy compatibility
                "confidence": None,
                "reasons": violations,
                "hard_constraints_failed": True,
                "data_quality": "COMPLETE",
                "requires_dispatcher_review": True
            }
            
        if is_insufficient:
            return {
                "route_status": "INSUFFICIENT_CONTEXT",
                "risk_level": "INSUFFICIENT_CONTEXT",
                "risk_score": None,
                "accessibility_score": 0,
                "confidence": None,
                "reasons": violations,
                "hard_constraints_failed": True,
                "data_quality": "INCOMPLETE",
                "requires_dispatcher_review": True
            }
            
        # 2. Calculate Deterministic Risk Score
        risk_score, risk_level, reasons = calculate_deterministic_risk(context_data)
        
        # Legacy compatibility conversion for decision engine
        accessibility_score = 100 - risk_score
        
        return {
            "route_status": risk_level + "_RISK",
            "risk_level": risk_level,
            "risk_score": risk_score,
            "accessibility_score": accessibility_score,
            "confidence": None,
            "reasons": reasons,
            "hard_constraints_failed": False,
            "data_quality": "COMPLETE",
            "requires_dispatcher_review": True # ALL routes require human dispatcher
        }
