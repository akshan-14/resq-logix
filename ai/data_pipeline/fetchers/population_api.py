import urllib.request
import urllib.parse
import urllib.error
import json
import datetime
import os

CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'cache', 'population_cache.json')

def _load_cache():
    if not os.path.exists(CACHE_FILE):
        return {}
    try:
        with open(CACHE_FILE, 'r') as f:
            return json.load(f)
    except Exception:
        return {}

def _save_cache(cache):
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache, f, indent=2)
    except Exception:
        pass

def fetch_population(lat, lon):
    """
    Fetches real online population data.
    Uses Nominatim for reverse geocoding to identify the administrative region,
    then queries Open-Meteo Geocoding (which sources from national censuses) for the population.
    Implements local caching based on rounded coordinates to avoid excessive API calls.
    """
    # Round coordinates to ~1.1km grid for caching to reduce API abuse
    cache_key = f"{round(float(lat), 2)}_{round(float(lon), 2)}"
    
    cache = _load_cache()
    if cache_key in cache:
        cached_entry = cache[cache_key]
        return {
            "status": "SUCCESS",
            "data": {
                "population": {
                    "value": cached_entry['value'],
                    "unit": "people",
                    "source": cached_entry['source'],
                    "dataset": "Census via Open-Meteo",
                    "timestamp": cached_entry['timestamp'],
                    "latitude": lat,
                    "longitude": lon,
                    "status": "REAL",
                    "data_type": "STATIC_DATASET"
                }
            }
        }
        
    try:
        # 1. Reverse geocode via Nominatim
        nom_url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
        req1 = urllib.request.Request(nom_url, headers={'User-Agent': 'ResQ-Logix/1.0'})
        with urllib.request.urlopen(req1, timeout=10) as res:
            nom_data = json.loads(res.read().decode())
            
        address = nom_data.get('address', {})
        # Fallbacks for admin regions
        region_name = address.get('city') or address.get('town') or address.get('county') or address.get('state_district')
        
        if not region_name:
            return {
                "status": "DATA_UNAVAILABLE",
                "error": "Could not identify administrative region for these coordinates."
            }
            
        # 2. Search Open-Meteo Geocoding
        om_url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(region_name)}&count=1&format=json"
        req2 = urllib.request.Request(om_url, headers={'User-Agent': 'ResQ-Logix/1.0'})
        with urllib.request.urlopen(req2, timeout=10) as res:
            om_data = json.loads(res.read().decode())
            
        results = om_data.get('results', [])
        if not results:
            return {
                "status": "DATA_UNAVAILABLE",
                "error": f"No population data found for region: {region_name}"
            }
            
        population = results[0].get('population')
        
        if population is None or population < 0:
            return {
                "status": "DATA_UNAVAILABLE",
                "error": f"Invalid or missing population value for region: {region_name}"
            }
            
        # Save to cache
        cache[cache_key] = {
            "value": int(population),
            "source": f"Nominatim ({region_name}) + Open-Meteo",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }
        _save_cache(cache)
        
        return {
            "status": "SUCCESS",
            "data": {
                "population": {
                    "value": int(population),
                    "unit": "people",
                    "source": f"Nominatim ({region_name}) + Open-Meteo",
                    "dataset": "Census via Open-Meteo",
                    "timestamp": cache[cache_key]['timestamp'],
                    "latitude": lat,
                    "longitude": lon,
                    "status": "REAL",
                    "data_type": "STATIC_DATASET"
                }
            }
        }
    except Exception as e:
        return {
            "status": "DATA_UNAVAILABLE",
            "error": str(e)
        }
