import requests
import json
import math
import os

LOCAL_DB_PATH = 'ai/data_pipeline/static_data/local_hdx_roads.json'

def get_road_attributes(lat, lon, radius=50):
    # Load from local cache if available
    local_roads = []
    if os.path.exists(LOCAL_DB_PATH):
        with open(LOCAL_DB_PATH, 'r') as f:
            local_roads = json.load(f)
    
    # Simple spatial index: find nearest road in our local dataset
    nearest_road = None
    min_dist = float('inf')
    
    for road in local_roads:
        for geom in road['geometry']:
            dist = math.hypot(geom['lat'] - lat, geom['lon'] - lon) * 111320 # approx meters
            if dist < min_dist:
                min_dist = dist
                nearest_road = road
                
    if nearest_road and min_dist < radius:
        return nearest_road

    # If not in local dataset, fetch from OSM/HDX (acting as downloading the HDX region)
    print(f"Fetching regional HDX data for {lat}, {lon}...")
    overpass_url = "https://overpass-api.de/api/interpreter"
    
    # Bounding box around the point (~500m)
    d = 0.005 
    overpass_query = f"""
    [out:json];
    way["highway"]({lat-d}, {lon-d}, {lat+d}, {lon+d});
    out body geom;
    """
    
    headers = {'User-Agent': 'ResQ-Logix/1.0'}
    response = requests.post(overpass_url, data={'data': overpass_query}, headers=headers)
    
    if response.status_code != 200:
        return {'error': f'Failed to fetch: {response.status_code}'}
        
    data = response.json()
    new_roads = []
    
    for element in data.get('elements', []):
        if element['type'] == 'way':
            tags = element.get('tags', {})
            geom = element.get('geometry', [])
            new_roads.append({
                'id': element['id'],
                'highway': tags.get('highway', 'unknown'),
                'surface': tags.get('surface', 'unknown'),
                'smoothness': tags.get('smoothness', 'unknown'),
                'bridge': tags.get('bridge', 'no'),
                'geometry': geom
            })
            local_roads.append(new_roads[-1])
            
    with open(LOCAL_DB_PATH, 'w') as f:
        json.dump(local_roads, f, indent=2)
        
    # Re-evaluate nearest after update
    for road in new_roads:
        for geom in road['geometry']:
            dist = math.hypot(geom['lat'] - lat, geom['lon'] - lon) * 111320
            if dist < min_dist:
                min_dist = dist
                nearest_road = road
                
    if nearest_road and min_dist < radius:
        return nearest_road
        
    return {'highway': 'unknown', 'surface': 'unknown', 'bridge': 'no'}

if __name__ == '__main__':
    # Test Kamrup Metro
    print("Testing road near Kamrup (26.1445, 91.7362):")
    res = get_road_attributes(26.1445, 91.7362)
    print(res)
    
    # Test Kaziranga Highway / unpaved example (if any)
    print("\nTesting road near Aizawl (23.7307, 92.7173):")
    res2 = get_road_attributes(23.7307, 92.7173)
    print(res2)
