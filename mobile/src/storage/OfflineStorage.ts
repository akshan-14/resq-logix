import AsyncStorage from '@react-native-async-storage/async-storage';
import { FieldReport } from '../models/FieldReport';

const STORAGE_KEY = '@resq_reports';
const BACKEND_URL = 'http://10.202.131.159:3000/api/v1/field-reports'; // Local IP for physical device testing

export class OfflineStorage {
  async getReports(): Promise<FieldReport[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error('Error reading reports', e);
      return [];
    }
  }

  async saveReport(report: FieldReport): Promise<void> {
    try {
      report.sync_status = 'PENDING_SYNC';
      const reports = await this.getReports();
      // Avoid saving exact duplicate
      if (!reports.some(r => r.report_id === report.report_id)) {
        reports.push(report);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
        console.log(`Saved report ${report.report_id} locally. Sync status: ${report.sync_status}`);
      }
      
      // Attempt BLE propagation immediately if created by this device
      // For this prototype, we'll try broadcasting every time a report is added
      const { bleService } = require('../ble/BleService');
      bleService.forwardMessage(report, 0);
    } catch (e) {
      console.error('Error saving report', e);
    }
  }

  async getPendingReports(): Promise<FieldReport[]> {
    const reports = await this.getReports();
    return reports.filter(r => r.sync_status === 'PENDING_SYNC');
  }

  async markAsSynced(reportId: string): Promise<void> {
    try {
      const reports = await this.getReports();
      const index = reports.findIndex(r => r.report_id === reportId);
      if (index !== -1) {
        reports[index].sync_status = 'SYNCED';
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      }
    } catch (e) {
      console.error('Error marking as synced', e);
    }
  }
  
  async syncPendingReports(): Promise<void> {
    const pending = await this.getPendingReports();
    for (const report of pending) {
      try {
        const response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(report)
        });
        
        if (response.ok || response.status === 409) {
          await this.markAsSynced(report.report_id);
          console.log(`Successfully synced report ${report.report_id}`);
        } else {
          console.error(`Failed to sync report ${report.report_id}: HTTP ${response.status}`);
        }
      } catch (e) {
        console.error(`Network error syncing report ${report.report_id}`, e);
        // Remains PENDING_SYNC
      }
    }
  }

  // --- DELIVERY CONFIRMATION QUEUING ---
  async saveDeliveryConfirmation(requestId: string, payload: any): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('@resq_deliveries');
      const deliveries = stored ? JSON.parse(stored) : [];
      // Replace if already exists
      const existingIdx = deliveries.findIndex((d: any) => d.requestId === requestId);
      if (existingIdx !== -1) deliveries.splice(existingIdx, 1);
      
      deliveries.push({ requestId, payload, sync_status: 'PENDING_SYNC' });
      await AsyncStorage.setItem('@resq_deliveries', JSON.stringify(deliveries));
      console.log(`Saved delivery confirmation for ${requestId} locally.`);
    } catch (e) {
      console.error('Error saving delivery confirmation', e);
    }
  }

  async syncPendingDeliveries(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('@resq_deliveries');
      if (!stored) return;
      const deliveries = JSON.parse(stored);
      
      let updated = false;
      const backendBaseUrl = BACKEND_URL.replace('/field-reports', '');
      
      for (let i = 0; i < deliveries.length; i++) {
        const item = deliveries[i];
        if (item.sync_status === 'PENDING_SYNC') {
          try {
            const response = await fetch(`${backendBaseUrl}/logistics/requests/${item.requestId}/deliver`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.payload)
            });
            
            if (response.ok || response.status === 400) { // 400 could mean already delivered
              item.sync_status = 'SYNCED';
              updated = true;
              console.log(`Successfully synced delivery for ${item.requestId}`);
            }
          } catch (e) {
            console.error(`Network error syncing delivery for ${item.requestId}`, e);
          }
        }
      }
      
      if (updated) {
        await AsyncStorage.setItem('@resq_deliveries', JSON.stringify(deliveries));
      }
    } catch (e) {
      console.error('Error syncing deliveries', e);
    }
  }
}

export const storage = new OfflineStorage();
