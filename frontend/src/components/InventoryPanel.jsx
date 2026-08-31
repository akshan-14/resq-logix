import React from 'react';

const InventoryPanel = () => {
    return (
        <div style={{ padding: '20px', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', height: '100%', overflowY: 'auto' }}>
            <h2>Warehouse and Inventory Intelligence</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3>Guwahati Central Hub</h3>
                    <p>Medicine Kits: 450 (Cold Chain <span style={{color: 'var(--success)'}}>OK</span>)</p>
                    <p>Food Packets: 1200</p>
                    <p>Drinking Water: 5000L</p>
                    <p style={{color: 'var(--warning)', fontSize: '0.8rem'}}>Predicted stock-out (Medicine): 3 days</p>
                </div>
                <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3>Silchar Depot</h3>
                    <p>Medicine Kits: 50 (Cold Chain <span style={{color: 'var(--danger)'}}>OFFLINE</span>)</p>
                    <p>Food Packets: 200</p>
                    <p>Drinking Water: 500L</p>
                    <p style={{color: 'var(--danger)', fontSize: '0.8rem'}}>Alert: Low inventory</p>
                </div>
            </div>
        </div>
    );
}

export default InventoryPanel;
