import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';", "import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
