import json
import os

class LogisticsContextAdapter:
    """
    Adapter to convert the future /logistics/ai-context endpoint payload
    into validated internal data structures for the Decision Engine.
    """
    def __init__(self, data=None):
        if data is None:
            # Fallback to demo file if no data passed
            demo_path = os.path.join(os.path.dirname(__file__), 'data', 'logistics_context_demo.json')
            with open(demo_path, 'r') as f:
                self.raw_data = json.load(f)
        else:
            self.raw_data = data

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
            r['available_quantity'] = max(0, r.get('quantity', 0) - r.get('reserved_quantity', 0))
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
