import os
import datetime

try:
    import rasterio
    HAS_GEO = True
except ImportError:
    HAS_GEO = False

LS_DATASET_DIR = os.path.join(os.path.dirname(__file__), 'landslide')
LS_FILE = os.path.join(LS_DATASET_DIR, 'isro_landslide_susceptibility.tif')

def extract_landslide_hazard(lat, lon):
    """
    Extracts static landslide susceptibility (hazard risk) from an ISRO/NRSC GeoTIFF.
    This replaces synthetic landslide_risk. 
    NOTE: This is HISTORICAL RISK, not a current observation.
    """
    if not HAS_GEO:
        return {
            "status": "DATA_UNAVAILABLE",
            "error": "Geospatial libraries not installed."
        }
        
    if not os.path.exists(LS_FILE):
        return {
            "status": "DATA_UNAVAILABLE",
            "error": f"Dataset not found: {LS_FILE}"
        }

    try:
        with rasterio.open(LS_FILE) as src:
            row, col = src.index(lon, lat)
            val = src.read(1, window=rasterio.windows.Window(col, row, 1, 1))[0,0]
            
            if val == src.nodata:
                return {
                    "status": "DATA_UNAVAILABLE",
                    "error": "Coordinate falls in nodata region."
                }
                
            # Assuming values 0.0 to 1.0 mapping to low/high hazard
            hazard_score = float(val)

            timestamp = datetime.datetime.utcnow().isoformat() + "Z"
            
            return {
                "status": "SUCCESS",
                "data": {
                    "historical_landslide_susceptibility": {
                        "value": hazard_score,
                        "unit": "index",
                        "source": "ISRO Landslide Atlas",
                        "dataset": "ISRO_Landslide_Susceptibility_v1",
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
