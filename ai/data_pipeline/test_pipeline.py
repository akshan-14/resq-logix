import unittest
from unittest.mock import patch, MagicMock
import datetime
import urllib.error

from .fetchers.weather_api import fetch_weather
from .fetchers.elevation_api import fetch_elevation
from .fetchers.routing_api import fetch_route
from .fetchers.field_reports import fetch_field_reports
from .fetchers.population_api import fetch_population
from .validator import validate_feature
from .feature_builder import build_features

class TestDataPipeline(unittest.TestCase):

    @patch('urllib.request.urlopen')
    def test_weather_success(self, mock_urlopen):
        # Mock successful JSON response
        mock_res = MagicMock()
        mock_res.read.return_value = b'{"current_weather": {"temperature": 32.5, "weathercode": 3, "time": "2026-08-29T10:00"}, "hourly": {"time": ["2026-08-29T10:00"], "precipitation": [12.4]}}'
        mock_res.__enter__.return_value = mock_res
        mock_urlopen.return_value = mock_res
        
        res = fetch_weather(28.7, 77.1)
        self.assertEqual(res['status'], 'SUCCESS')
        self.assertEqual(res['data']['rainfall_mm']['value'], 12.4)
        self.assertEqual(res['data']['rainfall_mm']['source'], 'open-meteo')
        self.assertEqual(res['data']['rainfall_mm']['status'], 'REAL')

    @patch('ai.data_pipeline.fetchers.population_api._load_cache')
    @patch('urllib.request.urlopen')
    def test_population_success_no_cache(self, mock_urlopen, mock_load_cache):
        mock_load_cache.return_value = {}
        
        # Mock Nominatim
        mock_nom = MagicMock()
        mock_nom.read.return_value = b'{"address": {"city": "Delhi"}}'
        mock_nom.__enter__.return_value = mock_nom
        
        # Mock Open-Meteo
        mock_om = MagicMock()
        mock_om.read.return_value = b'{"results": [{"population": 11000000}]}'
        mock_om.__enter__.return_value = mock_om
        
        mock_urlopen.side_effect = [mock_nom, mock_om]
        
        res = fetch_population(28.7, 77.1)
        self.assertEqual(res['status'], 'SUCCESS')
        self.assertEqual(res['data']['population']['value'], 11000000)
        self.assertEqual(res['data']['population']['status'], 'REAL')
        self.assertEqual(res['data']['population']['data_type'], 'STATIC_DATASET')

    @patch('ai.data_pipeline.fetchers.population_api._load_cache')
    def test_population_cache_hit(self, mock_load_cache):
        mock_load_cache.return_value = {
            "28.7_77.1": {
                "value": 11000000,
                "source": "Nominatim (Delhi) + Open-Meteo",
                "timestamp": "2026-08-29T10:00:00Z"
            }
        }
        
        res = fetch_population(28.7041, 77.1025)
        self.assertEqual(res['status'], 'SUCCESS')
        self.assertEqual(res['data']['population']['value'], 11000000)
        self.assertEqual(res['data']['population']['source'], 'Nominatim (Delhi) + Open-Meteo')

    @patch('urllib.request.urlopen')
    def test_api_failure_timeout(self, mock_urlopen):
        # Mock URLError for timeout
        mock_urlopen.side_effect = urllib.error.URLError("Connection timed out")
        
        res = fetch_weather(28.7, 77.1)
        self.assertEqual(res['status'], 'DATA_UNAVAILABLE')
        self.assertTrue('timed out' in res['error'])

    @patch('urllib.request.urlopen')
    def test_malformed_response(self, mock_urlopen):
        mock_res = MagicMock()
        mock_res.read.return_value = b'{invalid_json}'
        mock_res.__enter__.return_value = mock_res
        mock_urlopen.return_value = mock_res
        
        res = fetch_elevation(28.7, 77.1)
        self.assertEqual(res['status'], 'DATA_UNAVAILABLE')
        self.assertTrue('Expecting property name' in res['error'])

    def test_validator_valid_feature(self):
        feature = {
            "value": 12.4,
            "unit": "mm",
            "source": "open-meteo",
            "timestamp": "2026-08-29T10:00:00Z",
            "status": "REAL"
        }
        self.assertTrue(validate_feature(feature))

    def test_validator_missing_field(self):
        feature = {
            "value": 12.4,
            "unit": "mm",
            # Missing source
            "timestamp": "2026-08-29T10:00:00Z",
            "status": "REAL"
        }
        self.assertFalse(validate_feature(feature))
        
    def test_validator_invalid_units_or_value(self):
        feature = {
            "value": "high", # Should be numeric
            "unit": "mm",
            "source": "open-meteo",
            "timestamp": "2026-08-29T10:00:00Z",
            "status": "REAL"
        }
        self.assertFalse(validate_feature(feature))

    def test_validator_stale_or_unavailable(self):
        feature = {
            "value": None,
            "unit": "severity",
            "source": "logistics-db",
            "timestamp": "2026-08-29T10:00:00Z",
            "status": "UNAVAILABLE" # Unavailable is allowed to have None value
        }
        self.assertTrue(validate_feature(feature))

    @patch('ai.data_pipeline.feature_builder.extract_flood_hazard')
    @patch('ai.data_pipeline.feature_builder.extract_landslide_hazard')
    @patch('ai.data_pipeline.feature_builder.extract_terrain_features')
    @patch('ai.data_pipeline.feature_builder.extract_population_features')
    @patch('ai.data_pipeline.feature_builder.fetch_population')
    @patch('ai.data_pipeline.feature_builder.fetch_field_reports')
    @patch('ai.data_pipeline.feature_builder.fetch_route')
    @patch('ai.data_pipeline.feature_builder.fetch_elevation')
    @patch('ai.data_pipeline.feature_builder.fetch_weather')
    def test_feature_builder_provenance(self, mock_w, mock_e, mock_r, mock_f, mock_p, mock_pop_static, mock_dem, mock_ls, mock_flood):
        # Mock successful fetches
        mock_w.return_value = {"status": "SUCCESS", "data": {"rainfall_mm": {"value": 10.0, "unit": "mm", "source": "open-meteo", "timestamp": "tz", "status": "REAL"}}}
        mock_e.return_value = {"status": "SUCCESS", "data": {"elevation_m": {"value": 200.0, "unit": "m", "source": "open-meteo-srtm", "timestamp": "tz", "status": "REAL"}}}
        mock_r.return_value = {"status": "SUCCESS", "data": {"distance_km": {"value": 50.0, "unit": "km", "source": "osrm", "timestamp": "tz", "status": "REAL"}}}
        mock_f.return_value = {"status": "SUCCESS", "data": {"sos_count": {"value": 5, "unit": "count", "source": "logistics-db", "timestamp": "tz", "status": "DERIVED"}, "road_blockage": {"value": None, "unit": "none", "source": "db", "timestamp": "tz", "status": "UNAVAILABLE"}}}
        mock_p.return_value = {"status": "SUCCESS", "data": {"population": {"value": 1000, "unit": "people", "source": "open-meteo", "timestamp": "tz", "status": "REAL", "data_type": "STATIC_DATASET"}}}
        
        # Mock Static Geospatial
        mock_pop_static.return_value = {"status": "SUCCESS", "data": {"population_spatial_density": {"value": 250.0, "unit": "people/km2", "source": "WorldPop", "timestamp": "tz", "status": "REAL"}}}
        mock_dem.return_value = {"status": "SUCCESS", "data": {"slope_degrees": {"value": 15.2, "unit": "degrees", "source": "SRTM", "timestamp": "tz", "status": "DERIVED"}}}
        mock_ls.return_value = {"status": "SUCCESS", "data": {"historical_landslide_susceptibility": {"value": 0.8, "unit": "index", "source": "ISRO", "timestamp": "tz", "status": "HISTORICAL"}}}
        mock_flood.return_value = {"status": "DATA_UNAVAILABLE", "error": "file missing"}
        
        result = build_features(28.0, 77.0, 28.5, 77.5, mode="LIVE")
        
        self.assertEqual(result['mode'], 'LIVE')
        features = result['features']
        
        # Provenance checks
        self.assertEqual(features['rainfall_mm']['source'], 'open-meteo')
        self.assertEqual(features['rainfall_mm']['status'], 'REAL')
        self.assertEqual(features['distance_km']['value'], 50.0)
        
        # Static population should override API population if available
        self.assertEqual(features['population_spatial_density']['value'], 250.0)
        self.assertEqual(features['population_spatial_density']['source'], 'WorldPop')
        
        # DEM and Landslide should be present
        self.assertEqual(features['slope_degrees']['value'], 15.2)
        self.assertEqual(features['historical_landslide_susceptibility']['value'], 0.8)
        
        # Flood was unavailable, should fallback
        self.assertEqual(features['historical_flood_susceptibility']['status'], 'UNAVAILABLE')
        self.assertIsNone(features['historical_flood_susceptibility']['value'])
        
        # Missing field report gracefully degrades to UNAVAILABLE, not crash
        self.assertEqual(features['road_blockage']['status'], 'UNAVAILABLE')
        
    def test_demo_mode_bypass(self):
        result = build_features(28.0, 77.0, 28.5, 77.5, mode="DEMO")
        self.assertEqual(result['mode'], 'DEMO')
        # All live features should be forced UNAVAILABLE since we bypass live fetch
        self.assertEqual(result['features']['rainfall_mm']['status'], 'UNAVAILABLE')
        self.assertEqual(result['features']['slope_degrees']['status'], 'UNAVAILABLE')

if __name__ == '__main__':
    unittest.main()
