import sys
import os

filepath = 'ai/run_district_eval.py'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Add import
import_stmt = "from data_pipeline.static_data.dem_extractor import get_elevation_and_slope\n"
if "get_elevation_and_slope" not in code:
    code = code.replace("from risk_engine.real_risk_engine import DeterministicRiskEngine", "from risk_engine.real_risk_engine import DeterministicRiskEngine\n" + import_stmt)

# Replace stub
stub_code = "'slope_degrees': {'status': 'UNAVAILABLE', 'value': 0}, # District level slope is too broad, ignore for now"

replacement_code = """
    dem_data = get_elevation_and_slope(lat, lon)
    slope_val = 0.0
    dem_status = 'UNAVAILABLE'
    if dem_data.get('status') == 'SUCCESS':
        slope_val = dem_data.get('data', {}).get('slope_degrees', 0.0)
        dem_status = 'SUCCESS'

    context_data['slope_degrees'] = {'status': dem_status, 'value': slope_val}
"""

if stub_code in code:
    code = code.replace("    context_data = {", "    context_data = {")
    code = code.replace(stub_code, "")
    
    # insert the new logic after context_data = {...}
    parts = code.split("context_data = {")
    before = parts[0]
    after = parts[1]
    
    # split by first closing brace
    after_parts = after.split("}", 1)
    new_after = "context_data = {" + after_parts[0] + "}\n" + replacement_code + after_parts[1]
    
    code = before + new_after

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)
