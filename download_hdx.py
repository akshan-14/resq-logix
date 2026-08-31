import requests
import json

# Overpass query to get primary/trunk/unpaved roads in Kamrup Metro area (Assam)
# We will save this as our local "HDX OSM" dataset.
overpass_url = "http://overpass-api.de/api/interpreter"
overpass_query = """
[out:json];
(
  way["highway"](26.1, 91.7, 26.2, 91.8);
);
out body geom;
"""

print("Downloading OSM road segments for local dataset...")
response = requests.get(overpass_url, params={'data': overpass_query})
data = response.json()

# Convert to a simple localized GeoJSON-like structure
local_roads = []
for element in data.get('elements', []):
    if element['type'] == 'way':
        tags = element.get('tags', {})
        geom = element.get('geometry', [])
        
        # Keep only relevant attributes
        local_roads.append({
            'id': element['id'],
            'highway': tags.get('highway', 'unknown'),
            'surface': tags.get('surface', 'unknown'),
            'smoothness': tags.get('smoothness', 'unknown'),
            'bridge': tags.get('bridge', 'no'),
            'geometry': geom
        })

with open('ai/data_pipeline/static_data/local_hdx_roads.json', 'w') as f:
    json.dump(local_roads, f, indent=2)

print(f"Saved {len(local_roads)} road segments to local dataset.")
