import rasterio
import math
import numpy as np

def get_tile_url(lat, lon):
    # Determine the Copernicus DEM tile filename.
    # Copernicus 30m tiles are 1x1 degree.
    # Format: Copernicus_DSM_COG_10_N26_00_E091_00_DEM.tif
    lat_deg = math.floor(lat)
    lon_deg = math.floor(lon)
    
    ns = 'N' if lat_deg >= 0 else 'S'
    ew = 'E' if lon_deg >= 0 else 'W'
    
    # Pad to 2 digits for Lat, 3 digits for Lon
    lat_str = f"{abs(lat_deg):02d}"
    lon_str = f"{abs(lon_deg):03d}"
    
    tile_id = f"Copernicus_DSM_COG_10_{ns}{lat_str}_00_{ew}{lon_str}_00_DEM"
    return f"https://copernicus-dem-30m.s3.amazonaws.com/{tile_id}/{tile_id}.tif"

def get_elevation_and_slope(lat, lon):
    url = get_tile_url(lat, lon)
    try:
        with rasterio.open(url) as src:
            # Get the pixel row/col for the coordinate
            py, px = src.index(lon, lat)
            
            # We need a 3x3 window around the pixel to calculate slope
            window = rasterio.windows.Window(px - 1, py - 1, 3, 3)
            data = src.read(1, window=window)
            
            if data.shape != (3, 3):
                return {'status': 'ERROR', 'message': 'Window out of bounds'}
            
            # Elevation at the center
            z = data[1, 1]
            
            # Calculate pixel size in meters (approximate based on latitude)
            # 1 degree lat = ~111.32 km. 1 degree lon = ~111.32 * cos(lat) km
            # src.res is in degrees
            res_x_deg = src.res[0]
            res_y_deg = src.res[1]
            
            cellsize_x = res_x_deg * 111320 * math.cos(math.radians(lat))
            cellsize_y = res_y_deg * 111320
            
            # Zevenbergen & Thorne method (3x3 grid)
            # e.g., grid:
            # z1  z2  z3
            # z4  z5  z6
            # z7  z8  z9
            
            dz_dx = ((data[0, 2] + 2*data[1, 2] + data[2, 2]) - (data[0, 0] + 2*data[1, 0] + data[2, 0])) / (8 * cellsize_x)
            dz_dy = ((data[2, 0] + 2*data[2, 1] + data[2, 2]) - (data[0, 0] + 2*data[0, 1] + data[0, 2])) / (8 * cellsize_y)
            
            slope_pct = math.sqrt(dz_dx**2 + dz_dy**2)
            slope_deg = math.degrees(math.atan(slope_pct))
            
            return {
                'status': 'SUCCESS',
                'data': {
                    'elevation_m': float(z),
                    'slope_degrees': float(slope_deg)
                }
            }
    except Exception as e:
        return {'status': 'ERROR', 'message': str(e)}

if __name__ == '__main__':
    # Test Kamrup Metro
    res = get_elevation_and_slope(26.1445, 91.7362)
    print("Kamrup:", res)
    # Test hilly terrain (Aizawl)
    res = get_elevation_and_slope(23.7307, 92.7173)
    print("Aizawl:", res)
