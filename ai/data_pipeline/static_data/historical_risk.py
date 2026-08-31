import csv
import json
import os

CSV_PATH = 'ai/data_pipeline/static_data/historical_disasters.csv'
JSON_OUT_PATH = 'ai/data_pipeline/static_data/district_historical_risk.json'

def parse_and_aggregate():
    district_data = {}
    
    # Weights for severity
    weights = {'LOW': 1, 'MEDIUM': 3, 'HIGH': 6, 'CRITICAL': 10}
    
    with open(CSV_PATH, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            dist = row['district']
            dtype = row['type']
            sev = row['severity']
            
            if dist not in district_data:
                district_data[dist] = {'FLOOD': 0, 'LANDSLIDE': 0, 'incidents': []}
                
            score_addition = weights.get(sev, 1)
            district_data[dist][dtype] += score_addition
            
            district_data[dist]['incidents'].append({
                'date': row['date'],
                'type': dtype,
                'severity': sev,
                'desc': row['impact_desc']
            })
            
    # Normalize to 0-100 scale (Assuming max possible score ~ 30 for this small sample)
    MAX_SCORE_REF = 20.0
    
    final_output = {}
    for dist, data in district_data.items():
        flood_score = min(100, round((data['FLOOD'] / MAX_SCORE_REF) * 100))
        landslide_score = min(100, round((data['LANDSLIDE'] / MAX_SCORE_REF) * 100))
        
        final_output[dist] = {
            'flood_susceptibility_0_to_100': flood_score,
            'landslide_susceptibility_0_to_100': landslide_score,
            'incident_count': len(data['incidents']),
            'history': data['incidents']
        }
        
    with open(JSON_OUT_PATH, 'w') as f:
        json.dump(final_output, f, indent=2)
        
    return final_output

def get_historical_risk(district_name):
    if not os.path.exists(JSON_OUT_PATH):
        parse_and_aggregate()
        
    with open(JSON_OUT_PATH, 'r') as f:
        data = json.load(f)
        
    return data.get(district_name, {
        'flood_susceptibility_0_to_100': 0,
        'landslide_susceptibility_0_to_100': 0,
        'incident_count': 0
    })

if __name__ == '__main__':
    result = parse_and_aggregate()
    print(f"Aggregated {len(result)} districts from historical data.")
    print("Sample Cachar:", json.dumps(result.get('Cachar'), indent=2))
