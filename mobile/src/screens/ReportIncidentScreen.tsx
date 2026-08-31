import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import * as Location from 'expo-location';
import { storage } from '../storage/OfflineStorage';
import { FieldReport } from '../models/FieldReport';
import { OFFICIAL_ACCESS_CODE } from '../config/constants';

type ReportIncidentScreenProp = NativeStackNavigationProp<RootStackParamList, 'ReportIncident'>;

type Props = {
  navigation: ReportIncidentScreenProp;
};

const REPORT_TYPES = ['ROAD_BLOCKAGE', 'BRIDGE_CONDITION', 'MEDICAL_EMERGENCY', 'SHELTER_DEMAND', 'FOOD_SHORTAGE', 'GENERAL_SOS'];

const ROAD_CONDITIONS = [
  { type: 'ROAD_CLEAR', label: '??? ' + t('incident_road_clear'), severity: 'LOW' },
  { type: 'DIFFICULT_TO_PASS', label: '??? ' + t('incident_difficult_to_pass'), severity: 'MEDIUM' },
  { type: 'ROAD_BLOCKED', label: '? ' + t('status_road_blocked'), severity: 'CRITICAL' },
  { type: 'FLOODED', label: '?? ' + t('incident_flooded'), severity: 'HIGH' },
  { type: 'LANDSLIDE', label: '?? ' + t('incident_landslide'), severity: 'CRITICAL' },
  { type: 'BRIDGE_DAMAGED', label: '?? ' + t('incident_bridge_damaged'), severity: 'CRITICAL' }
];

export default function ReportIncidentScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<string>('');
  const [reporterRole, setReporterRole] = useState<'GENERAL_PUBLIC' | 'FIELD_RESPONDER' | 'OFFICIAL'>('GENERAL_PUBLIC');
  const [accessCode, setAccessCode] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    captureLocation();
  }, []);

  const captureLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('GPS permission denied.');
      return;
    }
    setLocationError('Fetching GPS...');
    try {
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
      setLocationError('');
    } catch (e) {
      setLocationError('Failed to get location.');
    }
  };

  const submitReport = async () => {
    try {
      if (!location) {
        Alert.alert('Error', 'Real GPS location is required. Please wait for GPS or capture manually.');
        return;
      }
      if (!reportType) {
        Alert.alert('Error', 'Please select a report type.');
        return;
      }

      let finalRole = reporterRole;
      if (reporterRole === 'OFFICIAL' && accessCode !== OFFICIAL_ACCESS_CODE) {
        finalRole = 'FIELD_RESPONDER';
      }

      const report: any = {
        report_id: `REP-${Math.random().toString(36).substr(2, 9)}`,
        report_type: reportType as any,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
        severity: severity,
        description: description,
        device_id: `dev-${Math.random().toString(36).substr(2, 6)}`, // Simulated randomized device id for consensus testing
        reporter_id: 'user-responder',
        reporter_role: finalRole,
        access_code: accessCode, // Pass to backend for validation
        created_offline: true,
        sync_status: 'PENDING_SYNC'
      };

      await storage.saveReport(report);
      Alert.alert('Saved', 'Report submitted successfully.');
      storage.syncPendingReports();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit report.');
    }
  };

  const selectRoadCondition = (rc: any) => {
    setReportType(rc.type);
    setSeverity(rc.severity as any);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Quick Road Condition</Text>
      <View style={styles.rcGrid}>
        {ROAD_CONDITIONS.map(rc => (
          <TouchableOpacity 
            key={rc.type} 
            style={[styles.rcBtn, reportType === rc.type && styles.rcBtnSelected]} 
            onPress={() => selectRoadCondition(rc)}
          >
            <Text style={[styles.rcBtnText, reportType === rc.type && styles.rcBtnTextSelected]}>{rc.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Other Report Types</Text>
      <View style={styles.btnGroup}>
        {REPORT_TYPES.map(rt => (
          <TouchableOpacity key={t("incident_" + rt.toLowerCase())} style={[styles.typeBtn, reportType === rt && styles.selectedTypeBtn]} onPress={() => setReportType(rt)}>
            <Text style={[styles.typeBtnText, reportType === rt && styles.selectedTypeBtnText]}>{t("incident_" + rt.toLowerCase())}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Severity</Text>
      <View style={styles.btnGroup}>
        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(sev => (
          <TouchableOpacity key={t("tier_" + sev.toLowerCase())} style={[styles.typeBtn, severity === sev && styles.selectedTypeBtn]} onPress={() => setSeverity(sev as any)}>
            <Text style={[styles.typeBtnText, severity === sev && styles.selectedTypeBtnText]}>{t("tier_" + sev.toLowerCase())}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Reporter Role (Demo Auth)</Text>
      <View style={styles.btnGroup}>
        {['GENERAL_PUBLIC', 'FIELD_RESPONDER', 'OFFICIAL'].map(role => (
          <TouchableOpacity key={role} style={[styles.typeBtn, reporterRole === role && { backgroundColor: '#4338ca' }]} onPress={() => setReporterRole(role as any)}>
            <Text style={[styles.typeBtnText, reporterRole === role && { color: 'white', fontWeight: 'bold' }]}>
              {t("role_" + role.toLowerCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {reporterRole === 'OFFICIAL' && (
        <View style={{ marginBottom: 15 }}>
          <Text style={styles.label}>Official Access Code</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={accessCode}
            onChangeText={setAccessCode}
            placeholder="Enter SIH Access Code..."
          />
        </View>
      )}

      <Text style={styles.label}>Description (Optional)</Text>
      <TextInput style={styles.input} multiline numberOfLines={2} onChangeText={setDescription} value={description} placeholder="Enter details..." />

      <Text style={styles.label}>GPS Location</Text>
      {locationError ? (
        <TouchableOpacity style={styles.gpsBtn} onPress={captureLocation}>
          <Text style={styles.gpsBtnText}>{locationError} - TAP TO RETRY</Text>
        </TouchableOpacity>
      ) : location ? (
        <View style={styles.locationBox}>
          <Text style={{color: '#22c55e', fontWeight: 'bold'}}>✓ GPS ACQUIRED</Text>
          <Text>Lat: {location.coords.latitude.toFixed(6)} | Lng: {location.coords.longitude.toFixed(6)}</Text>
        </View>
      ) : (
        <ActivityIndicator size="small" color="#3b82f6" />
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={submitReport}>
        <Text style={styles.submitBtnText}>SUBMIT REPORT</Text>
      </TouchableOpacity>
      <View style={{height: 50}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
  input: { backgroundColor: 'white', padding: 10, borderRadius: 5, borderWidth: 1, borderColor: '#ccc', textAlignVertical: 'top' },
  btnGroup: { flexDirection: 'row', flexWrap: 'wrap' },
  typeBtn: { backgroundColor: '#e0e0e0', padding: 10, borderRadius: 5, margin: 5 },
  selectedTypeBtn: { backgroundColor: '#d32f2f' },
  typeBtnText: { color: 'black' },
  selectedTypeBtnText: { color: 'white', fontWeight: 'bold' },
  rcGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  rcBtn: { width: '48%', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginVertical: 5, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center' },
  rcBtnSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  rcBtnText: { fontSize: 14, fontWeight: '600', color: '#475569', textAlign: 'center' },
  rcBtnTextSelected: { color: '#1e40af' },
  gpsBtn: { backgroundColor: '#1976d2', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 10 },
  gpsBtnText: { color: 'white', fontWeight: 'bold' },
  locationBox: { marginTop: 10, padding: 10, backgroundColor: '#e8f5e9', borderRadius: 5 },
  errorText: { color: 'red', marginTop: 5 },
  submitBtn: { backgroundColor: '#388e3c', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
