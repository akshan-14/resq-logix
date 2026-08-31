import { useState, useEffect } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import as from '../locales/as.json';

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

let currentLang = localStorage.getItem('resq_lang') || 'en';
if (!locales[currentLang]) currentLang = 'en';

const listeners = new Set();

export const setLanguage = (lang) => {
  if (locales[lang]) {
    currentLang = lang;
    localStorage.setItem('resq_lang', lang);
    listeners.forEach(fn => fn(currentLang));
  }
};

export const getLanguage = () => currentLang;

export const useTranslation = () => {
  const [lang, setLangState] = useState(currentLang);

  useEffect(() => {
    listeners.add(setLangState);
    return () => listeners.delete(setLangState);
  }, []);

  const t = (key) => {
    return locales[lang]?.[key] || locales['en']?.[key] || FALLBACK_EN[key] || key.toUpperCase().replace(/_/g, ' ');
  };

  return { t, lang, setLanguage };
};
