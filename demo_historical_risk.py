import json
from ai.data_pipeline.static_data.historical_risk import get_historical_risk

def evaluate_route_with_historical_context(district_name, rainfall_mm, active_reports=0):
    # 1. Look up historical baseline risk for this district
    hist_data = get_historical_risk(district_name)
    flood_risk = hist_data.get('flood_susceptibility_0_to_100', 0)
    landslide_risk = hist_data.get('landslide_susceptibility_0_to_100', 0)
    
    risk_score = 0
    reasons = []
    
    # Standard logic
    if rainfall_mm > 0:
        risk_score += rainfall_mm * 1.5
        reasons.append(f"Live rainfall ({rainfall_mm}mm)")
        
    # Preemptive Historical Integration
    if active_reports == 0:
        if flood_risk >= 75 and rainfall_mm > 5.0:
            risk_score += 25
            reasons.append(f"Preemptive: Historical High Flood Zone ({flood_risk}/100) + Active Rainfall")
        
        if landslide_risk >= 75 and rainfall_mm > 5.0:
            risk_score += 25
            reasons.append(f"Preemptive: Historical High Landslide Zone ({landslide_risk}/100) + Active Rainfall")
            
    # Determine Level
    level = "LOW"
    if risk_score > 40: level = "CRITICAL"
    elif risk_score > 20: level = "HIGH"
    elif risk_score > 10: level = "MEDIUM"
    
    return {
        'district': district_name,
        'baseline_flood_risk': flood_risk,
        'baseline_landslide_risk': landslide_risk,
        'live_rainfall_mm': rainfall_mm,
        'risk_level': level,
        'risk_score': round(risk_score, 1),
        'reasons': reasons
    }

if __name__ == '__main__':
    # Test Cachar (High Flood History) during heavy rain
    print("--- EVALUATING CACHAR (Heavy Rain, No Live Reports) ---")
    res1 = evaluate_route_with_historical_context("Cachar", rainfall_mm=12.0)
    print(json.dumps(res1, indent=2))
    
    # Test Kamrup (Medium Flood History) during heavy rain
    print("\n--- EVALUATING KAMRUP METRO (Heavy Rain, No Live Reports) ---")
    res2 = evaluate_route_with_historical_context("Kamrup Metropolitan", rainfall_mm=12.0)
    print(json.dumps(res2, indent=2))
