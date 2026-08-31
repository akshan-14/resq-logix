def validate_feature(feature_obj):
    """
    Validates a single provenance-tracked feature object.
    Must contain value, unit, source, status.
    If status is UNAVAILABLE, value can be None.
    Otherwise value must be numeric (int/float).
    """
    if not isinstance(feature_obj, dict):
        return False
        
    required_keys = ['value', 'unit', 'source', 'timestamp', 'status']
    for key in required_keys:
        if key not in feature_obj:
            return False
            
    if feature_obj['status'] == 'UNAVAILABLE':
        return True
        
    if feature_obj['status'] not in ['REAL', 'DERIVED', 'DEMO', 'HISTORICAL']:
        return False
        
    # Value must be numeric for real/derived features
    val = feature_obj['value']
    if not isinstance(val, (int, float)):
        return False
        
    return True
