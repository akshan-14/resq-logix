import pandas as pd
import numpy as np
import os

def generate_priority_data(num_samples=2500, random_seed=42):
    np.random.seed(random_seed)
    
    # 1. Base Demographic & Location Features
    population = np.random.randint(500, 50000, num_samples)
    population_density = population / np.random.uniform(5, 100, num_samples)
    vulnerable_population = (population * np.random.uniform(0.05, 0.3, num_samples)).astype(int)
    
    distance_to_nearest_hospital_km = np.random.uniform(5, 150, num_samples)
    distance_to_nearest_warehouse_km = np.random.uniform(10, 200, num_samples)
    
    # 2. Disaster & Environmental Features
    disaster_severity = np.random.randint(0, 11, num_samples)
    rainfall_mm = np.random.uniform(0, 400, num_samples)
    weather_severity = np.clip((rainfall_mm / 400) * 10 + np.random.normal(0, 1, num_samples), 0, 10).astype(int)
    flood_risk = np.clip(disaster_severity * 0.5 + (rainfall_mm/400)*5 + np.random.normal(0, 1, num_samples), 0, 10).astype(int)
    landslide_risk = np.clip(disaster_severity * 0.4 + (rainfall_mm/400)*6 + np.random.normal(0, 1, num_samples), 0, 10).astype(int)
    road_blockage = np.clip(landslide_risk * 0.6 + flood_risk * 0.4 + np.random.normal(0, 2, num_samples), 0, 10).astype(int)
    connectivity = np.random.randint(0, 11, num_samples)
    
    # Phase 4 inputs (simulate output from accessibility engine)
    accessibility_risk = np.clip(road_blockage * 4 + landslide_risk * 3 + flood_risk * 3, 0, 100)
    accessibility_score = 100 - accessibility_risk
    
    # 3. Emergency Demand Features
    # Severe disaster -> more SOS, injuries, and shelter demand
    sos_base = disaster_severity * (population / 1000)
    sos_count = np.clip(sos_base * np.random.uniform(0.1, 2.0, num_samples), 0, None).astype(int)
    
    injured_people = np.clip(sos_count * np.random.uniform(0, 0.8, num_samples), 0, None).astype(int)
    medical_emergency_count = np.clip(injured_people * np.random.uniform(0.2, 1.0, num_samples), 0, None).astype(int)
    shelter_demand = np.clip(disaster_severity * (population / 100) * np.random.uniform(0, 5, num_samples), 0, None).astype(int)
    
    # 4. Supply Shortage Features (Days remaining)
    # 0 = Completely out, 14 = Fully stocked
    food_supply_days_remaining = np.clip(14 - disaster_severity - np.random.normal(0, 2, num_samples), 0, 14).astype(int)
    water_supply_days_remaining = np.clip(14 - disaster_severity - np.random.normal(0, 2, num_samples), 0, 14).astype(int)
    medicine_supply_days_remaining = np.clip(14 - disaster_severity - np.random.normal(0, 2, num_samples), 0, 14).astype(int)
    
    request_age_hours = np.random.uniform(0.5, 72, num_samples)
    
    # 5. Non-linear Target Generation
    # We create a complex underlying reality that the ML model must learn
    
    # Medical urgency spike
    medical_urgency = (medical_emergency_count * 5) + (14 - medicine_supply_days_remaining)**2
    
    # Basic survival urgency
    survival_urgency = ((14 - food_supply_days_remaining) * 2) + ((14 - water_supply_days_remaining) * 3)
    
    # Scale disaster impact by population affected
    population_impact = np.log1p(population) * disaster_severity * 2
    
    # Time factor - older requests grow more urgent
    time_urgency = request_age_hours * 1.5
    
    # Isolation multiplier (Accessibility affects urgency)
    isolation_multiplier = 1.0 + (accessibility_risk / 100)
    
    raw_priority = (medical_urgency + survival_urgency + population_impact + sos_count*2 + time_urgency) * isolation_multiplier
    
    # Normalize to 0-100 roughly
    p_max = np.percentile(raw_priority, 99) # 99th percentile for normalization
    priority_score_norm = (raw_priority / p_max) * 100
    
    # Add noise
    priority_score_norm += np.random.normal(0, 4, num_samples)
    
    # Hard overrides for the ground truth dataset to represent extremes
    # E.g., massive medical emergency with zero medicine
    critical_medical = (medical_emergency_count > 20) & (medicine_supply_days_remaining <= 1)
    priority_score_norm[critical_medical] = np.clip(priority_score_norm[critical_medical] + 20, 90, 100)
    
    priority_score = np.clip(priority_score_norm, 0, 100)
    
    priority_level = []
    for score in priority_score:
        if score >= 80:
            priority_level.append("CRITICAL")
        elif score >= 60:
            priority_level.append("HIGH")
        elif score >= 35:
            priority_level.append("MEDIUM")
        else:
            priority_level.append("LOW")
            
    df = pd.DataFrame({
        "population": population,
        "population_density": population_density,
        "vulnerable_population": vulnerable_population,
        "sos_count": sos_count,
        "medical_emergency_count": medical_emergency_count,
        "injured_people": injured_people,
        "food_supply_days_remaining": food_supply_days_remaining,
        "water_supply_days_remaining": water_supply_days_remaining,
        "medicine_supply_days_remaining": medicine_supply_days_remaining,
        "shelter_demand": shelter_demand,
        "distance_to_nearest_hospital_km": distance_to_nearest_hospital_km,
        "distance_to_nearest_warehouse_km": distance_to_nearest_warehouse_km,
        "accessibility_score": accessibility_score,
        "accessibility_risk": accessibility_risk,
        "rainfall_mm": rainfall_mm,
        "flood_risk": flood_risk,
        "landslide_risk": landslide_risk,
        "weather_severity": weather_severity,
        "road_blockage": road_blockage,
        "connectivity": connectivity,
        "disaster_severity": disaster_severity,
        "request_age_hours": request_age_hours,
        "priority_score": priority_score,
        "priority_level": priority_level
    })
    
    out_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(out_dir, exist_ok=True)
    df.to_csv(os.path.join(out_dir, 'priority_training.csv'), index=False)
    print(f"Generated {num_samples} rows of synthetic priority training data.")

if __name__ == "__main__":
    generate_priority_data()
