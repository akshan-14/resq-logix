import os
import datetime

try:
    import rasterio
    HAS_GEO = True
except ImportError:
    HAS_GEO = False

FLOOD_DATASET_DIR = os.path.join(os.path.dirname(__file__), 'flood')
FLOOD_FILE = os.path.join(FLOOD_DATASET_DIR, 'copernicus_historical_flood_risk.tif')

def extract_flood_hazard(lat, lon):
    """
    Extracts static flood hazard from a Copernicus / NDEM GeoTIFF.
    This replaces synthetic flood_risk. 
    NOTE: This is HISTORICAL RISK, not a current inundation observation.
    """
    if not HAS_GEO:
        return {
            "status": "DATA_UNAVAILABLE",
            "error": "Geospatial libraries not installed."
        }
        
    if not os.path.exists(FLOOD_FILE):
        return {
            "status": "DATA_UNAVAILABLE",
            "error": f"Dataset not found: {FLOOD_FILE}"
        }

    try:
        with rasterio.open(FLOOD_FILE) as src:
            row, col = src.index(lon, lat)
            val = src.read(1, window=rasterio.windows.Window(col, row, 1, 1))[0,0]
            
            if val == src.nodata:
                return {
                    "status": "DATA_UNAVAILABLE",
                    "error": "Coordinate falls in nodata region."
                }
                
            hazard_score = float(val)

            timestamp = datetime.datetime.utcnow().isoformat() + "Z"
            
            return {
                "status": "SUCCESS",
                "data": {
                    "historical_flood_susceptibility": {
                        "value": hazard_score,
                        "unit": "index",
                        "source": "Copernicus EMS / NDEM",
                        "dataset": "Flood_Hazard_Index",
                        "timestamp": timestamp,
                        "latitude": lat,
                        "longitude": lon,
                        "status": "HISTORICAL",
                        "data_type": "STATIC_DATASET"
                    }
                }
            }
    except Exception as e:
        return {
            "status": "DATA_UNAVAILABLE",
            "error": str(e)
        }
