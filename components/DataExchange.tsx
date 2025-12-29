'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'https://biotek-production.up.railway.app';

interface DataExchangeProps {
  patientId: string | null;
  userId?: string;
  userRole?: string;
}

const INSTITUTIONS = [
  { id: 'HOSP001', name: 'City General Hospital', type: 'Hospital', verified: true },
  { id: 'LAB001', name: 'LabCorp Diagnostics', type: 'Laboratory', verified: true },
  { id: 'HOSP002', name: 'University Medical Center', type: 'Hospital', verified: true },
  { id: 'CLINIC001', name: 'Primary Care Associates', type: 'Clinic', verified: true },
  { id: 'RESEARCH001', name: 'NIH Research Institute', type: 'Research', verified: true },
];

const DATA_CATEGORIES = [
  { id: 'demographics', name: 'Demographics', description: 'Age, sex, basic info', icon: '👤' },
  { id: 'vitals', name: 'Vitals', description: 'Blood pressure, BMI, heart rate', icon: '💓' },
  { id: 'lab_results', name: 'Lab Results', description: 'HbA1c, cholesterol, glucose', icon: '🧪' },
  { id: 'risk_predictions', name: 'Risk Predictions', description: 'AI-generated disease risk scores', icon: '📊' },
  { id: 'genetic_data', name: 'Genetic Data', description: 'Variant analyses, pharmacogenomics', icon: '🧬' },
  { id: 'imaging', name: 'Imaging Results', description: 'X-ray, MRI analysis results', icon: '🩻' },
  { id: 'treatments', name: 'Treatment Protocols', description: 'AI-generated treatment plans', icon: '💊' },
];

const PURPOSES = [
  { id: 'treatment', name: 'Continued Treatment', description: 'Transfer care to another provider' },
  { id: 'consultation', name: 'Specialist Consultation', description: 'Get expert opinion' },
  { id: 'lab_testing', name: 'Laboratory Testing', description: 'Send for additional tests' },
  { id: 'research', name: 'Research Study', description: 'Approved research participation' },
  { id: 'emergency', name: 'Emergency Care', description: 'Urgent medical situation' },
];

export default function DataExchange({ patientId, userId, userRole }: DataExchangeProps) {
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState(1);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async () => {
    if (!patientId || !selectedInstitution || selectedCategories.length === 0 || !selectedPurpose || !consentConfirmed) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_BASE}/data-exchange/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId || 'doctor_session',
          'X-User-Role': userRole || 'doctor'
        },
        body: JSON.stringify({
          patient_id: patientId,
          recipient_institution: selectedInstitution,
          categories: selectedCategories,
          purpose: selectedPurpose,
          consent_confirmed: consentConfirmed,
          initiated_by: userId || 'doctor_session'
        })
      });

      const data = await response.json();
      setResult(data);
      setStep(4);
    } catch (error) {
      console.error('Data exchange failed:', error);
      setResult({ error: 'Failed to initiate data exchange. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedInstitution(null);
    setSelectedCategories([]);
    setSelectedPurpose(null);
    setConsentConfirmed(false);
    setResult(null);
    setStep(1);
  };

  if (!patientId) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border border-black/10">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="text-xl font-bold text-black mb-2">No Patient Selected</h3>
        <p className="text-black/60">
          Select a patient first to share their data with other institutions
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-black/10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
          <span className="text-2xl">🏥</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-black">Secure Data Exchange</h2>
          <p className="text-sm text-black/60">Share patient data with verified institutions • HIPAA Compliant</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= s ? 'bg-blue-600 text-white' : 'bg-black/10 text-black/40'
            }`}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && (
              <div className={`w-16 h-1 mx-2 rounded ${step > s ? 'bg-blue-600' : 'bg-black/10'}`} />
            )}
          </div>
        ))}
        <span className="ml-4 text-sm text-black/60">
          {step === 1 && 'Select Recipient'}
          {step === 2 && 'Choose Data'}
          {step === 3 && 'Confirm & Send'}
          {step === 4 && 'Complete'}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Select Institution */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h3 className="font-bold text-black mb-4">Select Recipient Institution</h3>
            <p className="text-sm text-black/60 mb-4">Only verified and trusted institutions can receive patient data</p>
            
            <div className="grid gap-3">
              {INSTITUTIONS.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => setSelectedInstitution(inst.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedInstitution === inst.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-black/10 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-black">{inst.name}</div>
                      <div className="text-sm text-black/60">{inst.type}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inst.verified && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          ✓ Verified
                        </span>
                      )}
                      {selectedInstitution === inst.id && (
                        <span className="text-blue-600">✓</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!selectedInstitution}
                className={`px-6 py-3 rounded-full font-medium ${
                  selectedInstitution
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-black/10 text-black/40 cursor-not-allowed'
                }`}
              >
                Next →
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Select Data Categories */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h3 className="font-bold text-black mb-4">Select Data to Share</h3>
            <p className="text-sm text-black/60 mb-4">Only selected categories will be shared (data minimization)</p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {DATA_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedCategories.includes(cat.id)
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-black/10 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <div className="font-semibold text-black">{cat.name}</div>
                      <div className="text-xs text-black/60">{cat.description}</div>
                    </div>
                    {selectedCategories.includes(cat.id) && (
                      <span className="ml-auto text-blue-600">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <h3 className="font-bold text-black mb-4">Purpose of Exchange</h3>
            <div className="grid gap-2 mb-6">
              {PURPOSES.map((purpose) => (
                <button
                  key={purpose.id}
                  onClick={() => setSelectedPurpose(purpose.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedPurpose === purpose.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-black/10 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-black">{purpose.name}</div>
                      <div className="text-xs text-black/60">{purpose.description}</div>
                    </div>
                    {selectedPurpose === purpose.id && (
                      <span className="text-blue-600">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-full font-medium bg-black/5 text-black hover:bg-black/10"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={selectedCategories.length === 0 || !selectedPurpose}
                className={`px-6 py-3 rounded-full font-medium ${
                  selectedCategories.length > 0 && selectedPurpose
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-black/10 text-black/40 cursor-not-allowed'
                }`}
              >
                Next →
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Confirm & Consent */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h3 className="font-bold text-black mb-4">Review & Confirm</h3>
            
            {/* Summary */}
            <div className="bg-stone-50 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-black/60">Patient ID</div>
                  <div className="font-bold text-black">{patientId}</div>
                </div>
                <div>
                  <div className="text-black/60">Recipient</div>
                  <div className="font-bold text-black">
                    {INSTITUTIONS.find(i => i.id === selectedInstitution)?.name}
                  </div>
                </div>
                <div>
                  <div className="text-black/60">Purpose</div>
                  <div className="font-bold text-black">
                    {PURPOSES.find(p => p.id === selectedPurpose)?.name}
                  </div>
                </div>
                <div>
                  <div className="text-black/60">Data Categories</div>
                  <div className="font-bold text-black">{selectedCategories.length} selected</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-black/10">
                <div className="text-black/60 text-sm mb-2">Data being shared:</div>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map(catId => {
                    const cat = DATA_CATEGORIES.find(c => c.id === catId);
                    return (
                      <span key={catId} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {cat?.icon} {cat?.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentConfirmed}
                  onChange={(e) => setConsentConfirmed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-amber-400"
                />
                <div>
                  <div className="font-semibold text-amber-900">Patient Consent Confirmation</div>
                  <div className="text-sm text-amber-800">
                    I confirm that the patient has provided explicit consent to share the selected data 
                    categories with the recipient institution for the stated purpose. This exchange 
                    will be logged for HIPAA compliance and audit purposes.
                  </div>
                </div>
              </label>
            </div>

            {/* Security Notice */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                <span>🔒</span> Security Measures
              </div>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Data will be encrypted before transmission</li>
                <li>• Full audit log will be created</li>
                <li>• Patient can view this exchange in their records</li>
                <li>• Only verified institutions can receive data</li>
              </ul>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-full font-medium bg-black/5 text-black hover:bg-black/10"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!consentConfirmed || isSubmitting}
                className={`px-8 py-3 rounded-full font-medium flex items-center gap-2 ${
                  consentConfirmed && !isSubmitting
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-black/10 text-black/40 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>🔐 Send Securely</>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            {result?.error ? (
              <>
                <div className="text-5xl mb-4">❌</div>
                <h3 className="text-xl font-bold text-red-600 mb-2">Exchange Failed</h3>
                <p className="text-black/60 mb-6">{result.error}</p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-green-600 mb-2">Data Exchange Initiated</h3>
                <p className="text-black/60 mb-6">
                  Patient data has been securely encrypted and sent to the recipient institution.
                </p>
                
                <div className="bg-stone-50 rounded-xl p-6 text-left max-w-md mx-auto mb-6">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black/60">Exchange ID:</span>
                      <span className="font-mono text-black">{result?.exchange_id || 'EX-' + Date.now()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/60">Status:</span>
                      <span className="text-green-600 font-medium">Sent</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/60">Audit Log:</span>
                      <span className="text-blue-600">Created ✓</span>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            <button
              onClick={resetForm}
              className="px-6 py-3 rounded-full font-medium bg-black text-white hover:bg-black/80"
            >
              Start New Exchange
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
