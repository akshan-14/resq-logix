import re

# App.jsx
app_jsx_path = r'frontend/src/App.jsx'
with open(app_jsx_path, 'r', encoding='utf-8') as f:
    app_jsx = f.read()

# Replace hardcoded options
app_jsx = app_jsx.replace('<option value="PENDING">Pending</option>', '<option value="PENDING">{t("status_pending")}</option>')
app_jsx = app_jsx.replace('<option value="ASSIGNED">Assigned</option>', '<option value="ASSIGNED">{t("status_assigned")}</option>')
app_jsx = app_jsx.replace('<option value="IN_TRANSIT">In Transit</option>', '<option value="IN_TRANSIT">{t("status_in_transit")}</option>')
app_jsx = app_jsx.replace('<option value="DELIVERED">Delivered</option>', '<option value="DELIVERED">{t("status_delivered")}</option>')
app_jsx = app_jsx.replace('<option value="CANCELLED">Cancelled</option>', '<option value="CANCELLED">{t("status_cancelled")}</option>')
app_jsx = app_jsx.replace('<option value="AVAILABLE">Available</option>', '<option value="AVAILABLE">{t("status_available")}</option>')
app_jsx = app_jsx.replace('<option value="ON_ROUTE">On Route</option>', '<option value="ON_ROUTE">{t("status_on_route")}</option>')
app_jsx = app_jsx.replace('<option value="BUSY">Busy</option>', '<option value="BUSY">{t("status_busy")}</option>')
app_jsx = app_jsx.replace('<option value="MAINTENANCE">Maintenance</option>', '<option value="MAINTENANCE">{t("status_maintenance")}</option>')

with open(app_jsx_path, 'w', encoding='utf-8') as f:
    f.write(app_jsx)

# BleNetworkScreen.tsx
ble_path = r'mobile/src/screens/BleNetworkScreen.tsx'
with open(ble_path, 'r', encoding='utf-8') as f:
    ble = f.read()

ble = ble.replace("status.isScanning ? 'ACTIVE' : 'INACTIVE'", "status.isScanning ? t('status_active') : t('status_inactive')")
ble = ble.replace("status.isAdvertising ? 'ACTIVE' : 'INACTIVE'", "status.isAdvertising ? t('status_active') : t('status_inactive')")

with open(ble_path, 'w', encoding='utf-8') as f:
    f.write(ble)
