import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { bleService, BleStatus } from '../ble/BleService';
import { Ionicons } from '@expo/vector-icons';

export const BleNetworkScreen = () => {
  const [status, setStatus] = useState<BleStatus>(bleService.status);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Keep reference to old callbacks if any (in a real app we'd use EventEmitters)
    const oldCb = (bleService as any).onStatusChangeCb;
    
    bleService.setCallbacks(
      (report, hopCount) => {
      },
      (newStatus) => {
        setStatus(newStatus);
        if (oldCb) oldCb(newStatus);
      },
      (logMsg) => {
        setLogs(prev => {
          const newLogs = [new Date().toLocaleTimeString() + ': ' + logMsg, ...prev];
          return newLogs.slice(0, 50); // Keep last 50
        });
      }
    );
    
    return () => {
      // Cleanup
      bleService.setCallbacks(() => {}, () => {});
    };
  }, []);

  const handleStartAdvertising = async () => {
    // For testing, broadcast a dummy report or the last one
    // In actual app, this is called by the OfflineStorage when a new report is created
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="bluetooth" size={28} color="#3b82f6" />
        <Text style={styles.title}>BLE Mesh Network</Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Network Status</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Bluetooth Hardware:</Text>
          <Text style={[styles.value, { color: status.isBluetoothEnabled ? '#10b981' : '#ef4444' }]}>
            {status.isBluetoothEnabled ? 'ENABLED' : 'DISABLED'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Scanning (Central):</Text>
          <Text style={[styles.value, { color: status.isScanning ? '#10b981' : '#64748b' }]}>
            {status.isScanning ? t('status_active') : t('status_inactive')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Advertising (Peripheral):</Text>
          <Text style={[styles.value, { color: status.isAdvertising ? '#10b981' : '#64748b' }]}>
            {status.isAdvertising ? t('status_active') : t('status_inactive')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Connected Devices:</Text>
          <Text style={styles.value}>{status.connectedDevices}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mesh Statistics</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Reports Received:</Text>
          <Text style={styles.value}>{status.messagesReceived}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reports Forwarded:</Text>
          <Text style={styles.value}>{status.messagesForwarded}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Duplicates Rejected:</Text>
          <Text style={styles.value}>{status.duplicatesIgnored}</Text>
        </View>
      </View>

      {status.lastError && (
        <View style={[styles.card, { borderColor: '#ef4444', borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Last Error</Text>
          <Text style={{ color: '#ef4444', fontSize: 13 }}>{status.lastError}</Text>
        </View>
      )}
      

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Diagnostic Console</Text>
        <ScrollView style={{height: 200, backgroundColor: '#1e293b', padding: 10, borderRadius: 5}}>
          {logs.map((log, i) => <Text key={i} style={{color: '#a7f3d0', fontSize: 11, marginBottom: 4, fontFamily: 'monospace'}}>{log}</Text>)}
          {logs.length === 0 && <Text style={{color: '#64748b', fontSize: 11}}>Waiting for events...</Text>}
        </ScrollView>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.btn, status.isScanning ? styles.btnStop : styles.btnStart]}
          onClick={status.isScanning ? () => bleService.stopScanning() : () => bleService.startScanning()}
        >
          <Text style={styles.btnText}>{status.isScanning ? 'Stop Scanning' : 'Start Scanning'}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.btn, status.isAdvertising ? styles.btnStop : styles.btnStart]}
          onClick={status.isAdvertising ? () => bleService.stopAdvertising() : handleStartAdvertising}
        >
          <Text style={styles.btnText}>{status.isAdvertising ? 'Stop Broadcast' : 'Test Broadcast'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
  },
  value: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 40,
  },
  btn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  btnStart: {
    backgroundColor: '#3b82f6',
  },
  btnStop: {
    backgroundColor: '#ef4444',
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  }
});
