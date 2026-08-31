from .priority_rules import calculate_priority_score

class DeterministicPriorityEngine:
    def __init__(self):
        pass
        
    def predict(self, context_data):
        """
        Assesses request priority using deterministic operational rules.
        Replaces the unsupervised/synthetic ML Priority model.
        Returns a dictionary compatible with Phase 6 expectations.
        """
        score, level, reasons, operational_flags = calculate_priority_score(context_data)
        
        return {
            "priority_score": score,
            "priority_level": level,
            "probabilities": {},
            "top_factors": reasons, # Using reasons as the explainability output
            "operational_flags": operational_flags
        }
