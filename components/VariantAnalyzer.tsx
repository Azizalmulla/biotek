'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'https://biotek-production.up.railway.app';

interface VariantResult {
  variant: string;
  gene: string;
  classification: 'PATHOGENIC' | 'LIKELY_PATHOGENIC' | 'VUS' | 'LIKELY_BENIGN' | 'BENIGN';
  confidence: number;
  evo2_score: number;
  clinical_significance: string;
  associated_conditions: string[];
  population_frequency: string;
  recommendations: string[];
  pharmacogenomics?: {
    drug: string;
    impact: string;
    recommendation: string;
  }[];
  references: string[];
}

const COMMON_GENES = [
  { id: 'BRCA1', name: 'BRCA1', description: 'Breast/Ovarian Cancer', icon: '🎀' },
  { id: 'BRCA2', name: 'BRCA2', description: 'Breast/Ovarian Cancer', icon: '🎀' },
  { id: 'TP53', name: 'TP53', description: 'Li-Fraumeni Syndrome', icon: '🛡️' },
  { id: 'MLH1', name: 'MLH1', description: 'Lynch Syndrome', icon: '🧬' },
  { id: 'APOE', name: 'APOE', description: "Alzheimer's Risk", icon: '🧠' },
  { id: 'CYP2D6', name: 'CYP2D6', description: 'Drug Metabolism', icon: '💊' },
  { id: 'CYP2C19', name: 'CYP2C19', description: 'Drug Metabolism', icon: '💊' },
  { id: 'F5', name: 'Factor V', description: 'Thrombophilia', icon: '🩸' },
];

const EXAMPLE_VARIANTS = [
  {
    name: 'BRCA1 Pathogenic',
    variant: 'BRCA1 c.5266dupC',
    gene: 'BRCA1',
    description: 'Common Ashkenazi Jewish founder mutation'
  },
  {
    name: 'APOE ε4/ε4',
    variant: 'APOE ε4/ε4 homozygous',
    gene: 'APOE',
    description: 'Increased Alzheimer\'s risk'
  },
  {
    name: 'CYP2D6 Poor Metabolizer',
    variant: 'CYP2D6 *4/*4',
    gene: 'CYP2D6',
    description: 'Cannot metabolize codeine, tamoxifen'
  },
  {
    name: 'Factor V Leiden',
    variant: 'F5 c.1601G>A (R506Q)',
    gene: 'F5',
    description: 'Increased blood clot risk'
  },
];

interface VariantAnalyzerProps {
  patientId?: string | null;
  encounterId?: string | null;
  userId?: string;
  userRole?: string;
  onResultSaved?: (result: VariantResult) => void;
}

export default function VariantAnalyzer({ patientId, encounterId, userId, userRole, onResultSaved }: VariantAnalyzerProps) {
  const [variantInput, setVariantInput] = useState('');
  const [selectedGene, setSelectedGene] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VariantResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Save result to patient record
  const saveToPatientRecord = async (variantData: VariantResult) => {
    if (!patientId) return;
    try {
      await fetch(`${API_BASE}/patient/${patientId}/variant-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variantData)
      });
      onResultSaved?.(variantData);
    } catch (err) {
      console.error('Failed to save variant result:', err);
    }
  };

  const handleExampleSelect = (example: typeof EXAMPLE_VARIANTS[0]) => {
    setVariantInput(example.variant);
    setSelectedGene(example.gene);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!variantInput.trim()) {
      setError('Please enter a genetic variant');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/ai/analyze-variant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant: variantInput,
          gene: selectedGene
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      // Auto-save to patient record if patient ID is provided
      if (patientId) {
        saveToPatientRecord(data);
      }
    } catch (err: any) {
      console.error('Variant analysis failed:', err);
      setError(err.message || 'Failed to analyze variant. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'PATHOGENIC': return 'bg-red-100 text-red-800 border-red-300';
      case 'LIKELY_PATHOGENIC': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'VUS': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'LIKELY_BENIGN': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'BENIGN': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'PATHOGENIC': return '🔴';
      case 'LIKELY_PATHOGENIC': return '🟠';
      case 'VUS': return '🟡';
      case 'LIKELY_BENIGN': return '🔵';
      case 'BENIGN': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-black/10">
      {/* Clinical Disclaimer Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-xl">ℹ️</span>
          <div>
            <p className="text-sm font-medium text-blue-900">Clinical Decision Support</p>
            <p className="text-xs text-blue-700 mt-1">
              Genetic insights are shown for clinical context. They do <strong>not</strong> change the final disease risk scores. 
              Results should be interpreted by a qualified healthcare provider.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
            <span className="text-2xl">🧬</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">Genetic Variant Pathogenicity Analyzer</h2>
            <p className="text-sm text-black/60">ACMG/AMP Classification • Clinical Decision Support</p>
          </div>
        </div>
        <div className="text-right text-xs text-black/40">
          <div>Hospital-Grade</div>
          <div className="font-bold text-black/60">Genetic Report</div>
        </div>
      </div>

      {/* Quick Examples */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-black/70 mb-3">Quick Examples</h3>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_VARIANTS.map((example) => (
            <button
              key={example.name}
              onClick={() => handleExampleSelect(example)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                variantInput === example.variant
                  ? 'bg-indigo-600 text-white'
                  : 'bg-black/5 text-black/70 hover:bg-black/10'
              }`}
            >
              {example.name}
            </button>
          ))}
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-black/70 mb-2">
            Enter Genetic Variant
          </label>
          <input
            type="text"
            value={variantInput}
            onChange={(e) => setVariantInput(e.target.value)}
            placeholder="e.g., BRCA1 c.5266dupC or CYP2D6 *4/*4"
            className="w-full px-4 py-3 bg-white border border-black/10 rounded-xl text-black placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-black/50 mt-1">
            Enter HGVS notation, rsID, or gene + variant description
          </p>
        </div>

        {/* Gene Selection */}
        <div>
          <label className="block text-sm font-medium text-black/70 mb-2">
            Select Gene (Optional)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {COMMON_GENES.map((gene) => (
              <button
                key={gene.id}
                onClick={() => setSelectedGene(selectedGene === gene.id ? null : gene.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedGene === gene.id
                    ? 'bg-indigo-50 border-indigo-300'
                    : 'bg-white border-black/10 hover:border-black/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{gene.icon}</span>
                  <span className="font-medium text-sm">{gene.name}</span>
                </div>
                <p className="text-xs text-black/50 mt-1">{gene.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing || !variantInput.trim()}
        className={`w-full py-4 rounded-2xl font-medium text-white transition-all flex items-center justify-center gap-2 ${
          isAnalyzing || !variantInput.trim()
            ? 'bg-black/30 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg'
        }`}
      >
        {isAnalyzing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Analyzing with Evo 2...</span>
          </>
        ) : (
          <>
            <span>🧬</span>
            <span>Analyze Variant</span>
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 space-y-6"
          >
            {/* Classification Banner */}
            <div className={`rounded-2xl p-6 border-2 ${getClassificationColor(result.classification)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{getClassificationIcon(result.classification)}</span>
                  <div>
                    <h3 className="text-2xl font-bold">{result.classification.replace('_', ' ')}</h3>
                    <p className="text-sm opacity-80">{result.variant} in {result.gene}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{(result.confidence * 100).toFixed(0)}%</div>
                  <div className="text-sm opacity-70">Confidence</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-current opacity-30">
                <div className="flex items-center gap-2 opacity-100">
                  <span className="text-sm font-medium">Evo 2 Score:</span>
                  <span className="font-mono">{result.evo2_score.toFixed(2)}</span>
                  <span className="text-xs opacity-70">(lower = more pathogenic)</span>
                </div>
              </div>
            </div>

            {/* Clinical Significance */}
            <div className="bg-white rounded-2xl p-6 border border-black/10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📋</span>
                <h4 className="font-bold text-black">Clinical Significance</h4>
              </div>
              <p className="text-black/80 leading-relaxed">{result.clinical_significance}</p>
            </div>

            {/* Associated Conditions */}
            {result.associated_conditions && result.associated_conditions.length > 0 && (
              <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">⚠️</span>
                  <h4 className="font-bold text-red-900">Associated Conditions</h4>
                </div>
                <ul className="space-y-2">
                  {result.associated_conditions.map((condition, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-red-800">
                      <span className="text-red-500">•</span>
                      <span>{condition}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pharmacogenomics */}
            {result.pharmacogenomics && result.pharmacogenomics.length > 0 && (
              <div className="bg-purple-50 rounded-2xl p-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">💊</span>
                  <h4 className="font-bold text-purple-900">Pharmacogenomics Impact</h4>
                </div>
                <div className="space-y-3">
                  {result.pharmacogenomics.map((pharma, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4 border border-purple-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-purple-900">{pharma.drug}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          pharma.impact === 'EFFECTIVE' ? 'bg-green-100 text-green-700' :
                          pharma.impact === 'REDUCED' ? 'bg-amber-100 text-amber-700' :
                          pharma.impact === 'INEFFECTIVE' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {pharma.impact}
                        </span>
                      </div>
                      <p className="text-sm text-purple-800">{pharma.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">✅</span>
                <h4 className="font-bold text-blue-900">Recommended Actions</h4>
              </div>
              <ul className="space-y-2">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-blue-800">
                    <span className="text-blue-500 mt-1">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Population Frequency */}
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📊</span>
                <h4 className="font-bold text-black">Population Frequency</h4>
              </div>
              <p className="text-black/70">{result.population_frequency}</p>
            </div>

            {/* References */}
            {result.references && result.references.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-black/10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">📚</span>
                  <h4 className="font-bold text-black">References</h4>
                </div>
                <ul className="space-y-1 text-sm text-black/60">
                  {result.references.map((ref, idx) => (
                    <li key={idx}>• {ref}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-black/40 pt-4">
              <p>Analysis powered by Evo 2 (40B parameters) • Trained on 9 trillion nucleotides</p>
              <p className="mt-1">For research and clinical decision support only. Confirm findings with certified genetic testing.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
