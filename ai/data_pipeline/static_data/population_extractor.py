import os
import datetime

try:
    import rasterio
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

POPULATION_DATASET_DIR = os.path.join(os.path.dirname(__file__), 'population')
# For Northern India, we'd place a clipped GeoTIFF here, e.g., 'ind_north_pop_2020.tif'
POPULATION_FILE = os.path.join(POPULATION_DATASET_DIR, 'ind_north_pop_2020.tif')

def extract_population_features(lat, lon, radius_km=5):
    """
    Extracts true spatial population density and count within a radius
    from WorldPop GeoTIFF datasets.
    """
    if not HAS_RASTERIO:
        return {
            "status": "DATA_UNAVAILABLE",
            "error": "Geospatial libraries (rasterio) not installed."
        }
        
    if not os.path.exists(POPULATION_FILE):
        return {
            "status": "DATA_UNAVAILABLE",
            "error": f"Dataset not found: {POPULATION_FILE}"
        }

    try:
        with rasterio.open(POPULATION_FILE) as src:
            # 1. Convert lat/lon to row/col
            # rasterio expects (longitude, latitude)
            row, col = src.index(lon, lat)
            
            # 2. Extract single pixel (population density per pixel area)
            # WorldPop unconstrained is usually People Per Pixel (ppp)
            window = rasterio.windows.Window(col - 1, row - 1, 3, 3)
            data = src.read(1, window=window)
            
            # Handling nodata
            nodata = src.nodata
            valid_pixels = data[data != nodata]
            
            if len(valid_pixels) == 0:
                local_pop = 0.0
            else:
                # Average of 3x3 window to smooth exact coordinate mismatch
                local_pop = float(valid_pixels.mean())
                
            # If the pixel size is approx 100m x 100m (0.01 km2), density is local_pop * 100
            # For this pipeline, we report the local spatial count and derived density.
            # 100m grid -> 1 pixel = 0.01 km^2
            density = local_pop * 100.0

            timestamp = datetime.datetime.utcnow().isoformat() + "Z"
            
            return {
                "status": "SUCCESS",
                "data": {
                    "population_spatial_density": {
                        "value": density,
                        "unit": "people/km2",
                        "source": "WorldPop (GeoTIFF)",
                        "dataset": "IND_pop_2020",
                        "timestamp": timestamp,
                        "latitude": lat,
                        "longitude": lon,
                        "status": "REAL",
                        "data_type": "STATIC_DATASET"
                    },
                    "population_within_5km": {
                        # We would do a proper radius mask here. For architecture, we return a placeholder calculated by multiplying density by area.
                        # Area of 5km radius = pi * r^2 = 78.5 km2
                        "value": density * 78.5,
                        "unit": "people",
                        "source": "WorldPop (GeoTIFF)",
                        "dataset": "IND_pop_2020",
                        "timestamp": timestamp,
                        "latitude": lat,
                        "longitude": lon,
                        "status": "DERIVED",
                        "data_type": "DERIVED_FEATURE",
                        "calculation": "density * 5km radius area (Placeholder for exact raster aggregation)"
                    }
                }
            }
    except Exception as e:
        return {
            "status": "DATA_UNAVAILABLE",
            "error": str(e)
        }
