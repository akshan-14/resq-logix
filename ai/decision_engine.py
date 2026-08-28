import math
from predict_accessibility import AccessibilityMLModel
from predict_priority import PriorityIntelligenceModel

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate geographic straight-line distance (prototype ranking only)"""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class ResQDecisionEngine:
    def __init__(self):
        self.acc_model = AccessibilityMLModel()
        self.pri_model = PriorityIntelligenceModel()

        # Capability mapping prototype (supports DEMO and LIVE types)
        self.capability_map = {
            "STANDARD": {"max_risk": 40, "medical_ok": False},
            "OFFROAD": {"max_risk": 90, "medical_ok": False},
            "MEDICAL": {"max_risk": 60, "medical_ok": True},
            "HEAVY_SUPPLY": {"max_risk": 50, "medical_ok": False},
            "EMERGENCY": {"max_risk": 100, "medical_ok": True},
            # LIVE API Types
            "Ambulance": {"max_risk": 60, "medical_ok": True},
            "Supply Truck": {"max_risk": 50, "medical_ok": False},
            "Rescue Vehicle": {"max_risk": 90, "medical_ok": True},
            "Water Tanker": {"max_risk": 50, "medical_ok": False},
            "Van": {"max_risk": 40, "medical_ok": False}
        }

    def _normalize_unit(self, value, unit):
        """Converts common units to a base unit for safe comparison."""
        if not unit:
            return value, ""
        u = str(unit).strip().lower()
        if u in ['kg', 'kilogram', 'kilograms']:
            return value * 1000, 'g'
        elif u in ['g', 'gram', 'grams']:
            return value, 'g'
        elif u in ['t', 'ton', 'tons']:
            return value * 1000000, 'g'
        elif u in ['l', 'liter', 'liters', 'litre', 'litres']:
            return value * 1000, 'ml'
        elif u in ['ml', 'milliliter', 'milliliters']:
            return value, 'ml'
        # Treat others as discrete items
        if u.endswith('s') and len(u) > 1: # Basic singularization for 'boxes', 'units'
            if u == 'boxes': return value, 'box'
            return value, u[:-1]
        return value, u

    def recommend(self, request, vehicles, warehouses, resources):
        req_id = request.get('request_id', 'UNKNOWN')
        req_lat = request.get('latitude')
        req_lon = request.get('longitude')
        req_resource = request.get('requested_resource')
        
        req_base_qty, req_base_unit = self._normalize_unit(request.get('quantity', 0), request.get('unit', ''))
        
        # 1. Run ML Intelligence Context
        context_data = request.get('context', {})
        
        # Accessibility (Phase 4)
        acc_result = self.acc_model.predict(context_data)
        context_data['accessibility_score'] = acc_result['accessibility_score']
        context_data['accessibility_risk'] = 100 - acc_result['accessibility_score']
        
        # Priority (Phase 5)
        pri_result = self.pri_model.predict(context_data)
        
        is_medical = "medic" in str(req_resource).lower() or context_data.get('medical_emergency_count', 0) > 0
        
        # 2. Filter Warehouses (Hard Constraints)
        feasible_warehouses = []
        warehouse_rejection_reasons = set()
        
        for w in warehouses:
            if w.get('status') not in ['ACTIVE', 'OPERATIONAL']:
                continue
            
            # Check inventory for this warehouse ensuring unit compatibility
            wh_resources = [r for r in resources if r.get('warehouse_id') == w.get('warehouse_id') and r.get('resource_type') == req_resource]
            
            available_qty = 0
            unit_mismatch_found = False
            for r in wh_resources:
                r_base_qty, r_base_unit = self._normalize_unit(r.get('available_quantity', 0), r.get('unit', ''))
                if r_base_unit == req_base_unit:
                    available_qty += r_base_qty
                else:
                    unit_mismatch_found = True
                    
            if available_qty >= req_base_qty:
                dist = haversine_distance(req_lat, req_lon, w['latitude'], w['longitude'])
                feasible_warehouses.append({
                    "warehouse": w,
                    "distance_km": dist,
                    "score": 1000 - dist # Simple ranking: closer is better
                })
            elif unit_mismatch_found:
                warehouse_rejection_reasons.add(f"{w.get('warehouse_id')}: inventory unit is incompatible with requested unit {request.get('unit')}")
                
        if not feasible_warehouses:
            reasons = ["No operational warehouse has sufficient available inventory for requested resource."]
            if warehouse_rejection_reasons:
                reasons.extend(list(warehouse_rejection_reasons))
            return {
                "request_id": req_id,
                "recommendation_status": "NO_FEASIBLE_WAREHOUSE",
                "recommendation": None,
                "reasons": reasons
            }
            
        # Select best warehouse
        feasible_warehouses.sort(key=lambda x: x['score'], reverse=True)
        best_warehouse_info = feasible_warehouses[0]
        best_wh = best_warehouse_info['warehouse']
        
        # 3. Filter Vehicles (Hard Constraints)
        feasible_vehicles = []
        acc_risk = context_data['accessibility_risk']
        vehicle_rejection_reasons = set()
        
        for v in vehicles:
            if v.get('status') != 'AVAILABLE' or not v.get('availability'):
                continue
                
            v_base_cap, v_base_unit = self._normalize_unit(v.get('capacity', 0), v.get('capacity_unit', ''))
            if v_base_unit != req_base_unit:
                vehicle_rejection_reasons.add(f"{v.get('vehicle_id')}: capacity unit {v.get('capacity_unit')} is incompatible with requested unit {request.get('unit')}")
                continue
                
            if v_base_cap < req_base_qty:
                continue
            
            # Capability filtering
            v_type = v.get('vehicle_type', 'STANDARD')
            caps = self.capability_map.get(v_type, self.capability_map["STANDARD"])
            
            if acc_risk > caps['max_risk']:
                vehicle_rejection_reasons.add(f"{v.get('vehicle_id')}: sufficient capacity, but rejected because route risk {acc_risk} exceeds vehicle capability limit {caps['max_risk']}")
                continue # Terrain too difficult for this vehicle
                
            dist_to_wh = haversine_distance(v['current_latitude'], v['current_longitude'], best_wh['latitude'], best_wh['longitude'])
            dist_wh_to_dest = best_warehouse_info['distance_km']
            total_dist = dist_to_wh + dist_wh_to_dest
            
            # Very basic fuel check mapping
            if v.get('fuel_level', 100) < (total_dist * 0.1): # assuming 10% per km for prototype
                vehicle_rejection_reasons.add(f"{v.get('vehicle_id')}: sufficient capacity, but rejected because fuel level is insufficient for distance {total_dist:.1f}km")
                continue
                
            # Score Vehicle
            v_score = 1000 - total_dist # Base score: minimize total distance
            if is_medical and caps['medical_ok']:
                v_score += 500 # Strong preference for medical vehicles for medical emergencies
                
            feasible_vehicles.append({
                "vehicle": v,
                "total_dist_km": total_dist,
                "score": v_score
            })
            
        if not feasible_vehicles:
            reasons = ["No available vehicle has sufficient capacity or capability for this route."]
            if vehicle_rejection_reasons:
                reasons.extend(list(vehicle_rejection_reasons))
            return {
                "request_id": req_id,
                "recommendation_status": "NO_FEASIBLE_VEHICLE",
                "recommendation": None,
                "reasons": reasons
            }
            
        # Select best vehicle
        feasible_vehicles.sort(key=lambda x: x['score'], reverse=True)
        best_vehicle_info = feasible_vehicles[0]
        best_v = best_vehicle_info['vehicle']
        
        # 4. Route Analysis & Warnings
        warnings = ["Prototype uses geographic distance rather than road routing."]
        if acc_risk >= 70:
            warnings.append("Critical route accessibility.")
        elif acc_risk >= 40:
            warnings.append("High route risk.")
            
        if acc_result['accessibility_score'] < 40:
            warnings.append("Low accessibility.")
            
        if pri_result.get('operational_flags'):
            for flag in pri_result['operational_flags']:
                warnings.append(flag)

        # 5. Build Reasons
        reasons = [
            f"Requested resource '{req_resource}' is available",
            "Warehouse can fulfill the requested quantity",
            "Vehicle is available and active",
            "Vehicle has sufficient capacity",
            "Vehicle capability matches route terrain difficulty",
            "Geographic distance optimized"
        ]
        if pri_result['priority_level'] == 'CRITICAL':
            reasons.append("Request has critical priority")
            
        # 6. Overall Decision Score (0-100 normalized approx)
        # Combine Priority (0-100) + Accessibility (0-100) + Logistics feasibility efficiency
        norm_v_dist = max(0, 100 - (best_vehicle_info['total_dist_km'] / 5))
        decision_score = (pri_result['priority_score'] * 0.4 + acc_result['accessibility_score'] * 0.2 + norm_v_dist * 0.4)
        
        return {
            "request_id": req_id,
            "recommendation_status": "RECOMMENDATION_READY",
            "recommendation": {
                "vehicle_id": best_v['vehicle_id'],
                "warehouse_id": best_wh['warehouse_id']
            },
            "priority": {
                "score": pri_result['priority_score'],
                "level": pri_result['priority_level']
            },
            "accessibility": {
                "score": acc_result['accessibility_score'],
                "risk": acc_result['risk_level']
            },
            "feasibility": {
                "vehicle_available": True,
                "vehicle_capacity_sufficient": True,
                "inventory_available": True,
                "warehouse_operational": True
            },
            "distances": {
                "warehouse_to_destination_km": round(best_warehouse_info['distance_km'], 2),
                "vehicle_to_destination_km": round(best_vehicle_info['total_dist_km'], 2)
            },
            "decision_score": round(min(100, max(0, decision_score)), 1),
            "reasons": reasons,
            "warnings": warnings
        }
