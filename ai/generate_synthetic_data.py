import pandas as pd
import numpy as np
import os

def generate_data(num_samples=1500, random_seed=42):
    np.random.seed(random_seed)
    
    # Generate features
    distance_km = np.random.uniform(5, 500, num_samples)
    road_condition = np.random.randint(0, 11, num_samples) # 0 to 10
    terrain_difficulty = np.random.randint(0, 11, num_samples)
    rainfall_mm = np.random.uniform(0, 300, num_samples)
    
    # Interactions and nonlinear relations
    # Higher rainfall in difficult terrain increases flood and landslide risks exponentially
    flood_risk_base = (rainfall_mm / 300) * 5 + (terrain_difficulty / 10) * 2
    flood_risk = np.clip(flood_risk_base + np.random.normal(0, 1, num_samples), 0, 10).astype(int)
    
    landslide_risk_base = (terrain_difficulty / 10) * 6 + (rainfall_mm / 300) * 4
    # Non-linear interaction: steep terrain + heavy rain = huge spike
    interaction = (terrain_difficulty > 7) & (rainfall_mm > 150)
    landslide_risk_base[interaction] += 3
    landslide_risk = np.clip(landslide_risk_base + np.random.normal(0, 1, num_samples), 0, 10).astype(int)
    
    connectivity = np.random.randint(0, 11, num_samples)
    elevation_change_m = terrain_difficulty * 200 + np.random.uniform(0, 500, num_samples)
    bridge_condition = np.clip(road_condition - np.random.randint(0, 3, num_samples), 0, 10)
    population_density = np.random.uniform(10, 5000, num_samples)
    weather_severity = np.clip((rainfall_mm / 300) * 10 + np.random.normal(0, 1, num_samples), 0, 10).astype(int)
    
    # Road blockage is random but highly correlated with extreme landslide/flood
    road_blockage = np.zeros(num_samples)
    for i in range(num_samples):
        if landslide_risk[i] >= 9 or flood_risk[i] >= 9:
            road_blockage[i] = np.random.randint(7, 11)
        elif landslide_risk[i] >= 6 or flood_risk[i] >= 6:
            road_blockage[i] = np.random.randint(0, 6)
        else:
            road_blockage[i] = np.random.randint(0, 3)
            
    # Add random noise/accidents
    random_blocks = np.random.choice(num_samples, int(num_samples * 0.05), replace=False)
    road_blockage[random_blocks] = 10
    
    road_blockage = np.clip(road_blockage, 0, 10).astype(int)
    
    # Calculate target (complex synthetic logic)
    # This is NOT the same simple weighted sum. It uses polynomials and thresholds.
    risk_score_raw = (
        (road_condition ** 1.2) * 1.5 +
        (terrain_difficulty ** 1.3) * 1.0 +
        (rainfall_mm / 300 * 10) ** 1.2 * 1.2 +
        (flood_risk ** 1.5) * 1.0 +
        (landslide_risk ** 1.5) * 1.5 +
        (road_blockage ** 2) * 0.5 + 
        (connectivity * 0.5)
    )
    
    # Normalize risk to roughly 0-100
    max_theoretical_risk = (10**1.2)*1.5 + (10**1.3)*1.0 + (10**1.2)*1.2 + (10**1.5)*1.0 + (10**1.5)*1.5 + (10**2)*0.5 + 5
    risk_score_norm = (risk_score_raw / max_theoretical_risk) * 100
    
    # Add noise to target
    risk_score_norm += np.random.normal(0, 5, num_samples)
    
    # Absolute blockages override
    risk_score_norm[road_blockage == 10] = 100
    
    risk_score = np.clip(risk_score_norm, 0, 100)
    accessibility_score = 100 - risk_score
    
    # Discretize risk_level
    risk_level = []
    for score in risk_score:
        if score >= 80:
            risk_level.append("CRITICAL")
        elif score >= 60:
            risk_level.append("HIGH")
        elif score >= 30:
            risk_level.append("MEDIUM")
        else:
            risk_level.append("LOW")
            
    # Create DataFrame
    df = pd.DataFrame({
        "distance_km": distance_km,
        "road_condition": road_condition,
        "terrain_difficulty": terrain_difficulty,
        "rainfall_mm": rainfall_mm,
        "flood_risk": flood_risk,
        "landslide_risk": landslide_risk,
        "road_blockage": road_blockage,
        "connectivity": connectivity,
        "elevation_change_m": elevation_change_m,
        "bridge_condition": bridge_condition,
        "population_density": population_density,
        "weather_severity": weather_severity,
        "accessibility_score": accessibility_score,
        "risk_level": risk_level
    })
    
    # Save
    out_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(out_dir, exist_ok=True)
    df.to_csv(os.path.join(out_dir, 'accessibility_training.csv'), index=False)
    print(f"Generated {num_samples} rows of synthetic training data in data/accessibility_training.csv")

if __name__ == "__main__":
    generate_data()
