import * as Location from 'expo-location';

const BACKEND_URL = 'http://10.202.131.159:3000/api/v1/vehicles';

export class GpsTracker {
  private vehicleId: string | null = null;
  private isTracking = false;
  private locationSubscription: Location.LocationSubscription | null = null;
  private locationQueue: any[] = [];
  private syncInterval: NodeJS.Timeout | null = null;

  async startTracking(vehicleId: string) {
    if (this.isTracking) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('GPS permission denied');
      return;
    }

    this.vehicleId = vehicleId;
    this.isTracking = true;

    // We use foreground tracking as requested for this stage. 
    // Background tracking via expo-task-manager is documented as a limitation for now.
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
      },
      (location) => {
        const point = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed,
          heading: location.coords.heading,
          gps_timestamp: new Date(location.timestamp).toISOString(),
        };
        this.locationQueue.push(point);
      }
    );

    // Sync every 15 seconds
    this.syncInterval = setInterval(() => this.syncQueue(), 15000);
  }

  async stopTracking() {
    this.isTracking = false;
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    await this.syncQueue(); // final flush
  }

  private async syncQueue() {
    if (!this.vehicleId || this.locationQueue.length === 0) return;

    const batch = [...this.locationQueue];
    this.locationQueue = []; // Clear queue immediately to avoid duplicate processing

    try {
      const response = await fetch(`${BACKEND_URL}/${this.vehicleId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        // If it failed, put them back to try again later (basic offline support)
        this.locationQueue = [...batch, ...this.locationQueue];
      }
    } catch (e) {
      console.error('Failed to sync GPS data', e);
      this.locationQueue = [...batch, ...this.locationQueue];
    }
  }
}

export const gpsTracker = new GpsTracker();
