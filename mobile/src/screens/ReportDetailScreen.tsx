import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { storage } from '../storage/OfflineStorage';
import { FieldReport } from '../models/FieldReport';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportDetail'>;

export default function ReportDetailScreen({ route }: Props) {
  const { reportId } = route.params;
  const [report, setReport] = useState<FieldReport | null>(null);

  useEffect(() => {
    (async () => {
      const all = await storage.getReports();
      const found = all.find(r => r.report_id === reportId);
      if (found) setReport(found);
    })();
  }, [reportId]);

  if (!report) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.header}>Report Details</Text>
        
        <Text style={styles.label}>Report ID:</Text>
        <Text style={styles.value}>{report.report_id}</Text>
        
        <Text style={styles.label}>Message ID (BLE Ref):</Text>
        <Text style={styles.value}>{report.message_id || 'N/A'}</Text>
        
        <Text style={styles.label}>Type:</Text>
        <Text style={styles.value}>{report.report_type}</Text>

        <Text style={styles.label}>Severity:</Text>
        <Text style={styles.value}>{report.severity}</Text>

        <Text style={styles.label}>Description:</Text>
        <Text style={styles.value}>{report.description || 'None'}</Text>
        
        <Text style={styles.label}>GPS Coordinates:</Text>
        <Text style={styles.value}>{report.latitude?.toFixed(6)}, {report.longitude?.toFixed(6)}</Text>
        
        <Text style={styles.label}>Device Timestamp:</Text>
        <Text style={styles.value}>{new Date(report.timestamp).toLocaleString()}</Text>
        
        <Text style={styles.label}>Source:</Text>
        <Text style={styles.value}>MOBILE_APP {report.created_offline ? '(Offline)' : ''}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.header}>Status</Text>
        
        <Text style={styles.label}>Sync Status:</Text>
        <Text style={[styles.value, report.sync_status === 'SYNCED' ? styles.success : styles.warning]}>{report.sync_status}</Text>
        
        <Text style={styles.label}>Verification Status:</Text>
        <Text style={[styles.value, styles.warning]}>UNVERIFIED</Text>
        
        <Text style={styles.notice}>* Verification is performed by the backend/dispatcher.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f5f5f5' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  label: { fontSize: 12, color: '#666', marginTop: 10 },
  value: { fontSize: 16, fontWeight: '500', marginTop: 2 },
  success: { color: '#4caf50' },
  warning: { color: '#ff9800' },
  notice: { fontSize: 12, color: '#f44336', marginTop: 15, fontStyle: 'italic' }
});
