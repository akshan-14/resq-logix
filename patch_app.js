const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'src', 'App.jsx');
let code = fs.readFileSync(file, 'utf8');

const target = `                )}
              </>
            )}`;

const injection = `                )}

                {/* 5. FIELD REPORTS SUB-VIEW */}
                {logisticsSubTab === 'field_reports' && (
                  <div className="logistics-list-container" style={{ padding: '20px' }}>
                    <div className="section-header-row" style={{ marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '1.25rem', margin: 0 }}>📱 Mobile Field Reports</h2>
                      <div style={{ background: '#3b82f6', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        Live Ground Data
                      </div>
                    </div>
                    
                    {fieldReports.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        No field reports synchronized yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {fieldReports.map(report => (
                          <div key={report.report_id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e293b' }}>
                                {report.report_type.replace(/_/g, ' ')}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                {new Date(report.timestamp).toLocaleString()}
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                              <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                {report.severity}
                              </span>
                              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                {report.status || 'UNVERIFIED'}
                              </span>
                              <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                GPS: {report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}
                              </span>
                            </div>
                            
                            <p style={{ margin: 0, color: '#334155', fontSize: '0.9rem', lineHeight: '1.4' }}>
                              {report.description || 'No description provided.'}
                            </p>
                            
                            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                              <span>ID: {report.report_id}</span>
                              <span>Source: MOBILE_APP {report.created_offline ? '(Offline First)' : ''}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}`;

if (code.includes('FIELD REPORTS SUB-VIEW')) {
  console.log('Already injected.');
} else {
  code = code.replace(target, injection);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Successfully injected Field Reports tab!');
}
