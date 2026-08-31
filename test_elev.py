import elevation
import os
bounds = (91.5, 26.0, 92.0, 26.5) # Kamrup Metro region
try:
    elevation.clip(bounds=bounds, output=os.path.abspath('srtm_kamrup.tif'))
    print("Downloaded successfully")
except Exception as e:
    print("Failed: " + str(e))
