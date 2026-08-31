import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { gpsTracker } from '../services/GpsTracker';
import * as Location from 'expo-location';

export const DriverScreen = () => {
  const { t } = useTranslation();
  const [vehicleId, setVehicleId] = useState('V001'); // Default demo vehicle
  const [activeRequestId, setActiveRequestId] = useState(''); 
  const [isTracking, setIsTracking] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('Idle');
  const [deliveryStatus, setDeliveryStatus] = useState('');

  // Fetch active mission when vehicle changes
  useEffect(() => {
    let active = true;
    const fetchMission = async () => {
      try {
        const { storage } = require('../storage/OfflineStorage');
        const IP = storage.getIp ? storage.getIp() : '10.202.131.159'; // Fallback
        const res = await fetch(`http://${IP}:3000/api/v1/logistics/requests`);
        const json = await res.json();
        if (json.status === 'success' && active) {
          const mission = json.data.find((r: any) => 
            r.assigned_vehicle_id === vehicleId && 
            (r.status === 'ASSIGNED' || r.status === 'IN_TRANSIT')
          );
          setActiveRequestId(mission ? mission.request_id : '');
        }
      } catch (e) {
        console.error('Failed to fetch mission:', e);
      }
    };
    
    if (vehicleId) {
      fetchMission();
      // Poll every 10s for new assignments
      const interval = setInterval(fetchMission, 10000);
      return () => { active = false; clearInterval(interval); };
    }
  }, [vehicleId]);

  useEffect(() => {
    return () => {
      if (isTracking) {
        gpsTracker.stopTracking();
      }
    };
  }, [isTracking]);

  const toggleTracking = async () => {
    if (isTracking) {
      await gpsTracker.stopTracking();
      setIsTracking(false);
      setGpsStatus('Stopped');
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('GPS Unavailable');
        return;
      }
      
      await gpsTracker.startTracking(vehicleId);
      setIsTracking(true);
      setGpsStatus('Tracking Live (Foreground)');
    }
  };

  const handleMarkDelivered = async () => {
    if (!activeRequestId) {
      setDeliveryStatus('Please enter a Request ID.');
      return;
    }

    setDeliveryStatus('Acquiring Delivery GPS...');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setDeliveryStatus('Location permission denied.');
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({});
      const payload = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: new Date().toISOString()
      };

      const { storage } = require('../storage/OfflineStorage');
      await storage.saveDeliveryConfirmation(activeRequestId, payload);
      setDeliveryStatus(`Saved delivery offline! Loc: ${loc.coords.latitude.toFixed(3)}, ${loc.coords.longitude.toFixed(3)}`);
      
      storage.syncPendingDeliveries().then(() => {
        setDeliveryStatus('Synced delivery to Command Centre!');
      }).catch((e: any) => console.log(e));

    } catch (e) {
      setDeliveryStatus('Failed to capture GPS.');
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logistics Driver Mode</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Vehicle ID:</Text>
        <TextInput 
          style={styles.input} 
          value={vehicleId} 
          onChangeText={setVehicleId} 
          editable={!isTracking}
        />
        
        <View style={styles.row}>
          <Text style={styles.label}>GPS Status:</Text>
          <Text style={[styles.status, isTracking ? styles.statusActive : {}]}>{gpsStatus}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.btn, isTracking ? styles.btnStop : styles.btnStart]} 
          onPress={toggleTracking}
        >
          <Text style={styles.btnText}>{isTracking ? 'STOP TRACKING' : 'START TRACKING'}</Text>
        </TouchableOpacity>
      </View>

        <View style={styles.card}>
          <Text style={styles.label}>Active Mission (Request ID):</Text>
          <View style={[styles.input, { backgroundColor: '#e2e8f0', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 16, color: activeRequestId ? '#0f172a' : '#64748b' }}>
              {activeRequestId || 'No Active Mission Assigned'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.btnDeliver, !activeRequestId && { backgroundColor: '#94a3b8' }]} 
            onPress={handleMarkDelivered}
            disabled={!activeRequestId}
          >
            <Text style={styles.btnText}>? {t('btn_mark_delivered')}</Text>
          </TouchableOpacity>
          
          {deliveryStatus ? (
          <Text style={{ marginTop: 10, color: '#333', fontStyle: 'italic', textAlign: 'center' }}>
            {deliveryStatus}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 8, elevation: 2 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 15, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  status: { fontSize: 16, color: '#666', fontWeight: 'bold' },
  statusActive: { color: '#4caf50' },
  btn: { padding: 15, borderRadius: 8, alignItems: 'center' },
  btnStart: { backgroundColor: '#2196F3' },
  btnStop: { backgroundColor: '#f44336' },
  btnDeliver: { backgroundColor: '#4caf50', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
