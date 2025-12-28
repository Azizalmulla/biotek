'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface PatientSelectorProps {
  onSelect: (patientId: string) => void;
  currentPatientId?: string;
}

export default function PatientSelector({ onSelect, currentPatientId }: PatientSelectorProps) {
  const [patientId, setPatientId] = useState(currentPatientId || '');
  const [showDialog, setShowDialog] = useState(false);

  const handleSubmit = () => {
    if (patientId.trim()) {
      onSelect(patientId.trim());
      setShowDialog(false);
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
            ℹ️ All actions will be associated with this patient and logged in the audit trail
          </div>
        )}
      </div>

      {/* Patient Selection Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-black mb-4">Select Patient</h3>
            <p className="text-black/60 text-sm mb-6">
              Enter the patient ID you are treating. This ensures proper data isolation and audit trails.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-black/70 mb-2">
                Patient ID
              </label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g., PAT-123456"
                className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none transition-all text-black placeholder-black/30"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit();
                  }
                }}
              />
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600">⚠️</span>
                <div className="text-xs text-yellow-800">
                  <strong>Multi-tenant Data Isolation:</strong> You can only access data for the patient you declare. 
                  All access is logged with patient context for HIPAA compliance.
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDialog(false);
                  setPatientId(currentPatientId || '');
                }}
                className="flex-1 bg-black/5 text-black py-3 rounded-full font-medium hover:bg-black/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!patientId.trim()}
                className="flex-1 bg-black text-white py-3 rounded-full font-medium hover:bg-black/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
