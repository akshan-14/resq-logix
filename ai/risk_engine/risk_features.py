def parse_feature_value(feature_obj, default=0.0):
    """
    Safely extracts a numeric value from a provenance-tagged feature object.
    If the status is UNAVAILABLE, returns the default.
    """
    if not isinstance(feature_obj, dict):
        # Legacy fallback if raw number was passed
        try:
            return float(feature_obj)
        except:
            return default
            
    if feature_obj.get('status') == 'UNAVAILABLE':
        return default
        
    val = feature_obj.get('value', default)
    if val is None:
        return default
        
    try:
        return float(val)
    except:
        return default

def calculate_deterministic_risk(features):
    """
    Calculates a deterministic risk score based on static hazard and live weather.
    DO NOT call this an ML probability.
    """
    # Extract values
    rainfall_mm = parse_feature_value(features.get('rainfall_mm'), 0.0)
    slope_degrees = parse_feature_value(features.get('slope_degrees'), 0.0)
    landslide_suscept = parse_feature_value(features.get('historical_landslide_susceptibility'), 0.0)
    flood_suscept = parse_feature_value(features.get('historical_flood_susceptibility'), 0.0)
    
    # Simple deterministic heuristic
    # Max risk is 100
    risk_score = 0.0
    reasons = []
    
    if rainfall_mm > 150:
        risk_score += 40
        reasons.append(f"Extreme live rainfall ({rainfall_mm}mm)")
    elif rainfall_mm > 50:
        risk_score += 20
        reasons.append(f"Heavy live rainfall ({rainfall_mm}mm)")
        
    if slope_degrees > 30:
        risk_score += 20
        reasons.append(f"Very steep terrain slope ({slope_degrees} deg)")
    elif slope_degrees > 15:
        risk_score += 10
        
    if landslide_suscept > 0.7:
        risk_score += 20
        reasons.append("High historical landslide susceptibility")
        
    if flood_suscept > 0.7:
        risk_score += 20
        reasons.append("High historical flood susceptibility")
        
    # Interaction: Rain + Landslide Susceptibility
    if rainfall_mm > 50 and landslide_suscept > 0.5:
        risk_score += 20
        reasons.append("High hazard interaction: Rain on susceptible terrain")
        
    risk_score = min(100.0, risk_score)
    
    # Assign risk level
    if risk_score >= 80:
        risk_level = "CRITICAL"
    elif risk_score >= 60:
        risk_level = "HIGH"
    elif risk_score >= 30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"
        if not reasons:
            reasons.append("Nominal baseline conditions")
            
    return risk_score, risk_level, reasons
