from .priority_features import parse_priority_feature

def calculate_priority_score(context_data):
    """
    Calculates a deterministic priority score (0-100) based on operational rules.
    """
    reasons = []
    score = 0.0
    operational_flags = []
    
    # 1. Parse active SOS and medical emergencies
    sos_count, sos_unavail = parse_priority_feature(context_data.get('sos_count'), 0.0)
    medical_count, med_unavail = parse_priority_feature(context_data.get('medical_emergency_count'), 0.0)
    
    if not sos_unavail and sos_count > 0:
        added_score = min(30, sos_count * 2)
        score += added_score
        reasons.append(f"{int(sos_count)} active SOS requests (Added {added_score})")
        
    if not med_unavail and medical_count > 0:
        added_score = min(40, medical_count * 5)
        score += added_score
        reasons.append(f"{int(medical_count)} medical emergencies (Added {added_score})")
        
    # 2. Population Density / Impact
    pop_density, pop_unavail = parse_priority_feature(context_data.get('population_spatial_density', context_data.get('population_density')), 0.0)
    if not pop_unavail and pop_density > 1000:
        score += 15
        reasons.append(f"High affected population density ({pop_density:.0f}/km2)")
    elif not pop_unavail and pop_density > 200:
        score += 5
        reasons.append(f"Moderate affected population density ({pop_density:.0f}/km2)")
        
    # 3. Request Age
    req_age, age_unavail = parse_priority_feature(context_data.get('request_age_hours'), 0.0)
    if not age_unavail and req_age > 24:
        score += 15
        reasons.append(f"Request is old (>24h) and waiting")
    elif not age_unavail and req_age > 12:
        score += 5
        
    # 4. Route Risk as Isolation Multiplier (Not a direct priority itself, but isolates the population)
    acc_risk = context_data.get('accessibility_risk', 0)
    if acc_risk >= 70:
        score += 10
        reasons.append("High route risk causing severe isolation")
        
    # 5. Supply Constraints (Future Field Data)
    med_supply, med_sup_unavail = parse_priority_feature(context_data.get('medicine_supply_days_remaining'), 14)
    if not med_sup_unavail and med_supply <= 2:
        score += 15
        reasons.append("Critically low medicine supply (<= 2 days)")
        if medical_count > 0:
            operational_flags.append("CRITICAL SHORTAGE: Medical emergencies active with <= 2 days medicine remaining.")
            score += 20 # Critical override boost
            
    # Normalize score
    score = min(100.0, score)
    
    # Thresholding for level
    if score >= 80:
        level = "CRITICAL"
    elif score >= 60:
        level = "HIGH"
    elif score >= 35:
        level = "MEDIUM"
    else:
        level = "LOW"
        if not reasons:
            reasons.append("No critical distress signals detected in region")
            
    return score, level, reasons, operational_flags
