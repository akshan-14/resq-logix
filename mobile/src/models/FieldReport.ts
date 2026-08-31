export interface FieldReport {
  report_id: string;
  message_id?: string;
  report_type: 'ROAD_BLOCKAGE' | 'BRIDGE_CONDITION' | 'FLOOD_OBSERVATION' | 'LANDSLIDE_OBSERVATION' | 'MEDICAL_EMERGENCY' | 'INJURED_PEOPLE' | 'SHELTER_DEMAND' | 'FOOD_SHORTAGE' | 'WATER_SHORTAGE' | 'MEDICINE_SHORTAGE' | 'GENERAL_SOS';
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
  people_affected?: number;
  injured_people?: number;
  status?: string;
  reporter_id: string;
  device_id: string;
  created_offline: boolean;
  sync_status: 'PENDING_SYNC' | 'SYNCED' | 'REJECTED';
}
