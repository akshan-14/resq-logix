import urllib.request
import urllib.error
import json
import datetime

def fetch_weather(lat, lon):
    """
    Fetches real weather data from Open-Meteo.
    """
    # Using current weather
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&hourly=precipitation&timezone=auto"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'ResQ-Logix/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            
        current = data.get('current_weather', {})
        # approximate rainfall by getting the current hour's precipitation
        hourly = data.get('hourly', {})
        precipitation = 0.0
        
        if 'time' in hourly and 'precipitation' in hourly:
            # find index closest to now
            now_iso = current.get('time', '')
            if now_iso in hourly['time']:
                idx = hourly['time'].index(now_iso)
                precipitation = hourly['precipitation'][idx]
            else:
                precipitation = hourly['precipitation'][0] if hourly['precipitation'] else 0.0

        return {
            "status": "SUCCESS",
            "data": {
                "rainfall_mm": {
                    "value": float(precipitation),
                    "unit": "mm",
                    "source": "open-meteo",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "status": "REAL"
                },
                "temperature": {
                    "value": float(current.get('temperature', 0.0)),
                    "unit": "celsius",
                    "source": "open-meteo",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "status": "REAL"
                },
                "weathercode": {
                    "value": int(current.get('weathercode', 0)),
                    "unit": "wmo_code",
                    "source": "open-meteo",
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
