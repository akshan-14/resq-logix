import urllib.request
import urllib.error
import json
import datetime

def fetch_elevation(lat, lon):
    """
    Fetches real elevation data from Open-Meteo (SRTM).
    """
    url = f"https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'ResQ-Logix/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            
        elevation = data.get('elevation', [0.0])[0]
        
        return {
            "status": "SUCCESS",
            "data": {
                "elevation_m": {
                    "value": float(elevation),
                    "unit": "m",
                    "source": "open-meteo-srtm",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "status": "REAL"
                }
            }
        }
    except Exception as e:
        return {
            "status": "DATA_UNAVAILABLE",
            "error": str(e)
        }
