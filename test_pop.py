import urllib.request
import urllib.parse
import json

def get_pop(lat, lon):
    # 1. Reverse geocode via Nominatim
    nom_url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
    req1 = urllib.request.Request(nom_url, headers={'User-Agent': 'ResQ-Logix/1.0'})
    with urllib.request.urlopen(req1) as res:
        nom_data = json.loads(res.read().decode())
        
    address = nom_data.get('address', {})
    city_name = address.get('city') or address.get('town') or address.get('county') or address.get('state_district')
    print("Found location:", city_name)
    
    if not city_name:
        return None
        
    # 2. Search Open-Meteo Geocoding
    om_url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(city_name)}&count=1&format=json"
    req2 = urllib.request.Request(om_url, headers={'User-Agent': 'ResQ-Logix/1.0'})
    with urllib.request.urlopen(req2) as res:
        om_data = json.loads(res.read().decode())
        
    results = om_data.get('results', [])
    if not results:
        return None
        
    return results[0].get('population')

print(get_pop(28.7041, 77.1025))
