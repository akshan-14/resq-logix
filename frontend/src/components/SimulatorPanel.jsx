import React from 'react';

const SimulatorPanel = () => {
    return (
        <div style={{ padding: '20px', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', height: '100%', overflowY: 'auto' }}>
            <h2>Scenario Simulator</h2>
            <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '20px' }}>
                <h3 style={{ color: 'var(--warning)' }}>Scenario: Assam Flood and Bridge Failure</h3>
                <p style={{ color: 'var(--text-muted)' }}>Simulate heavy rainfall, a relief camp requesting 150 medicine kits, a blocked bridge reported through BLE mesh, automatic route rejection, smart vehicle assignment, alternative route generation, delivery confirmation, and dashboard analytics update.</p>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button className="btn btn-warning">1. Trigger Heavy Rainfall (14mm)</button>
                    <button className="btn btn-warning">2. Generate Request (150 Medicine Kits)</button>
                    <button className="btn btn-warning">3. Simulate BLE Bridge Report</button>
                    <button className="btn btn-success">4. Smart Auto-Assign Route</button>
                </div>
                
                <div style={{ marginTop: '30px', padding: '15px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-hover)' }}>
                    <h4>Explainable Route Risk Panel</h4>
                    <p style={{ color: 'var(--danger)' }}><strong>Route rejected:</strong> damaged bridge reported 1.2 km ahead, 14 mm rainfall, steep 12.5° slope, unpaved road segment, and high historical landslide risk.</p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button className="btn">View Safer Route</button>
                        <button className="btn btn-danger">Dispatch Anyway</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SimulatorPanel;
