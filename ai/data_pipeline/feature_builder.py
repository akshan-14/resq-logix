import datetime
from .fetchers.weather_api import fetch_weather
from .fetchers.elevation_api import fetch_elevation
from .fetchers.routing_api import fetch_route
from .fetchers.field_reports import fetch_field_reports
from .fetchers.population_api import fetch_population
from .validator import validate_feature

from .static_data.population_extractor import extract_population_features
from .static_data.dem_extractor import extract_terrain_features
from .static_data.landslide_extractor import extract_landslide_hazard
from .static_data.flood_extractor import extract_flood_hazard

def build_features(lat, lon, dest_lat, dest_lon, mode="LIVE", db_path=None):
    """
    Builds the combined real-data feature context for Phase 4 and Phase 5.
    mode can be "LIVE" or "DEMO".
    """
    context = {}
    
    # 1. Fetch from APIs
    weather_res = fetch_weather(lat, lon) if mode != "DEMO" else {"status": "DATA_UNAVAILABLE"}
    elev_res = fetch_elevation(lat, lon) if mode != "DEMO" else {"status": "DATA_UNAVAILABLE"}
    route_res = fetch_route(lat, lon, dest_lat, dest_lon) if mode != "DEMO" else {"status": "DATA_UNAVAILABLE"}
    field_res = fetch_field_reports(db_path) if mode != "DEMO" else {"status": "DATA_UNAVAILABLE"}
    pop_api_res = fetch_population(lat, lon) if mode != "DEMO" else {"status": "DATA_UNAVAILABLE"}
    
    # 2. Extract from Static Geospatial Datasets
    pop_static_res = extract_population_features(lat, lon) if mode != "DEMO" else {"status": "DATA_UNAVAILABLE"}
    dem_static_res = extract_terrain_features(lat, lon) if mode != "DEMO" else {"status": "DATA_UNAVAILABLE"}
    ls_static_res = extract_landslide_hazard(lat, lon) if mode != "DEMO" else {"status": "DATA_UNAVAILABLE"}
    flood_static_res = extract_flood_hazard(lat, lon) if mode != "DEMO" else {"status": "DATA_UNAVAILABLE"}
    
    # Combine results
    if weather_res['status'] == 'SUCCESS':
        context.update(weather_res['data'])
    else:
        context['rainfall_mm'] = {"value": None, "unit": "mm", "source": "open-meteo", "timestamp": "", "status": "UNAVAILABLE"}
        
    if elev_res['status'] == 'SUCCESS':
        context.update(elev_res['data'])
    else:
        context['elevation_m'] = {"value": None, "unit": "m", "source": "open-meteo-srtm", "timestamp": "", "status": "UNAVAILABLE"}
        
    if route_res['status'] == 'SUCCESS':
        context.update(route_res['data'])
    else:
        context['distance_km'] = {"value": None, "unit": "km", "source": "osrm", "timestamp": "", "status": "UNAVAILABLE"}
        
    if field_res['status'] == 'SUCCESS':
        context.update(field_res['data'])
    else:
        # Defaults for unavailable DB
        for key in ['sos_count', 'medical_emergency_count', 'road_blockage', 'bridge_condition']:
            context[key] = {"value": None, "unit": "unknown", "source": "logistics-db", "timestamp": "", "status": "UNAVAILABLE"}

    # Population Integration (Prefer true static spatial raster over API if available)
    if pop_static_res['status'] == 'SUCCESS':
        context.update(pop_static_res['data'])
    elif pop_api_res['status'] == 'SUCCESS':
        context.update(pop_api_res['data'])
    else:
        context['population'] = {"value": None, "unit": "people", "source": "online-api/raster", "timestamp": "", "status": "UNAVAILABLE"}

    # Static Geospatial Integrations
    if dem_static_res['status'] == 'SUCCESS':
        context.update(dem_static_res['data'])
    else:
        context['slope_degrees'] = {"value": None, "unit": "degrees", "source": "SRTM", "timestamp": "", "status": "UNAVAILABLE"}
        
    if ls_static_res['status'] == 'SUCCESS':
        context.update(ls_static_res['data'])
    else:
        context['historical_landslide_susceptibility'] = {"value": None, "unit": "index", "source": "ISRO", "timestamp": "", "status": "UNAVAILABLE"}
        
    if flood_static_res['status'] == 'SUCCESS':
        context.update(flood_static_res['data'])
    else:
        context['historical_flood_susceptibility'] = {"value": None, "unit": "index", "source": "Copernicus", "timestamp": "", "status": "UNAVAILABLE"}

    # Validate all built features
    for key, feature in context.items():
        if not validate_feature(feature):
            # Downgrade to UNAVAILABLE if validation fails
            context[key]['status'] = 'UNAVAILABLE'
            context[key]['value'] = None
            
    return {
        "mode": mode,
        "features": context
    }
