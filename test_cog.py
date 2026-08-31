import rasterio

url = 'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N26_00_E091_00_DEM/Copernicus_DSM_COG_10_N26_00_E091_00_DEM.tif'

try:
    with rasterio.open(url) as src:
        print("Successfully opened COG 30m DEM!")
        print("Bounds:", src.bounds)
        # Sample at 26.1445, 91.7362
        for val in src.sample([(91.7362, 26.1445)]):
            print("Elevation at Kamrup:", val[0])
except Exception as e:
    print("Error:", e)
