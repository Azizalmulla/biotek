'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://biotek-production.up.railway.app';

interface PatientSelectorProps {
  onSelect: (patientId: string, encounterId?: string) => void;
  currentPatientId?: string;
  currentEncounterId?: string;
  userRole?: string;
  userId?: string;
}

type Purpose = 'treatment' | 'emergency' | 'research' | 'billing' | 'registration';

export default function PatientSelector({ 
  onSelect, 
  currentPatientId, 
  currentEncounterId,
  userRole = 'doctor',
  userId = 'doctor_DOC001'
}: PatientSelectorProps) {
  const [patientId, setPatientId] = useState(currentPatientId || '');
  const [showDialog, setShowDialog] = useState(false);
  const [showBreakGlass, setShowBreakGlass] = useState(false);
  const [purpose, setPurpose] = useState<Purpose>('treatment');
  const [justification, setJustification] = useState('');
  const [breakGlassReason, setBreakGlassReason] = useState('');
  const [isCreatingEncounter, setIsCreatingEncounter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<any>(null);

  // Create encounter when selecting patient
  const handleSubmit = async () => {
    if (!patientId.trim()) return;
    
    setIsCreatingEncounter(true);
    setError(null);
    
    try {
      // First check consent
      const consentRes = await fetch(`${API_BASE}/auth/consent/${patientId.trim()}`, {
        headers: {
          'X-User-Role': userRole,
          'X-User-ID': userId
        }
      });
      const consentData = await consentRes.json();
      setConsent(consentData);
      
      // Create encounter
      const response = await fetch(`${API_BASE}/auth/encounters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole,
          'X-User-ID': userId
        },
        body: JSON.stringify({
          patient_id: patientId.trim(),
          purpose: purpose,
          justification: justification || undefined
        })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to create encounter');
      }
      
      const data = await response.json();
      onSelect(patientId.trim(), data.encounter_id);
      setShowDialog(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreatingEncounter(false);
    }
  };

  // Break-glass emergency access
  const handleBreakGlass = async () => {
    if (!patientId.trim() || breakGlassReason.length < 10) return;
    
    setIsCreatingEncounter(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/auth/break-glass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole,
          'X-User-ID': userId
        },
        body: JSON.stringify({
          patient_id: patientId.trim(),
          reason: breakGlassReason,
          emergency_type: 'clinical_emergency'
        })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Break-glass failed');
      }
      
      const data = await response.json();
      onSelect(patientId.trim(), data.encounter_id);
      setShowDialog(false);
      setShowBreakGlass(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreatingEncounter(false);
    }
  };

  return (
    <>
      {/* Current Patient Display */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-blue-900 font-medium mb-1">Current Patient Context</div>
            <div className="font-mono text-blue-600">
              {currentPatientId || 'No patient selected'}
            </div>
            {currentEncounterId && (
              <div className="text-xs text-blue-500 mt-1">
                Encounter: {currentEncounterId.slice(0, 8)}...
              </div>
            )}
          </div>
          <button
            onClick={() => setShowDialog(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-all"
          >
            {currentPatientId ? 'Change Patient' : 'Select Patient'}
          </button>
        </div>
        
        {currentPatientId && (
          <div className="mt-3 text-xs text-blue-700">
            🔒 Encounter-scoped access • All actions logged in audit trail
          </div>
        )}
      </div>

      {/* Patient Selection Dialog with Encounter Creation */}
      {showDialog && !showBreakGlass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-black mb-2">Start Patient Encounter</h3>
            <p className="text-black/60 text-sm mb-6">
              Creating an encounter is required to access patient data. This ensures proper authorization and audit trails.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-black/70 mb-2">
                Patient ID *
              </label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g., PAT-123456"
                className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none transition-all text-black placeholder-black/30"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-black/70 mb-2">
                Purpose of Access *
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as Purpose)}
                className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none transition-all text-black"
              >
                <option value="treatment">Treatment - Direct patient care</option>
                <option value="emergency">Emergency - Urgent clinical need</option>
                <option value="billing">Billing - Administrative purposes</option>
                <option value="registration">Registration - Patient intake</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-black/70 mb-2">
                Justification (optional)
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Brief reason for accessing this patient's data..."
                className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none transition-all text-black placeholder-black/30 resize-none h-20"
              />
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <div className="text-xs text-green-800">
                  <strong>RBAC Enforced:</strong> Your role ({userRole}) determines what data you can access. 
                  Encounter expires in 24 hours.
                </div>
              </div>
            </div>

            {consent && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl mb-4">
                <div className="text-xs text-purple-800">
                  <strong>Patient Consent Status:</strong>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <span className={consent.consent_genetic ? 'text-green-600' : 'text-red-600'}>
                      {consent.consent_genetic ? '✓' : '✗'} Genetic Data
                    </span>
                    <span className={consent.consent_imaging ? 'text-green-600' : 'text-red-600'}>
                      {consent.consent_imaging ? '✓' : '✗'} Imaging
                    </span>
                    <span className={consent.consent_ai_analysis ? 'text-green-600' : 'text-red-600'}>
                      {consent.consent_ai_analysis ? '✓' : '✗'} AI Analysis
                    </span>
                    <span className={consent.consent_research ? 'text-green-600' : 'text-red-600'}>
                      {consent.consent_research ? '✓' : '✗'} Research
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => {
                  setShowDialog(false);
                  setPatientId(currentPatientId || '');
                  setError(null);
                }}
                className="flex-1 bg-black/5 text-black py-3 rounded-full font-medium hover:bg-black/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!patientId.trim() || isCreatingEncounter}
                className="flex-1 bg-black text-white py-3 rounded-full font-medium hover:bg-black/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreatingEncounter ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Creating...
                  </>
                ) : (
                  'Start Encounter'
                )}
              </button>
            </div>

            {/* Break-Glass Option */}
            {(userRole === 'doctor' || userRole === 'admin') && (
              <button
                onClick={() => setShowBreakGlass(true)}
                className="w-full text-center text-sm text-red-600 hover:text-red-700 py-2"
              >
                🚨 Emergency Break-Glass Access
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* Break-Glass Dialog */}
      {showBreakGlass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border-4 border-red-500"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🚨</span>
              <div>
                <h3 className="text-2xl font-bold text-red-600">Emergency Break-Glass</h3>
                <p className="text-red-600/80 text-sm">
                  Bypass normal access controls for emergencies
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="p-4 bg-red-50 border border-red-300 rounded-xl mb-6">
              <div className="text-sm text-red-800">
                <strong>⚠️ Warning:</strong> Break-glass access:
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                  <li>Creates permanent audit record</li>
                  <li>Triggers admin notification</li>
                  <li>Patient can see this access</li>
                  <li>Will be reviewed for appropriateness</li>
                  <li>Expires in 4 hours (not 24)</li>
                </ul>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-black/70 mb-2">
                Patient ID *
              </label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g., PAT-123456"
                className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none transition-all text-black placeholder-black/30"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-black/70 mb-2">
                Emergency Reason * (minimum 10 characters)
              </label>
              <textarea
                value={breakGlassReason}
                onChange={(e) => setBreakGlassReason(e.target.value)}
                placeholder="Describe the clinical emergency requiring immediate access..."
                className="w-full px-4 py-3 bg-red-50 rounded-xl border border-red-200 focus:border-red-400 focus:outline-none transition-all text-black placeholder-black/30 resize-none h-24"
              />
              <div className="text-xs text-black/50 mt-1">
                {breakGlassReason.length}/10 characters minimum
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBreakGlass(false);
                  setBreakGlassReason('');
                  setError(null);
                }}
                className="flex-1 bg-black/5 text-black py-3 rounded-full font-medium hover:bg-black/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBreakGlass}
                disabled={!patientId.trim() || breakGlassReason.length < 10 || isCreatingEncounter}
                className="flex-1 bg-red-600 text-white py-3 rounded-full font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreatingEncounter ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Processing...
                  </>
                ) : (
                  '🚨 Confirm Break-Glass'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
