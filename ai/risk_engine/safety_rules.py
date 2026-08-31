def evaluate_hard_safety_constraints(features):
    """
    Evaluates hard deterministic safety constraints based on field observations.
    Returns:
    - is_infeasible (bool)
    - is_insufficient_context (bool)
    - violations (list of strings)
    """
    violations = []
    is_infeasible = False
    is_insufficient_context = False
    
    # 1. Road Blockage
    road_blockage = features.get('road_blockage', {})
    if isinstance(road_blockage, dict):
        status = road_blockage.get('status')
        val = road_blockage.get('value')
        if status == 'UNAVAILABLE':
            # This means we literally have no field info on road blockage
            # We don't automatically make it INFEASIBLE, but we might log it.
            pass
        elif val == True or val == 10 or val == 1: # Depending on how it's encoded
            is_infeasible = True
            violations.append("Verified Road Blockage reported from field.")
            
    # 2. Bridge Condition
    bridge = features.get('bridge_condition', {})
    if isinstance(bridge, dict):
        if bridge.get('value') == 'COLLAPSED' or bridge.get('value') == 'UNSAFE':
            is_infeasible = True
            violations.append("Verified Unsafe/Collapsed Bridge reported from field.")
            
    # 3. Current Landslide
    landslide_obs = features.get('landslide_observation', {})
    if isinstance(landslide_obs, dict) and landslide_obs.get('value') == True:
        is_infeasible = True
        violations.append("Active landslide blocking route reported from field.")
        
    return is_infeasible, is_insufficient_context, violations
