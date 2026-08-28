class AccessibilityIntelligence:
    """
    Accessibility and Risk Intelligence Engine for the North Eastern Region.
    Calculates an accessibility score and risk profile based on terrain, weather, and road conditions.
    """
    
    def __init__(self):
        # Weights for different factors affecting accessibility and risk
        self.weights = {
            "road_condition": 0.20,       # 0 (Perfect) to 10 (Destroyed)
            "terrain_difficulty": 0.15,   # 0 (Flat) to 10 (Mountainous/Hazardous)
            "rainfall_severity": 0.15,    # 0 (Clear) to 10 (Extreme Monsoon)
            "flood_risk": 0.15,           # 0 (None) to 10 (High flood probability)
            "landslide_risk": 0.15,       # 0 (None) to 10 (High active landslide zone)
            "road_blockage": 0.10,        # 0 (Clear) to 10 (Completely blocked)
            "connectivity": 0.10          # 0 (Excellent) to 10 (No network)
        }

    def evaluate_route(self, route_data):
        """
        Evaluate a route based on provided controlled demo data.
        Returns accessibility score, risk score, risk level, and explanations.
        """
        explanations = []
        risk_score = 0
        
        # Calculate base risk based on weighted sum of factors
        for factor, weight in self.weights.items():
            value = route_data.get(factor, 0)
            if value < 0: value = 0
            if value > 10: value = 10
            
            contribution = value * weight * 10  # Scales to 0-100 overall
            risk_score += contribution
            
            # Generate transparent explanations for critical factors
            if value >= 7:
                explanations.append(f"High {factor.replace('_', ' ')} (Level {value}/10) significantly increases risk.")
            elif value >= 4:
                explanations.append(f"Moderate {factor.replace('_', ' ')} (Level {value}/10) affects accessibility.")
                
        # Absolute blockages override standard math
        if route_data.get("road_blockage", 0) == 10:
            risk_score = 100
            explanations.append("CRITICAL: Route is completely blocked.")
            
        # Cap risk score
        risk_score = min(max(round(risk_score), 0), 100)
        
        # Accessibility is inversely proportional to risk
        accessibility_score = 100 - risk_score
        
        # Determine Risk Level
        if risk_score >= 80:
            risk_level = "CRITICAL"
        elif risk_score >= 60:
            risk_level = "HIGH"
        elif risk_score >= 30:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
            
        if not explanations:
            explanations.append("Route conditions are stable and clear.")
            
        return {
            "route_id": route_data.get("route_id", "Unknown"),
            "distance_km": route_data.get("distance", 0),
            "accessibility_score": accessibility_score,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "reasons": explanations
        }
