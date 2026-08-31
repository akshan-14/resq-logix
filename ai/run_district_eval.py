import sys
import json
import sqlite3
import os
import math
import datetime

# Setup paths to import data pipeline and risk engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from data_pipeline.fetchers.weather_api import fetch_weather
from data_pipeline.static_data.landslide_extractor import extract_landslide_hazard
from data_pipeline.static_data.flood_extractor import extract_flood_hazard
from risk_engine.real_risk_engine import DeterministicRiskEngine
from data_pipeline.static_data.dem_extractor import get_elevation_and_slope


DISTRICTS = [
    {"id": "D-AS-KM", "name": "Kamrup Metropolitan", "state": "Assam", "lat": 26.1445, "lon": 91.7362},
    {"id": "D-AS-CA", "name": "Cachar", "state": "Assam", "lat": 24.8333, "lon": 92.7789},
    {"id": "D-ML-EK", "name": "East Khasi Hills", "state": "Meghalaya", "lat": 25.5788, "lon": 91.8933},
    {"id": "D-MN-IW", "name": "Imphal West", "state": "Manipur", "lat": 24.8170, "lon": 93.9368},
    {"id": "D-MZ-AZ", "name": "Aizawl", "state": "Mizoram", "lat": 23.7307, "lon": 92.7173},
    {"id": "D-NL-KO", "name": "Kohima", "state": "Nagaland", "lat": 25.6751, "lon": 94.1086},
    {"id": "D-AR-PP", "name": "Papum Pare", "state": "Arunachal Pradesh", "lat": 27.0844, "lon": 93.6053},
    {"id": "D-TR-WT", "name": "West Tripura", "state": "Tripura", "lat": 23.8315, "lon": 91.2868},
]

def get_db_connection():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(project_root, 'backend', 'resq-logix.db')
    return sqlite3.connect(db_path)

def distance_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def evaluate_district(district, conn, simulation_override=None):
    lat = district['lat']
    lon = district['lon']
    
    # 1. Fetch live and static data
    weather = fetch_weather(lat, lon)
    landslide = extract_landslide_hazard(lat, lon)
    flood = extract_flood_hazard(lat, lon)
    
    rainfall_val = 0.0
    if weather.get('status') == 'SUCCESS':
        rf = weather.get('data', {}).get('rainfall_mm', 0.0)
        rainfall_val = rf.get('value', 0.0) if isinstance(rf, dict) else float(rf)
        
    ls_val = 0.0
    if landslide.get('status') == 'SUCCESS':
        ls = landslide.get('data', {}).get('hazard_index', 0.0)
        ls_val = ls.get('value', 0.0) if isinstance(ls, dict) else float(ls)
        
    fl_val = 0.0
    if flood.get('status') == 'SUCCESS':
        fl = flood.get('data', {}).get('hazard_index', 0.0)
        fl_val = fl.get('value', 0.0) if isinstance(fl, dict) else float(fl)
    
    context_data = {
        'rainfall_mm': {'status': 'SUCCESS' if weather.get('status') == 'SUCCESS' else 'UNAVAILABLE', 'value': rainfall_val},
        'historical_landslide_susceptibility': {'status': 'SUCCESS' if landslide.get('status') == 'SUCCESS' else 'UNAVAILABLE', 'value': ls_val},
        'historical_flood_susceptibility': {'status': 'SUCCESS' if flood.get('status') == 'SUCCESS' else 'UNAVAILABLE', 'value': fl_val},
    }

    dem_data = get_elevation_and_slope(lat, lon)
    slope_val = 0.0
    dem_status = 'UNAVAILABLE'
    if dem_data.get('status') == 'SUCCESS':
        slope_val = dem_data.get('data', {}).get('slope_degrees', 0.0)
        dem_status = 'SUCCESS'

    context_data['slope_degrees'] = {'status': dem_status, 'value': slope_val}
    
    # 2. Query verified field reports for hard constraints
    cursor = conn.cursor()
    cursor.execute("SELECT report_type, latitude, longitude FROM field_reports WHERE status = 'VERIFIED' AND timestamp >= datetime('now', '-24 hours')")
    reports = cursor.fetchall()
    
    has_road_blockage = False
    has_landslide = False
    active_blockages = 0
    active_landslides = 0
    
    for rt, r_lat, r_lon in reports:
        if distance_km(lat, lon, r_lat, r_lon) <= 40.0: # 40km radius approx district size
            if rt in ('ROAD_BLOCKAGE', 'ROAD_BLOCKED', 'BRIDGE_CONDITION', 'BRIDGE_DAMAGED'):
                has_road_blockage = True
                active_blockages += 1
            if rt in ('LANDSLIDE_OBSERVATION', 'LANDSLIDE'):
                has_landslide = True
                active_landslides += 1
                
    # APPLY SIMULATION OVERRIDE
    if simulation_override:
        s_lat = simulation_override.get('lat')
        s_lon = simulation_override.get('lon')
        s_type = simulation_override.get('type')
        if s_lat is not None and s_lon is not None and distance_km(lat, lon, s_lat, s_lon) <= 40.0:
            if s_type in ('ROAD_BLOCKAGE', 'ROAD_BLOCKED', 'BRIDGE_CONDITION', 'BRIDGE_DAMAGED'):
                has_road_blockage = True
                active_blockages += 1
            if s_type in ('LANDSLIDE_OBSERVATION', 'LANDSLIDE'):
                has_landslide = True
                active_landslides += 1

    if has_road_blockage:
        context_data['road_blockage'] = {'status': 'SUCCESS', 'value': True}
    if has_landslide:
        context_data['landslide_observation'] = {'status': 'SUCCESS', 'value': True}

    # 3. Aggregates (vehicles, requests)
    cursor.execute("SELECT request_id, latitude, longitude FROM logistics_requests WHERE status NOT IN ('DELIVERED', 'CANCELLED')")
    reqs = cursor.fetchall()
    pending_shipments = sum(1 for r in reqs if distance_km(lat, lon, r[1], r[2]) <= 40.0)
    
    cursor.execute("SELECT vehicle_id, current_latitude, current_longitude FROM vehicles")
    vehs = cursor.fetchall()
    active_vehicles = sum(1 for v in vehs if distance_km(lat, lon, v[1], v[2]) <= 40.0)
    
    # 4. Evaluate risk
    engine = DeterministicRiskEngine()
    risk_result = engine.predict(context_data)
    
    # Map risk_level to RED/ORANGE/YELLOW/GREEN
    risk_to_color = {
        "INFEASIBLE": "RED",
        "CRITICAL": "RED",
        "HIGH": "ORANGE",
        "MEDIUM": "YELLOW",
        "LOW": "GREEN",
        "INSUFFICIENT_CONTEXT": "UNAVAILABLE"
    }
    
    color_status = risk_to_color.get(risk_result['risk_level'], "UNAVAILABLE")
    
    # Modify reasons to be readable for district level
    reasons = risk_result['reasons']
    if not reasons and color_status == "GREEN":
        reasons = ["Nominal baseline conditions"]
    
    return {
        "district_id": district['id'],
        "name": district['name'],
        "state": district['state'],
        "lat": lat,
        "lon": lon,
        "status_color": color_status,
        "reasons": reasons,
        "data_points": {
            "rainfall_mm": rainfall_val if weather.get('status') == 'SUCCESS' else "UNAVAILABLE",
            "flood_risk": fl_val if flood.get('status') == 'SUCCESS' else "UNAVAILABLE",
            "landslide_risk": ls_val if landslide.get('status') == 'SUCCESS' else "UNAVAILABLE",
            "pending_shipments": pending_shipments,
            "active_vehicles": active_vehicles,
            "active_blockages": 1 if has_road_blockage else 0,
            "active_landslides": 1 if has_landslide else 0
        }
    }

def main():
    target_id = sys.argv[1] if len(sys.argv) > 1 else "ALL"
    
    simulation_override = None
    if len(sys.argv) > 2:
        try:
            simulation_override = json.loads(sys.argv[2])
        except Exception as e:
            print(json.dumps({"error": f"Invalid simulation override JSON: {str(e)}"}))
            sys.exit(1)
            
    conn = get_db_connection()
    
    try:
        results = []
        if target_id == "ALL":
            for d in DISTRICTS:
                results.append(evaluate_district(d, conn, simulation_override))
        else:
            d = next((x for x in DISTRICTS if x['id'] == target_id), None)
            if d:
                results = evaluate_district(d, conn, simulation_override)
            else:
                print(json.dumps({"error": "District not found"}))
                sys.exit(1)
                
        print(json.dumps({"status": "success", "data": results}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
