'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Purpose {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredFor: string[];
}

const purposes: Purpose[] = [
  {
    id: 'treatment',
    name: 'Treatment',
    description: 'Direct patient care and medical diagnosis',
    icon: '💊',
    requiredFor: ['clinical', 'genetic', 'predictions']
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Medical research and studies (anonymized data only)',
    icon: '🔬',
    requiredFor: ['anonymized_clinical']
  },
  {
    id: 'quality_improvement',
    name: 'Quality Improvement',
    description: 'System performance analysis and quality metrics',
    icon: '📈',
    requiredFor: ['model_info', 'audit_logs']
  },
  {
    id: 'registration',
    name: 'Registration',
    description: 'Patient check-in and registration',
    icon: '📋',
    requiredFor: ['demographics']
  },
  {
    id: 'billing',
    name: 'Billing',
    description: 'Financial and billing purposes',
    icon: '💳',
    requiredFor: ['demographics']
  },
  {
    id: 'emergency',
    name: 'Emergency',
    description: 'Critical emergency medical situations',
    icon: '🚨',
    requiredFor: ['clinical', 'genetic']
  }
];

interface PurposeSelectorProps {
  allowedPurposes: string[];
  onSelect: (purpose: string) => void;
  onCancel: () => void;
  dataType?: string;
}

export default function PurposeSelector({ 
  allowedPurposes, 
  onSelect, 
  onCancel,
  dataType 
}: PurposeSelectorProps) {
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);

  const filteredPurposes = purposes.filter(p => 
    allowedPurposes.includes(p.id) &&
    (!dataType || p.requiredFor.includes(dataType))
  );

  const handleConfirm = () => {
    if (selectedPurpose) {
      onSelect(selectedPurpose);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/95 backdrop-blur-md rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black mb-2">
                Declare Access Purpose
              </h2>
              <p className="text-black/60">
                Select the purpose for accessing this data
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-black/40 hover:text-black transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Hippocratic Database Notice */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Purpose-Limited Access</h3>
                <p className="text-sm text-blue-700">
                  Following the Hippocratic Database model, you must declare a valid purpose 
                  for accessing patient data. This ensures ethical and compliant data usage.
                </p>
              </div>
            </div>
          </div>

          {/* Purpose Selection */}
          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
            {filteredPurposes.length === 0 ? (
              <div className="text-center py-8 text-black/40">
                <p>No valid purposes available for this data type and your role.</p>
              </div>
            ) : (
              filteredPurposes.map((purpose) => (
                <button
                  key={purpose.id}
                  onClick={() => setSelectedPurpose(purpose.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPurpose === purpose.id
                      ? 'border-black bg-black/5'
                      : 'border-black/10 hover:border-black/20 hover:bg-black/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{purpose.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-black">{purpose.name}</h3>
                      <p className="text-sm text-black/60">{purpose.description}</p>
                    </div>
                    {selectedPurpose === purpose.id && (
                      <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-black/5 text-black py-3 rounded-full font-medium hover:bg-black/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPurpose}
              className="flex-1 bg-black text-white py-3 rounded-full font-medium hover:bg-black/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Purpose
            </button>
          </div>

          {/* Legal Notice */}
          <p className="mt-4 text-xs text-black/40 text-center">
            All data access is logged and auditable. Misuse may result in access revocation.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
