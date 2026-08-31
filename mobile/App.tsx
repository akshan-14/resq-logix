import { ErrorBoundary } from './src/ErrorBoundary';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import ReportIncidentScreen from './src/screens/ReportIncidentScreen';
import MyReportsScreen from './src/screens/MyReportsScreen';
import ReportDetailScreen from './src/screens/ReportDetailScreen';
import { bleService } from './src/ble/BleService';
import { storage } from './src/storage/OfflineStorage';
import { BleNetworkScreen } from './src/screens/BleNetworkScreen';
import { DriverScreen } from './src/screens/DriverScreen';

export type RootStackParamList = {
  Home: undefined;
  ReportIncident: undefined;
  MyReports: undefined;
  ReportDetail: { reportId: string };
  BleNetwork: undefined;
  Driver: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    // Setup BLE callbacks to handle incoming messages in background/foreground
    bleService.setCallbacks(
      async (report, hopCount) => {
        console.log('BLE APP ROOT Received Report', report.report_id);
        await storage.saveReport(report);
        // Automatically attempt internet sync when we receive a report
        storage.syncPendingReports();
      },
      (status) => {
        // global status updates
      }
    );
  }, []);

  return (
    <ErrorBoundary>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'ResQ-Logix Field App' }} />
        <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} options={{ title: 'Report Incident' }} />
        <Stack.Screen name="MyReports" component={MyReportsScreen} options={{ title: 'My Reports' }} />
        <Stack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ title: 'Report Detail' }} />
        <Stack.Screen name="BleNetwork" component={BleNetworkScreen} options={{ title: 'BLE Network' }} />
        <Stack.Screen name="Driver" component={DriverScreen} options={{ title: 'Driver Mode' }} />
      </Stack.Navigator>
    </NavigationContainer>
    </ErrorBoundary>
  );
}
