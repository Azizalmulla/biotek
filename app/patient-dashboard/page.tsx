'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://biotek-api.onrender.com';

export default function PatientDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [consent, setConsent] = useState<any>(null);
  const [myPredictions, setMyPredictions] = useState<any[]>([]);
  const [accessLog, setAccessLog] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'predictions' | 'mydata' | 'consent' | 'access'>('predictions');
  const [loading, setLoading] = useState(true);
  const [clinicalData, setClinicalData] = useState<any>(null);
  const [finalizedEncounters, setFinalizedEncounters] = useState<any[]>([]);

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

    // Load my predictions from the correct endpoint (not audit logs!)
    try {
      const response = await fetch(`${API_BASE}/patient/${patientId}/prediction-results`, {
        headers: {
          'X-User-ID': patientId,
          'X-User-Role': 'patient'
        }
      });
      const data = await response.json();
      
      if (data.found && data.prediction) {
        // Convert prediction data to array format for display
        const predictions = data.prediction.predictions || {};
        const predictionArray = Object.values(predictions).map((pred: any) => ({
          ...pred,
          timestamp: data.updated_at,
          patient_id: patientId
        }));
        setMyPredictions(predictionArray);
      } else {
        setMyPredictions([]);
      }
    } catch (error) {
      console.error('Failed to load predictions:', error);
      setMyPredictions([]);
    }

    // Load who accessed my data - use new RBAC audit trail endpoint
    try {
      const response = await fetch(`${API_BASE}/auth/audit/patient/${patientId}?limit=50`, {
        headers: {
          'X-User-ID': patientId,
          'X-User-Role': 'patient'
        }
      });
      const data = await response.json();
      
      // Real audit trail from RBAC system
      setAccessLog(data.audit_trail || []);
    } catch (error) {
      console.error('Failed to load access log:', error);
      // Fallback to old endpoint if new one fails
      try {
        const fallbackResponse = await fetch(`${API_BASE}/audit/access-log?limit=50`);
        const fallbackData = await fallbackResponse.json();
        const myAccess = fallbackData.access_logs?.filter((log: any) => 
          log.patient_id && log.patient_id.includes(patientId)
        ) || [];
        setAccessLog(myAccess);
      } catch {
        setAccessLog([]);
      }
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

    // Load finalized encounters (clinician-reviewed assessments)
    try {
      const response = await fetch(`${API_BASE}/patients/${patientId}/encounters`, {
        headers: {
          'X-User-ID': patientId,
          'X-User-Role': 'patient'
        }
      });
      const data = await response.json();
      setFinalizedEncounters(data.encounters || []);
    } catch (error) {
      console.error('Failed to load encounters:', error);
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
              className="space-y-6"
            >
              {/* Header Section */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-black mb-2">My Health Risk Estimates</h2>
                <p className="text-black/60 text-sm">
                  These estimates are based on your clinical data and help identify areas for preventive care.
                </p>
              </div>

              {/* Important Disclaimer Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <div className="font-medium text-blue-900">Understanding Your Results</div>
                    <p className="text-sm text-blue-800 mt-1">
                      These are <strong>risk estimates</strong>, not medical diagnoses. They indicate areas where 
                      preventive measures may be beneficial. Always discuss results with your healthcare provider 
                      before making health decisions.
                    </p>
                  </div>
                </div>
              </div>
              
              {myPredictions.length > 0 ? (
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8">
                  <div className="space-y-4">
                    {myPredictions.map((pred) => {
                      // Determine if this is a clinical diagnosis vs risk estimate
                      const isDiagnosed = pred.diagnostic_threshold_met === true;
                      // Patient-safe risk category (cap at HIGH, never show VERY HIGH)
                      const displayCategory = pred.risk_category === 'VERY HIGH' ? 'HIGH' : pred.risk_category;
                      // Round percentage to nearest 5 for less alarming display
                      const displayPercentage = pred.risk_percentage !== undefined 
                        ? Math.round(pred.risk_percentage / 5) * 5 
                        : null;
                      
                      return (
                        <div 
                          key={pred.disease_id || pred.id} 
                          className={`p-6 rounded-2xl border ${
                            isDiagnosed 
                              ? 'bg-purple-50 border-purple-200' 
                              : 'bg-stone-50 border-stone-200'
                          }`}
                        >
                          {/* Header: Disease Name + Risk Badge */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              {/* Framed as Risk Estimate */}
                              <div className="text-xs uppercase tracking-wide text-black/50 mb-1">
                                {isDiagnosed ? 'Clinical Finding' : 'Risk Estimate'}
                              </div>
                              <div className="text-lg font-semibold text-black">
                                {pred.name || pred.disease_id || 'Health Condition'}
                              </div>
                              {isDiagnosed && (
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
                                    Clinically Identified
                                  </span>
                                  <span className="text-xs text-purple-700">
                                    Based on your lab values
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Risk Level Badge */}
                            {!isDiagnosed && (
                              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                                displayCategory === 'HIGH'
                                  ? 'bg-red-100 text-red-700'
                                  : displayCategory === 'MODERATE'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {displayCategory === 'HIGH' ? 'Higher Risk' : 
                                 displayCategory === 'MODERATE' ? 'Moderate Risk' : 'Lower Risk'}
                              </span>
                            )}
                          </div>
                          
                          {/* Risk Percentage (rounded, patient-friendly) */}
                          {!isDiagnosed && displayPercentage !== null && (
                            <div className="mb-4">
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-black/60">Estimated risk level</span>
                                <span className="font-medium text-black/80">~{displayPercentage}%</span>
                              </div>
                              <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    displayPercentage >= 25 ? 'bg-red-400' : 
                                    displayPercentage >= 15 ? 'bg-amber-400' : 'bg-green-400'
                                  }`}
                                  style={{ width: `${Math.min(displayPercentage, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-black/40 mt-1">
                                Compared to general population averages
                              </p>
                            </div>
                          )}
                          
                          {/* Genetics Contribution - Patient-Safe View */}
                          {pred.genetic_rr && pred.genetic_rr !== 1.0 && (
                            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-purple-500">🧬</span>
                                <span className="text-sm font-medium text-purple-900">Genetic factors considered</span>
                              </div>
                              <p className="text-xs text-purple-700">
                                Your genetic profile was included in this risk estimate. 
                                {pred.genetic_rr > 1.0 
                                  ? ' Your genetics suggest a somewhat elevated baseline risk for this condition.'
                                  : ' Your genetics suggest a somewhat lower baseline risk for this condition.'}
                              </p>
                              {pred.prs_percentile && (
                                <p className="text-xs text-purple-600 mt-1">
                                  Genetic risk score: {pred.prs_percentile < 30 ? 'Lower than average' : 
                                    pred.prs_percentile < 70 ? 'Average range' : 'Higher than average'}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {/* Key Info Grid */}
                          <div className="flex flex-wrap gap-4 text-sm mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-black/40">🧬</span>
                              <span className="text-black/60">Genetic data:</span>
                              <span className="font-medium">{pred.genetic_rr && pred.genetic_rr !== 1.0 ? 'Included' : 'Not included'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-black/40">📅</span>
                              <span className="text-black/60">Assessed:</span>
                              <span className="font-medium">
                                {new Date(pred.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          {/* Patient-Safe Disclaimer */}
                          <div className="pt-3 border-t border-black/10">
                            <p className="text-xs text-black/50 italic">
                              {isDiagnosed 
                                ? 'This finding is based on clinical criteria. Your doctor can provide more information about next steps.'
                                : 'This is a risk estimate, not a medical diagnosis. Discuss with your healthcare provider for personalized guidance.'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Summary Footer */}
                  <div className="mt-6 pt-6 border-t border-black/10">
                    <div className="flex items-center justify-between text-sm text-black/50">
                      <span>Last updated: {myPredictions[0]?.timestamp ? new Date(myPredictions[0].timestamp).toLocaleDateString() : 'N/A'}</span>
                      <span>Reviewed by your care team</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8">
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📊</div>
                    <p className="text-black/60 font-medium">No risk assessments yet</p>
                    <p className="text-sm text-black/40 mt-2">
                      Your doctor will share your health risk estimates after your next visit.
                    </p>
                  </div>
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
              
              {/* Finalized Assessments Section */}
              {finalizedEncounters.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                    <span>✅</span> Finalized Assessments
                  </h3>
                  <div className="space-y-3">
                    {finalizedEncounters.map((enc: any) => (
                      <div key={enc.encounter_id} className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">📋</span>
                            <div>
                              <div className="font-medium text-green-900">
                                {enc.encounter_type === 'risk_assessment' ? 'Risk Assessment' : enc.encounter_type}
                              </div>
                              <div className="text-sm text-green-700">
                                Reviewed by {enc.created_by_role} • {new Date(enc.completed_at || enc.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                            Finalized
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {finalizedEncounters.length === 0 && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500">📝</span>
                    <span className="text-sm text-amber-800">
                      No finalized assessments yet. Your clinician will complete and finalize assessments during your visits.
                    </span>
                  </div>
                </div>
              )}
              
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
                      {accessLog.map((log, idx) => {
                        // Handle both old and new audit format
                        const userId = log.actor_user_id || log.user_id || 'Unknown';
                        const userRole = log.actor_role || log.user_role || 'unknown';
                        const isGranted = log.status === 'granted' || log.granted === true;
                        const isBreakGlass = log.break_glass === 1 || log.break_glass === true;
                        
                        return (
                          <tr key={log.id || idx} className={`border-b border-black/5 hover:bg-black/5 ${isBreakGlass ? 'bg-red-50' : ''}`}>
                            <td className="py-3 px-4 text-sm text-black/70">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm font-mono text-black">
                              {userId}
                              {isBreakGlass && <span className="ml-2 text-red-600">🚨</span>}
                            </td>
                            <td className="py-3 px-4 text-sm capitalize text-black/70">{userRole}</td>
                            <td className="py-3 px-4 text-sm capitalize text-black/70">{log.purpose || log.action || '-'}</td>
                            <td className="py-3 px-4 text-sm text-black/70">{log.data_type || log.action || '-'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isGranted
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {isGranted ? 'Granted' : 'Denied'}
                              </span>
                              {isBreakGlass && (
                                <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                  Break-Glass
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
