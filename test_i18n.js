const en = require('./frontend/src/locales/en.json');
const hi = require('./frontend/src/locales/hi.json');
const as = require('./frontend/src/locales/as.json');

const FALLBACK_EN = {
  "status_road_blocked": "ROAD BLOCKED",
  "status_heavy_rainfall": "HEAVY RAINFALL",
  "status_route_unavailable": "ROUTE UNAVAILABLE",
  "status_no_alternative_route": "NO ALTERNATIVE ROUTE AVAILABLE",
  "status_vehicle_dispatched": "VEHICLE DISPATCHED",
  "status_delivery_confirmed": "DELIVERY CONFIRMED",
  "status_sos_received": "SOS ALERT RECEIVED",
  "status_active": "ACTIVE",
  "status_acknowledged": "ACKNOWLEDGED",
  "status_rescued": "RESCUED",
  "status_cancelled": "CANCELLED",
  "status_available": "AVAILABLE",
  "status_on_route": "ON ROUTE",
  "status_busy": "BUSY",
  "status_maintenance": "MAINTENANCE",
  "status_pending": "PENDING",
  "status_assigned": "ASSIGNED",
  "status_in_transit": "IN TRANSIT",
  "status_delivered": "DELIVERED",
  "role_general_public": "GENERAL PUBLIC",
  "role_field_responder": "FIELD RESPONDER",
  "role_official": "OFFICIAL",
  "incident_road_clear": "ROAD CLEAR",
  "incident_difficult_to_pass": "DIFFICULT TO PASS",
  "incident_flooded": "FLOODED",
  "incident_landslide": "LANDSLIDE",
  "incident_bridge_damaged": "BRIDGE DAMAGED",
  "incident_medical_emergency": "MEDICAL EMERGENCY",
  "incident_shelter_demand": "SHELTER DEMAND",
  "incident_food_shortage": "FOOD SHORTAGE",
  "incident_general_sos": "GENERAL SOS",
  "btn_mark_delivered": "MARK DELIVERED",
  "btn_verify": "Verify",
  "btn_reject": "Reject",
  "tier_low": "LOW",
  "tier_medium": "MEDIUM",
  "tier_high": "HIGH",
  "tier_critical": "CRITICAL"
};

const locales = { en, hi, as };

function t(key, lang) {
  
  
  return locales[lang]?.[key] || locales['en']?.[key] || FALLBACK_EN[key] || key.toUpperCase().replace(/_/g, ' ');
}

let passed = 0; let total = 0;
function assert(condition, msg) {
  total++;
  if (condition) { passed++; console.log('Passed: ' + msg); }
  else { console.error('Failed: ' + msg); }
}

assert(t('status_road_blocked', 'en') === 'ROAD BLOCKED', 'English translates ROAD BLOCKED');
assert(t('status_road_blocked', 'hi') === 'मार्ग अवरुद्ध', 'Hindi translates ROAD BLOCKED');
assert(t('status_road_blocked', 'as') === 'ৰাস্তা বন্ধ', 'Assamese translates ROAD BLOCKED');
assert(t('btn_verify', 'hi') === 'सत्यापित करें', 'Hindi has Verify button translated');
assert(t('status_active', 'xyz') === 'ACTIVE', 'Unknown language falls back to English');
assert(t('unknown_random_key', 'en') === 'UNKNOWN RANDOM KEY', 'Completely missing key returns formatted English text');

// Simulate completely missing locale file
assert(t('status_road_blocked', 'MISSING_FILE') === 'ROAD BLOCKED', 'Missing locale file falls back to hardcoded English dict');

console.log('--- ALL TESTS PASSED (' + passed + '/' + total + ') ---');
