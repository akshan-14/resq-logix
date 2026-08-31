import React from 'react';

const NetworkPanel = () => {
    return (
        <div style={{ padding: '20px', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', height: '100%', overflowY: 'auto' }}>
            <h2>Offline BLE Mesh Network</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3>Network Status</h3>
                    <p>Internet Sync: <strong style={{color: 'var(--success)'}}>ONLINE</strong></p>
                    <p>Pending Sync Queue: 0 reports</p>
                    <p>Duplicate Reports Filtered: 14</p>
                </div>
                <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3>Mesh Topology (Last 1hr)</h3>
                    <p style={{fontFamily: 'monospace', color: 'var(--text-muted)'}}>Field Worker A → Volunteer B → Driver C → Command Server</p>
                </div>
            </div>
        </div>
    );
}

export default NetworkPanel;
