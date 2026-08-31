import React, { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import * as Location from 'expo-location';
import { storage } from '../storage/OfflineStorage';
import { useIsFocused } from '@react-navigation/native';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

export default function HomeScreen({ navigation }: Props) {
  const { t, lang, setLanguage } = useTranslation();
  const [gpsStatus, setGpsStatus] = useState<string>('Checking...');
  const [pendingCount, setPendingCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const isFocused = useIsFocused();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('Permission Denied');
        return;
      }
      setGpsStatus('Ready (Real GPS)');
    })();
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadStats();
    }
  }, [isFocused]);

  const loadStats = async () => {
    const all = await storage.getReports();
    const pending = all.filter(r => r.sync_status === 'PENDING_SYNC').length;
    const synced = all.filter(r => r.sync_status === 'SYNCED').length;
    setPendingCount(pending);
    setSyncedCount(synced);
  };

  const handleSync = async () => {
    await storage.syncPendingReports();
    loadStats();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ResQ-Logix Field</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <Text>GPS: <Text style={styles.bold}>{gpsStatus}</Text></Text>
        <Text>Pending Sync: <Text style={styles.bold}>{pendingCount}</Text></Text>
        <Text>Synced Reports: <Text style={styles.bold}>{syncedCount}</Text></Text>
        <TouchableOpacity style={styles.syncBtn} onPress={handleSync}>
          <Text style={styles.syncBtnText}>Sync Now</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ReportIncident')}>
        <Text style={styles.actionBtnText}>REPORT INCIDENT</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => navigation.navigate('MyReports')}>
        <Text style={styles.actionBtnText}>MY REPORTS</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionBtn, styles.bleBtn]} onPress={() => navigation.navigate('BleNetwork')}>
        <Text style={styles.actionBtnText}>BLE NETWORK</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionBtn, styles.driverBtn]} onPress={() => navigation.navigate('Driver')}>
        <Text style={styles.actionBtnText}>DRIVER MODE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 20, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  bold: { fontWeight: 'bold' },
  syncBtn: { marginTop: 10, backgroundColor: '#2196F3', padding: 10, borderRadius: 5, alignItems: 'center' },
  syncBtnText: { color: 'white', fontWeight: 'bold' },
  actionBtn: { backgroundColor: '#d32f2f', padding: 20, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  secondaryBtn: { backgroundColor: '#455a64' },
  bleBtn: { backgroundColor: '#3b82f6' },
  driverBtn: { backgroundColor: '#ff9800' },
  actionBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
