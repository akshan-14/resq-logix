const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'src', 'App.jsx');
let code = fs.readFileSync(file, 'utf8');

const injection = `{fieldReports.map(report => {
                          const isSelected = selectedFieldReportId === report.report_id;
                          return (
                            <div 
                              key={report.report_id} 
                              onClick={() => {
                                setSelectedFieldReportId(report.report_id);
                                if (report.latitude && report.longitude) {
                                  setMapCenter([report.latitude, report.longitude]);
                                  setMapZoom(14);
                                }
                              }}
                              style={{ 
                                background: isSelected ? '#334155' : '#1e293b', 
                                border: isSelected ? '2px solid #3b82f6' : '1px solid #334155', 
                                borderRadius: '8px', 
                                padding: '15px', 
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: isSelected ? '#60a5fa' : '#e2e8f0' }}>
                                  {report.report_type.replace(/_/g, ' ')}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                  {new Date(report.timestamp).toLocaleString()}
                                </span>
                              </div>
                              
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ background: '#b45309', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                  {report.severity}
                                </span>
                                <span style={{ background: '#0369a1', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                  {report.status || 'UNVERIFIED'}
                                </span>
                                {report.latitude && report.longitude ? (
                                  <span style={{ background: '#334155', color: '#cbd5e1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    GPS: {report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}
                                  </span>
                                ) : (
                                  <span style={{ background: '#dc2626', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    Location unavailable
                                  </span>
                                )}
                              </div>
                              
                              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                {report.description || 'No description provided.'}
                              </p>
                              
                              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column' }}>
                                  <span>ID: {report.report_id}</span>
                                  <span>Source: MOBILE_APP {report.created_offline ? '(Offline First)' : ''}</span>
                                </div>
                                {report.latitude && report.longitude && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedFieldReportId(report.report_id);
                                      setMapCenter([report.latitude, report.longitude]);
                                      setMapZoom(15);
                                    }}
                                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                  >
                                    📍 Locate on Map
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}`;

// Regex to capture from "{fieldReports.map(report => (" to "))}"
const regex = /\{fieldReports\.map\(report => \([\s\S]*?\}\)\)\}/m;

if (regex.test(code)) {
  code = code.replace(regex, injection);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully patched Field Reports list via regex!');
} else {
  console.log('Regex failed.');
}
