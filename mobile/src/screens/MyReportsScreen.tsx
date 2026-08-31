import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { storage } from '../storage/OfflineStorage';
import { FieldReport } from '../models/FieldReport';
import { useIsFocused } from '@react-navigation/native';

type MyReportsScreenProp = NativeStackNavigationProp<RootStackParamList, 'MyReports'>;

type Props = {
  navigation: MyReportsScreenProp;
};

export default function MyReportsScreen({ navigation }: Props) {
  const [reports, setReports] = useState<FieldReport[]>([]);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadReports();
    }
  }, [isFocused]);

  const loadReports = async () => {
    const all = await storage.getReports();
    setReports(all.reverse()); // Newest first
  };

  const renderItem = ({ item }: { item: FieldReport }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ReportDetail', { reportId: item.report_id })}>
      <Text style={styles.title}>{item.report_type}</Text>
      <Text>Time: {new Date(item.timestamp).toLocaleString()}</Text>
      <View style={styles.statusRow}>
        <Text style={[styles.badge, item.sync_status === 'SYNCED' ? styles.synced : styles.pending]}>
          {item.sync_status}
        </Text>
        <Text style={[styles.badge, styles.unverified]}>UNVERIFIED</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        keyExtractor={item => item.report_id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No reports found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f5f5f5' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  statusRow: { flexDirection: 'row', marginTop: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, color: 'white', fontSize: 12, fontWeight: 'bold', marginRight: 10 },
  synced: { backgroundColor: '#4caf50' },
  pending: { backgroundColor: '#ff9800' },
  unverified: { backgroundColor: '#9e9e9e' },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#666' }
});
