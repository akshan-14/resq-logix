import json
import math
import os
import requests

LOCAL_DB_PATH = 'ai/data_pipeline/static_data/local_hdx_roads.json'

def get_road_attributes(lat, lon, radius=50):
    local_roads = []
    if os.path.exists(LOCAL_DB_PATH):
        try:
            with open(LOCAL_DB_PATH, 'r') as f:
                local_roads = json.load(f)
        except json.JSONDecodeError:
            local_roads = []
    
    nearest_road = None
    min_dist = float('inf')
    
    for road in local_roads:
        for geom in road.get('geometry', []):
            dist = math.hypot(geom['lat'] - lat, geom['lon'] - lon) * 111320
            if dist < min_dist:
                min_dist = dist
                nearest_road = road
                
    if nearest_road and min_dist < radius:
        return nearest_road

    # Fetch
    print(f"Fetching HDX/OSM data for {lat}, {lon}...")
    overpass_url = "https://overpass-api.de/api/interpreter"
    d = 0.01 
    overpass_query = f"""
    [out:json];
    way["highway"]({lat-d}, {lon-d}, {lat+d}, {lon+d});
    out body geom;
    """
    
    headers = {'User-Agent': 'ResQ-Logix/1.0'}
    try:
        response = requests.post(overpass_url, data={'data': overpass_query}, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            new_roads = []
            for element in data.get('elements', []):
                if element['type'] == 'way':
                    tags = element.get('tags', {})
                    new_roads.append({
                        'id': element['id'],
                        'highway': tags.get('highway', 'unknown'),
                        'surface': tags.get('surface', 'paved'), # default for primary
                        'smoothness': tags.get('smoothness', 'unknown'),
                        'bridge': tags.get('bridge', 'no'),
                        'geometry': element.get('geometry', [])
                    })
                    local_roads.append(new_roads[-1])
            
            with open(LOCAL_DB_PATH, 'w') as f:
                json.dump(local_roads, f, indent=2)
                
            for road in new_roads:
                for geom in road['geometry']:
                    dist = math.hypot(geom['lat'] - lat, geom['lon'] - lon) * 111320
                    if dist < min_dist:
                        min_dist = dist
                        nearest_road = road
    except Exception as e:
        print(f"Warning: HDX lookup failed: {e}")
        
    if nearest_road and min_dist < radius:
        return nearest_road
        
    return {'highway': 'unknown', 'surface': 'unknown', 'bridge': 'no'}

def evaluate_route_segment_risk(lat, lon, slope_deg, rainfall_mm, active_reports=None):
    if active_reports is None: active_reports = []
    
    # 1. Fetch road attributes (HDX OSM)
    road_attrs = get_road_attributes(lat, lon)
    
    risk_score = 0
    reasons = []
    
    # Base risk
    risk_score += slope_deg * 0.5 
    if rainfall_mm > 0:
        risk_score += rainfall_mm * 1.5
        reasons.append(f"Live rainfall ({rainfall_mm}mm)")
        
    if slope_deg > 10:
        reasons.append(f"Steep terrain ({slope_deg} deg)")

    # 2. HDX Surface + Weather Integration
    surface = road_attrs.get('surface', 'unknown')
    highway = road_attrs.get('highway', 'unknown')
    
    if surface in ['unpaved', 'dirt', 'gravel', 'earth']:
        if rainfall_mm > 5.0:
            risk_score += 30
            reasons.append(f"High risk: {surface.upper()} road + Heavy Rainfall ({rainfall_mm}mm) creates mud/washout risk")
        elif rainfall_mm > 0:
            risk_score += 15
            reasons.append(f"Moderate risk: {surface.upper()} road + Light Rainfall")
        else:
            risk_score += 5
            reasons.append(f"{surface.upper()} road (reduced baseline speed)")
            
    # 3. HDX Bridge + Crowdsourced Field Report Integration
    is_bridge = road_attrs.get('bridge') == 'yes'
    if is_bridge:
        reasons.append(f"Route depends on a bridge segment (OSM ID: {road_attrs.get('id')})")
        # Check against live field reports
        for rep in active_reports:
            if rep['type'] == 'BRIDGE_DAMAGED':
                dist = math.hypot(rep['lat'] - lat, rep['lon'] - lon) * 111320
                if dist < 200: # within 200m
                    risk_score += 100
                    reasons.append(f"CRITICAL: Segment crosses a bridge that has an active BRIDGE_DAMAGED field report!")
                    
    # Determine Level
    level = "LOW"
    if risk_score > 80: level = "CRITICAL"
    elif risk_score > 40: level = "HIGH"
    elif risk_score > 20: level = "MEDIUM"
    
    return {
        'segment': {'lat': lat, 'lon': lon},
        'hdx_attributes': {
            'highway': highway,
            'surface': surface,
            'bridge': 'yes' if is_bridge else 'no'
        },
        'risk_level': level,
        'risk_score': round(risk_score, 1),
        'reasons': reasons
    }

if __name__ == '__main__':
    # Force a bridge+unpaved scenario in our local DB to demonstrate the logic 
    # without relying on Overpass API returning the perfect tags
    demo_road = {
        'id': 999999,
        'highway': 'track',
        'surface': 'unpaved',
        'bridge': 'yes',
        'geometry': [{'lat': 25.5, 'lon': 92.5}]
    }
    with open(LOCAL_DB_PATH, 'w') as f:
        json.dump([demo_road], f)
        
    print("--- EVALUATING ROUTE SEGMENT: UNPAVED + RAIN + BRIDGE ---")
    res1 = evaluate_route_segment_risk(
        lat=25.5, lon=92.5, 
        slope_deg=12.5, 
        rainfall_mm=10.0,
        active_reports=[{'type': 'BRIDGE_DAMAGED', 'lat': 25.5001, 'lon': 92.5001}]
    )
    print(json.dumps(res1, indent=2))
