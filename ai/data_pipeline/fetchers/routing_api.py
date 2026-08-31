import urllib.request
import urllib.error
import json
import datetime
import sys
import math

def distance_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def decode_polyline(polyline_str):
    index, lat, lng = 0, 0, 0
    coordinates = []
    changes = {'latitude': 0, 'longitude': 0}
    while index < len(polyline_str):
        for unit in ['latitude', 'longitude']: 
            shift, result = 0, 0
            while True:
                byte = ord(polyline_str[index]) - 63
                index+=1
                result |= (byte & 0x1f) << shift
                shift += 5
                if not byte >= 0x20:
                    break
            if (result & 1):
                changes[unit] = ~(result >> 1)
            else:
                changes[unit] = (result >> 1)
        lat += changes['latitude']
        lng += changes['longitude']
        coordinates.append((lat / 100000.0, lng / 100000.0))
    return coordinates

def fetch_route(start_lat, start_lon, end_lat, end_lon, block_lat=None, block_lon=None, block_radius_km=None):
    """
    Fetches real road distance and routing info from OSRM.
    If block parameters are provided, requests alternatives=true and tries to find a route avoiding the blockage.
    """
    url = f"http://router.project-osrm.org/route/v1/driving/{start_lon},{start_lat};{end_lon},{end_lat}"
    
    if block_lat is not None:
        url += "?overview=full&alternatives=true"
    else:
        url += "?overview=false"
        
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'ResQ-Logix/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            
        if data.get('code') != 'Ok' or not data.get('routes'):
            return {
                "status": "DATA_UNAVAILABLE",
                "error": f"OSRM returned non-Ok code: {data.get('code')}"
            }
            
        routes = data['routes']
        
        if block_lat is not None:
            # Evaluate alternatives to find one that avoids the blockage
            best_route = None
            for route in routes:
                geom = route.get('geometry')
                if not geom:
                    continue
                coords = decode_polyline(geom)
                
                # Check if this route intersects the blockage
                intersects = False
                for c_lat, c_lon in coords:
                    if distance_km(c_lat, c_lon, float(block_lat), float(block_lon)) <= float(block_radius_km):
                        intersects = True
                        break
                
                if not intersects:
                    best_route = route
                    break
                    
            if not best_route:
                return {
                    "status": "NO_ALTERNATIVE",
                    "error": "NO ALTERNATIVE ROUTE AVAILABLE",
                    "data": { "alternative_route_available": False }
                }
            
            return {
                "status": "SUCCESS",
                "data": {
                    "alternative_route_available": True,
                    "distance_km": float(best_route.get('distance', 0.0)) / 1000.0,
                    "duration_seconds": float(best_route.get('duration', 0.0)),
                    "geometry": best_route.get('geometry')
                }
            }
        else:
            route = routes[0]
            distance_meters = route.get('distance', 0.0)
            return {
                "status": "SUCCESS",
                "data": {
                    "distance_km": {
                        "value": float(distance_meters) / 1000.0,
                        "unit": "km",
                        "source": "osrm",
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

if __name__ == '__main__':
    if len(sys.argv) >= 5:
        slat = sys.argv[1]
        slon = sys.argv[2]
        elat = sys.argv[3]
        elon = sys.argv[4]
        
        blat = sys.argv[5] if len(sys.argv) > 5 else None
        blon = sys.argv[6] if len(sys.argv) > 6 else None
        brad = sys.argv[7] if len(sys.argv) > 7 else None
        
        print(json.dumps(fetch_route(slat, slon, elat, elon, blat, blon, brad)))

