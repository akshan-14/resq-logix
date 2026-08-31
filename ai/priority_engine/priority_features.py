def parse_priority_feature(feature_obj, default=0.0):
    """
    Safely extracts a numeric value from a provenance-tagged feature object.
    If the status is UNAVAILABLE, returns the default.
    Returns (value, is_unavailable_flag)
    """
    if not isinstance(feature_obj, dict):
        try:
            return float(feature_obj), False
        except:
            return default, False
            
    if feature_obj.get('status') == 'UNAVAILABLE':
        return default, True
        
    val = feature_obj.get('value', default)
    if val is None:
        return default, True
        
    try:
        return float(val), False
    except:
        return default, True
