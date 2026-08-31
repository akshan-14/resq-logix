import sqlite3
import os
import datetime

def fetch_field_reports(db_path=None):
    """
    Fetches real field reports from the Logistics SQLite DB.
    """
    if not db_path:
        # Default to backend/resq-logix.db relative to project root
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        db_path = os.path.join(project_root, 'backend', 'resq-logix.db')
        
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # We need to extract sos_count, medical_emergency_count from sos_messages
        cursor.execute("SELECT COUNT(*) FROM sos_messages WHERE status = 'ACTIVE'")
        sos_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM sos_messages WHERE status = 'ACTIVE' AND emergencyType = 'Medical'")
        medical_count = cursor.fetchone()[0]
        
        # Extract active verified field reports
        cursor.execute("SELECT report_type FROM field_reports WHERE status = 'VERIFIED'")
        verified_reports = cursor.fetchall()
        
        conn.close()
        
        # Check if we have verified reports for each type
        has_blockage = any(r[0] in ('ROAD_BLOCKAGE', 'ROAD_BLOCKED') for r in verified_reports)
        has_bridge = any(r[0] in ('BRIDGE_CONDITION', 'BRIDGE_DAMAGED') for r in verified_reports)
        has_flood = any(r[0] in ('FLOOD_OBSERVATION', 'FLOODED') for r in verified_reports)
        has_landslide = any(r[0] in ('LANDSLIDE_OBSERVATION', 'LANDSLIDE') for r in verified_reports)
        
        return {
            "status": "SUCCESS",
            "data": {
                "sos_count": {
                    "value": int(sos_count),
                    "unit": "count",
                    "source": "logistics-db",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "status": "REAL"
                },
                "medical_emergency_count": {
                    "value": int(medical_count),
                    "unit": "count",
                    "source": "logistics-db",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "status": "REAL"
                },
                "road_blockage": {
                    "value": has_blockage,
                    "unit": "boolean",
                    "source": "logistics-db",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "status": "REAL"
                },
                "bridge_condition": {
                    "value": "UNSAFE" if has_bridge else "OK",
                    "unit": "severity",
                    "source": "logistics-db",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "status": "REAL"
                },
                "flood_observation": {
                    "value": has_flood,
                    "unit": "boolean",
                    "source": "logistics-db",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "status": "REAL"
                },
                "landslide_observation": {
                    "value": has_landslide,
                    "unit": "boolean",
                    "source": "logistics-db",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "status": "REAL"
                },
                "injured_people": {
                    "value": None,
                    "unit": "count",
                    "source": "logistics-db",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "status": "UNAVAILABLE"
                }
            }
        }
    except Exception as e:
        return {
            "status": "DATA_UNAVAILABLE",
            "error": str(e)
        }
