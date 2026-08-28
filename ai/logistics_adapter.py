import json
import os

class LogisticsContextAdapter:
    """
    Adapter to convert the future /logistics/ai-context endpoint payload
    into validated internal data structures for the Decision Engine.
    """
    def __init__(self, data=None):
        self.mode = "DEMO"
        if data is not None:
            self.raw_data = data
            self.mode = "PASSED_DATA"
        else:
            api_url = os.environ.get('LOGISTICS_API_URL')
            if api_url:
                print(f"[LogisticsContextAdapter] LIVE mode enabled. Connecting to {api_url}")
                import urllib.request
                import urllib.error
                try:
                    req = urllib.request.Request(f"{api_url}/logistics/ai-context")
                    with urllib.request.urlopen(req, timeout=10) as response:
                        res = json.loads(response.read().decode())
                        self.raw_data = res.get('data', {}) if 'data' in res else res
                    self.mode = "LIVE"
                except urllib.error.URLError as e:
                    print(f"[LogisticsContextAdapter] WARNING: Live connection failed ({e}). Falling back to DEMO.")
                    self._load_demo()
                except json.JSONDecodeError as e:
                    print(f"[LogisticsContextAdapter] WARNING: Malformed JSON from live API ({e}). Falling back to DEMO.")
                    self._load_demo()
                except Exception as e:
                    print(f"[LogisticsContextAdapter] WARNING: Unexpected error ({e}). Falling back to DEMO.")
                    self._load_demo()
            else:
                self._load_demo()

    def _load_demo(self):
        demo_path = os.path.join(os.path.dirname(__file__), 'data', 'logistics_context_demo.json')
        try:
            with open(demo_path, 'r') as f:
                self.raw_data = json.load(f)
        except Exception as e:
            print(f"[LogisticsContextAdapter] CRITICAL ERROR: Could not load demo data: {e}")
            self.raw_data = {}

    def get_vehicles(self):
        vehicles = self.raw_data.get('vehicles', [])
        valid_vehicles = []
        for v in vehicles:
            if v.get('capacity', -1) < 0:
                continue # Reject negative capacity
            if 'current_latitude' not in v or 'current_longitude' not in v:
                continue
            valid_vehicles.append(v)
        return valid_vehicles

    def get_warehouses(self):
        warehouses = self.raw_data.get('warehouses', [])
        valid_warehouses = []
        for w in warehouses:
            if 'latitude' not in w or 'longitude' not in w:
                continue
            valid_warehouses.append(w)
        return valid_warehouses

    def get_resources(self):
        resources = self.raw_data.get('resources', [])
        for r in resources:
            # Live API provides available_quantity directly, demo provides quantity.
            if 'available_quantity' not in r:
                base_qty = r.get('quantity', r.get('total_quantity', 0))
                r['available_quantity'] = max(0, base_qty - r.get('reserved_quantity', 0))
        return resources

    def get_request(self, request_id):
        requests = self.raw_data.get('requests', [])
        for req in requests:
            if req.get('request_id') == request_id:
                if req.get('quantity', 0) <= 0:
                    raise ValueError(f"Request {request_id} has invalid/zero quantity.")
                return req
        raise ValueError(f"Request {request_id} not found in logistics context.")

    def get_all_requests(self):
        return self.raw_data.get('requests', [])
