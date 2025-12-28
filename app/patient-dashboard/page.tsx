'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

export default function PatientDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [consent, setConsent] = useState<any>(null);
  const [myPredictions, setMyPredictions] = useState<any[]>([]);
  const [accessLog, setAccessLog] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'predictions' | 'mydata' | 'consent' | 'access'>('predictions');
  const [loading, setLoading] = useState(true);
  const [clinicalData, setClinicalData] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in as patient
    const storedSession = localStorage.getItem('biotek_session');
    if (!storedSession) {
      router.push('/login');
      return;
    }

    const sessionData = JSON.parse(storedSession);
    
    // Verify user is a patient
    if (sessionData.role !== 'patient') {
      alert('This dashboard is only for patients. Redirecting...');
      router.push('/platform');
      return;
    }

    setSession(sessionData);

    // Load patient data
    loadPatientData(sessionData.userId);
  }, [router]);

  const loadPatientData = async (patientId: string) => {
    setLoading(true);
    
    // Load consent status
    const storedConsent = localStorage.getItem('biotek_consent');
    if (storedConsent) {
      setConsent(JSON.parse(storedConsent));
    }

    // Load my predictions
    try {
      const response = await fetch(`${API_BASE}/audit/logs?limit=50`);
      const data = await response.json();
      
      // Filter to only this patient's predictions
      const myData = data.filter((log: any) => 
        log.patient_id && log.patient_id.includes(patientId)
      );
      setMyPredictions(myData);
    } catch (error) {
      console.error('Failed to load predictions:', error);
    }

    // Load who accessed my data
    try {
      const response = await fetch(`${API_BASE}/audit/access-log?limit=50`);
      const data = await response.json();
      
      // Filter to accesses related to this patient
      const myAccess = data.access_logs.filter((log: any) => 
        log.patient_id && log.patient_id.includes(patientId)
      );
      setAccessLog(myAccess);
    } catch (error) {
      console.error('Failed to load access log:', error);
    }

    // Load my clinical data
    try {
      const response = await fetch(`${API_BASE}/patient/${patientId}/clinical-data`, {
        headers: {
          'X-User-ID': patientId,
          'X-User-Role': 'patient'
        }
      });
      const data = await response.json();
      if (data.found) {
        setClinicalData(data);
      }
    } catch (error) {
      console.error('Failed to load clinical data:', error);
    }

    setLoading(false);
  };

  const handleRevokeConsent = () => {
    if (confirm('Are you sure you want to revoke your consent? This will delete your data and end your session.')) {
      localStorage.removeItem('biotek_consent');
      localStorage.removeItem('biotek_session');
      alert('Consent revoked. Your data will be deleted.');
      router.push('/');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('biotek_session');
    router.push('/login');
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f3e7d9' }}>
        <div className="text-black/50">Loading your data...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f3e7d9' }}>
      {/* Header */}
      <header className="border-b border-black/10 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image 
                src="/images/ChatGPT Image Nov 10, 2025, 08_09_36 AM.png" 
                alt="BioTeK"
                width={40}
                height={40}
              />
              <div>
                <div className="text-xl font-bold">My Health Dashboard</div>
                <div className="text-xs text-black/50">Patient Portal</div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Patient Info */}
              <div className="flex items-center gap-3 px-4 py-2 bg-stone-50 rounded-full border border-stone-200">
                <div className="text-2xl">🧑</div>
                <div className="text-sm">
                  <div className="font-medium">Patient</div>
                  <div className="text-black/50 text-xs">{session.userId}</div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="text-sm text-black/60 hover:text-black transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-black/10 bg-white/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {[
              { id: 'predictions', label: 'My Predictions', icon: '📊' },
              { id: 'mydata', label: 'My Clinical Data', icon: '🩺' },
              { id: 'consent', label: 'Privacy & Consent', icon: '🔒' },
              { id: 'access', label: 'Who Accessed My Data', icon: '👁️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-black text-black font-medium'
                    : 'border-transparent text-black/50 hover:text-black'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* My Predictions Tab */}
          {activeTab === 'predictions' && (
            <motion.div
              key="predictions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/80 backdrop-blur-md rounded-3xl p-8"
            >
              <h2 className="text-2xl font-bold text-black mb-6">My Risk Predictions</h2>
              
              {myPredictions.length > 0 ? (
                <div className="space-y-4">
                  {myPredictions.map((pred) => (
                    <div key={pred.id} className="p-6 bg-black/5 rounded-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm text-black/50">
                            {new Date(pred.timestamp).toLocaleDateString()} at{' '}
                            {new Date(pred.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="text-xs text-black/40 font-mono">{pred.patient_id}</div>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                          pred.risk_category === 'High Risk'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {pred.risk_category}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-black/50">Genetic Data Used:</span>
                          <span className="ml-2 font-medium">{pred.used_genetics ? 'Yes' : 'No'}</span>
                        </div>
                        <div>
                          <span className="text-black/50">Model Version:</span>
                          <span className="ml-2 font-medium">v{pred.model_version}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📊</div>
                  <p className="text-black/60">No predictions yet</p>
                  <p className="text-sm text-black/40 mt-2">
                    Visit your doctor to get a risk assessment
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* My Clinical Data Tab */}
          {activeTab === 'mydata' && (
            <motion.div
              key="mydata"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/80 backdrop-blur-md rounded-3xl p-8"
            >
              <h2 className="text-2xl font-bold text-black mb-6">My Clinical Data</h2>
              
              {clinicalData ? (
                <div className="space-y-6">
                  {/* Last Updated Info */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500">ℹ️</span>
                      <span className="text-sm text-blue-800">
                        Data on file from your healthcare visits
                      </span>
                    </div>
                    <span className="text-xs text-blue-600">
                      Last updated: {new Date(clinicalData.metadata?.updated_at || '').toLocaleDateString()}
                    </span>
                  </div>

                  {/* Clinical Data Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'age', label: 'Age', unit: 'years', icon: '🎂' },
                      { key: 'sex', label: 'Sex', unit: '', icon: '👤', format: (v: number) => v === 1 ? 'Male' : 'Female' },
                      { key: 'bmi', label: 'BMI', unit: 'kg/m²', icon: '⚖️' },
                      { key: 'bp_systolic', label: 'BP Systolic', unit: 'mmHg', icon: '💓' },
                      { key: 'bp_diastolic', label: 'BP Diastolic', unit: 'mmHg', icon: '💓' },
                      { key: 'total_cholesterol', label: 'Total Cholesterol', unit: 'mg/dL', icon: '🩸' },
                      { key: 'hdl', label: 'HDL', unit: 'mg/dL', icon: '🩸' },
                      { key: 'ldl', label: 'LDL', unit: 'mg/dL', icon: '🩸' },
                      { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', icon: '🩸' },
                      { key: 'hba1c', label: 'HbA1c', unit: '%', icon: '📊' },
                      { key: 'egfr', label: 'eGFR', unit: 'mL/min', icon: '🫘' },
                      { key: 'has_diabetes', label: 'Diabetes', unit: '', icon: '💉', format: (v: number) => v ? 'Yes' : 'No' },
                    ].map(field => {
                      const value = clinicalData.data?.[field.key];
                      const displayValue = field.format ? field.format(value) : value;
                      return (
                        <div key={field.key} className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                          <div className="flex items-center gap-2 mb-2">
                            <span>{field.icon}</span>
                            <span className="text-xs text-black/50">{field.label}</span>
                          </div>
                          <div className="text-xl font-bold text-black">
                            {value !== null && value !== undefined ? displayValue : '—'}
                          </div>
                          {field.unit && value !== null && (
                            <div className="text-xs text-black/40">{field.unit}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Request Data Deletion */}
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-red-900">Delete My Data</h4>
                        <p className="text-sm text-red-700">Request permanent deletion of your clinical data (GDPR Article 17)</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure? This will permanently delete all your clinical data.')) {
                            try {
                              await fetch(`${API_BASE}/patient/${session.userId}/clinical-data`, {
                                method: 'DELETE',
                                headers: {
                                  'X-User-ID': session.userId,
                                  'X-User-Role': 'patient',
                                  'X-Deletion-Reason': 'Patient request'
                                }
                              });
                              setClinicalData(null);
                              alert('Your clinical data has been deleted.');
                            } catch (err) {
                              alert('Failed to delete data. Please contact support.');
                            }
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                      >
                        Delete Data
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🩺</div>
                  <p className="text-black/60">No clinical data on file</p>
                  <p className="text-sm text-black/40 mt-2">
                    Your data will appear here after your next doctor visit
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Consent Tab */}
          {activeTab === 'consent' && (
            <motion.div
              key="consent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/80 backdrop-blur-md rounded-3xl p-8"
            >
              <h2 className="text-2xl font-bold text-black mb-6">Privacy & Consent Settings</h2>
              
              {consent ? (
                <div className="space-y-6">
                  {/* Consent Status */}
                  <div className="p-6 bg-green-50 border border-green-200 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">✅</span>
                      <div>
                        <h3 className="font-bold text-green-900">Consent Active</h3>
                        <p className="text-sm text-green-700">
                          You consented on {new Date(consent.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={consent.clinical ? 'text-green-600' : 'text-red-600'}>
                          {consent.clinical ? '✓' : '✗'}
                        </span>
                        <span>Clinical Data Sharing: {consent.clinical ? 'Allowed' : 'Not Allowed'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={consent.genetic ? 'text-green-600' : 'text-red-600'}>
                          {consent.genetic ? '✓' : '✗'}
                        </span>
                        <span>Genetic Data Sharing: {consent.genetic ? 'Allowed' : 'Not Allowed'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={consent.audit ? 'text-green-600' : 'text-red-600'}>
                          {consent.audit ? '✓' : '✗'}
                        </span>
                        <span>Audit Trail: {consent.audit ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Guarantees */}
                  <div className="p-6 bg-stone-50 border border-stone-200 rounded-2xl">
                    <h3 className="font-bold text-black mb-3">Your Privacy Guarantees</h3>
                    <ul className="space-y-2 text-sm text-black/70">
                      <li className="flex items-start gap-2">
                        <span>🔒</span>
                        <span>Differential Privacy (ε=3.0) - Mathematical privacy guarantee</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>🏥</span>
                        <span>Federated Learning - Your raw data never leaves the hospital</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>📋</span>
                        <span>Full Audit Trail - You can see who accessed your data</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>⚖️</span>
                        <span>HIPAA & GDPR Compliant - Maximum legal protection</span>
                      </li>
                    </ul>
                  </div>

                  {/* Revoke Consent */}
                  <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
                    <h3 className="font-bold text-red-900 mb-2">Revoke Consent</h3>
                    <p className="text-sm text-red-700 mb-4">
                      You can withdraw your consent at any time. This will delete all your data and end your session.
                    </p>
                    <button
                      onClick={handleRevokeConsent}
                      className="bg-red-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-red-700 transition-all"
                    >
                      Revoke All Consent
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">⚠️</div>
                  <p className="text-black/60 mb-4">No consent record found</p>
                  <button
                    onClick={() => router.push('/consent')}
                    className="bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-black/80 transition-all"
                  >
                    Provide Consent
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Access Log Tab */}
          {activeTab === 'access' && (
            <motion.div
              key="access"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/80 backdrop-blur-md rounded-3xl p-8"
            >
              <h2 className="text-2xl font-bold text-black mb-2">Who Accessed My Data</h2>
              <p className="text-sm text-black/60 mb-6">
                Complete audit trail of all access to your medical information
              </p>
              
              {accessLog.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-black/5">
                      <tr>
                        <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Date & Time</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-black/70">User</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Role</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Purpose</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Data Type</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessLog.map((log) => (
                        <tr key={log.id} className="border-b border-black/5 hover:bg-black/5">
                          <td className="py-3 px-4 text-sm text-black/70">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm font-mono text-black">{log.user_id}</td>
                          <td className="py-3 px-4 text-sm capitalize text-black/70">{log.user_role}</td>
                          <td className="py-3 px-4 text-sm capitalize text-black/70">{log.purpose}</td>
                          <td className="py-3 px-4 text-sm text-black/70">{log.data_type}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              log.granted
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {log.granted ? 'Granted' : 'Denied'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">👁️</div>
                  <p className="text-black/60">No access records yet</p>
                  <p className="text-sm text-black/40 mt-2">
                    Access attempts will appear here
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
