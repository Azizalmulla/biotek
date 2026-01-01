'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiseaseRisk {
  disease_id: string;
  name: string;
  risk_score: number;
  risk_percentage: number;
  risk_category: 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL';
  confidence: number;
  top_factors: Array<{
    feature: string;
    importance: number;
    value: number | null;
  }>;
}

interface PRSResult {
  category: string;
  category_name: string;
  percentile: number;
  risk_level: string;
  interpretation: string;
}

// Disease categories for grouping
const DISEASE_CATEGORIES = {
  metabolic: {
    name: 'Metabolic',
    icon: '🔥',
    diseases: ['type2_diabetes', 'nafld']
  },
  cardiovascular: {
    name: 'Cardiovascular',
    icon: '❤️',
    diseases: ['coronary_heart_disease', 'hypertension', 'stroke', 'heart_failure', 'atrial_fibrillation']
  },
  respiratory: {
    name: 'Respiratory',
    icon: '🫁',
    diseases: ['copd']
  },
  cancer: {
    name: 'Cancer',
    icon: '🎗️',
    diseases: ['breast_cancer', 'colorectal_cancer']
  },
  neurological: {
    name: 'Neurological',
    icon: '🧠',
    diseases: ['alzheimers_disease']
  },
  kidney: {
    name: 'Kidney',
    icon: '🫘',
    diseases: ['chronic_kidney_disease']
  }
};

// Risk category colors
const RISK_COLORS = {
  HIGH: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-500' },
  MODERATE: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-500' },
  LOW: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-500' },
  MINIMAL: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-500' }
};

// Demo data for display
const DEMO_PREDICTIONS: Record<string, DiseaseRisk> = {
  type2_diabetes: {
    disease_id: 'type2_diabetes',
    name: 'Type 2 Diabetes',
    risk_score: 0.35,
    risk_percentage: 35,
    risk_category: 'MODERATE',
    confidence: 0.87,
    top_factors: [
      { feature: 'hba1c', importance: 0.35, value: 6.2 },
      { feature: 'bmi', importance: 0.20, value: 28.5 },
      { feature: 'age', importance: 0.15, value: 55 }
    ]
  },
  coronary_heart_disease: {
    disease_id: 'coronary_heart_disease',
    name: 'Coronary Heart Disease',
    risk_score: 0.45,
    risk_percentage: 45,
    risk_category: 'MODERATE',
    confidence: 0.82,
    top_factors: [
      { feature: 'ldl', importance: 0.25, value: 145 },
      { feature: 'bp_systolic', importance: 0.20, value: 138 },
      { feature: 'smoking_pack_years', importance: 0.18, value: 10 }
    ]
  },
  hypertension: {
    disease_id: 'hypertension',
    name: 'Hypertension',
    risk_score: 0.72,
    risk_percentage: 72,
    risk_category: 'HIGH',
    confidence: 0.91,
    top_factors: [
      { feature: 'bp_systolic', importance: 0.35, value: 138 },
      { feature: 'bp_diastolic', importance: 0.25, value: 88 },
      { feature: 'bmi', importance: 0.15, value: 28.5 }
    ]
  },
  chronic_kidney_disease: {
    disease_id: 'chronic_kidney_disease',
    name: 'Chronic Kidney Disease',
    risk_score: 0.18,
    risk_percentage: 18,
    risk_category: 'LOW',
    confidence: 0.89,
    top_factors: [
      { feature: 'egfr', importance: 0.40, value: 85 },
      { feature: 'creatinine', importance: 0.25, value: 1.1 },
      { feature: 'age', importance: 0.12, value: 55 }
    ]
  },
  nafld: {
    disease_id: 'nafld',
    name: 'Fatty Liver Disease',
    risk_score: 0.28,
    risk_percentage: 28,
    risk_category: 'LOW',
    confidence: 0.84,
    top_factors: [
      { feature: 'alt', importance: 0.30, value: 35 },
      { feature: 'bmi', importance: 0.25, value: 28.5 },
      { feature: 'triglycerides', importance: 0.18, value: 165 }
    ]
  },
  stroke: {
    disease_id: 'stroke',
    name: 'Stroke',
    risk_score: 0.22,
    risk_percentage: 22,
    risk_category: 'LOW',
    confidence: 0.86,
    top_factors: [
      { feature: 'age', importance: 0.28, value: 55 },
      { feature: 'bp_systolic', importance: 0.22, value: 138 },
      { feature: 'smoking_pack_years', importance: 0.18, value: 10 }
    ]
  },
  heart_failure: {
    disease_id: 'heart_failure',
    name: 'Heart Failure',
    risk_score: 0.12,
    risk_percentage: 12,
    risk_category: 'MINIMAL',
    confidence: 0.88,
    top_factors: [
      { feature: 'bnp', importance: 0.35, value: 45 },
      { feature: 'age', importance: 0.22, value: 55 },
      { feature: 'bp_systolic', importance: 0.15, value: 138 }
    ]
  },
  atrial_fibrillation: {
    disease_id: 'atrial_fibrillation',
    name: 'Atrial Fibrillation',
    risk_score: 0.15,
    risk_percentage: 15,
    risk_category: 'MINIMAL',
    confidence: 0.85,
    top_factors: [
      { feature: 'age', importance: 0.32, value: 55 },
      { feature: 'bmi', importance: 0.18, value: 28.5 },
      { feature: 'bp_systolic', importance: 0.15, value: 138 }
    ]
  },
  copd: {
    disease_id: 'copd',
    name: 'COPD',
    risk_score: 0.25,
    risk_percentage: 25,
    risk_category: 'LOW',
    confidence: 0.90,
    top_factors: [
      { feature: 'smoking_pack_years', importance: 0.50, value: 10 },
      { feature: 'age', importance: 0.25, value: 55 },
      { feature: 'bmi', importance: 0.10, value: 28.5 }
    ]
  },
  breast_cancer: {
    disease_id: 'breast_cancer',
    name: 'Breast Cancer',
    risk_score: 0.08,
    risk_percentage: 8,
    risk_category: 'MINIMAL',
    confidence: 0.78,
    top_factors: [
      { feature: 'age', importance: 0.28, value: 55 },
      { feature: 'prs_cancer', importance: 0.35, value: 0.5 },
      { feature: 'family_history_score', importance: 0.20, value: 2 }
    ]
  },
  colorectal_cancer: {
    disease_id: 'colorectal_cancer',
    name: 'Colorectal Cancer',
    risk_score: 0.06,
    risk_percentage: 6,
    risk_category: 'MINIMAL',
    confidence: 0.80,
    top_factors: [
      { feature: 'age', importance: 0.30, value: 55 },
      { feature: 'prs_cancer', importance: 0.28, value: 0.5 },
      { feature: 'family_history_score', importance: 0.18, value: 2 }
    ]
  },
  alzheimers_disease: {
    disease_id: 'alzheimers_disease',
    name: "Alzheimer's Disease",
    risk_score: 0.10,
    risk_percentage: 10,
    risk_category: 'MINIMAL',
    confidence: 0.75,
    top_factors: [
      { feature: 'age', importance: 0.42, value: 55 },
      { feature: 'prs_neurological', importance: 0.32, value: 0.3 },
      { feature: 'family_history_score', importance: 0.12, value: 2 }
    ]
  }
};

const DEMO_PRS: Record<string, PRSResult> = {
  metabolic: {
    category: 'metabolic',
    category_name: 'Metabolic Disease Panel',
    percentile: 65,
    risk_level: 'AVERAGE',
    interpretation: 'Population-average genetic risk. Standard prevention applies.'
  },
  cardiovascular: {
    category: 'cardiovascular',
    category_name: 'Cardiovascular Panel',
    percentile: 78,
    risk_level: 'ELEVATED',
    interpretation: 'Above average genetic risk. Enhanced screening recommended.'
  },
  cancer: {
    category: 'cancer',
    category_name: 'Cancer Susceptibility Panel',
    percentile: 42,
    risk_level: 'AVERAGE',
    interpretation: 'Population-average genetic risk. Standard prevention applies.'
  },
  neurological: {
    category: 'neurological',
    category_name: 'Neurological Panel',
    percentile: 35,
    risk_level: 'LOW',
    interpretation: 'Below average genetic risk. Lifestyle factors more important.'
  },
  autoimmune: {
    category: 'autoimmune',
    category_name: 'Autoimmune Panel',
    percentile: 55,
    risk_level: 'AVERAGE',
    interpretation: 'Population-average genetic risk. Standard prevention applies.'
  }
};

export default function MultiDiseaseDashboard() {
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'diseases' | 'genetics'>('diseases');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const predictions = DEMO_PREDICTIONS;
  const prsResults = DEMO_PRS;

  // Sort diseases by risk
  const sortedDiseases = Object.values(predictions).sort(
    (a, b) => b.risk_percentage - a.risk_percentage
  );

  const highRiskCount = sortedDiseases.filter(d => d.risk_category === 'HIGH').length;
  const moderateRiskCount = sortedDiseases.filter(d => d.risk_category === 'MODERATE').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f4ef] to-[#f3e7d9] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Multi-Disease Risk Assessment</h1>
          <p className="text-black/60">
            Comprehensive analysis of 13 chronic diseases using 55 clinical biomarkers and genetic risk scores
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm"
          >
            <div className="text-3xl font-bold text-black">12</div>
            <div className="text-sm text-black/60">Diseases Analyzed</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm"
          >
            <div className="text-3xl font-bold text-red-600">{highRiskCount}</div>
            <div className="text-sm text-black/60">High Risk</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm"
          >
            <div className="text-3xl font-bold text-amber-600">{moderateRiskCount}</div>
            <div className="text-sm text-black/60">Moderate Risk</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm"
          >
            <div className="text-3xl font-bold text-green-600">5</div>
            <div className="text-sm text-black/60">Genetic Panels</div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('diseases')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'diseases'
                ? 'bg-black text-white'
                : 'bg-white text-black/60 hover:bg-black/5'
            }`}
          >
            Disease Risks
          </button>
          <button
            onClick={() => setActiveTab('genetics')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'genetics'
                ? 'bg-black text-white'
                : 'bg-white text-black/60 hover:bg-black/5'
            }`}
          >
            Genetic Insights
          </button>
        </div>

        {/* Disease Risks Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'diseases' && (
            <motion.div
              key="diseases"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Disease Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedDiseases.map((disease, index) => {
                  const colors = RISK_COLORS[disease.risk_category];
                  
                  return (
                    <motion.div
                      key={disease.disease_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedDisease(
                        selectedDisease === disease.disease_id ? null : disease.disease_id
                      )}
                      className={`${colors.bg} ${colors.border} border rounded-2xl p-6 cursor-pointer 
                        transition-all hover:shadow-lg ${
                          selectedDisease === disease.disease_id ? 'ring-2 ring-black' : ''
                        }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-black">{disease.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full text-white ${colors.badge}`}>
                            {disease.risk_category}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-black">
                            {disease.risk_percentage.toFixed(0)}%
                          </div>
                          <div className="text-xs text-black/50">
                            {(disease.confidence * 100).toFixed(0)}% confidence
                          </div>
                        </div>
                      </div>

                      {/* Risk Bar */}
                      <div className="w-full bg-black/10 rounded-full h-2 mb-4">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${disease.risk_percentage}%` }}
                          transition={{ duration: 0.8, delay: index * 0.05 }}
                          className={`h-2 rounded-full ${colors.badge}`}
                        />
                      </div>

                      {/* Top Factors */}
                      <AnimatePresence>
                        {selectedDisease === disease.disease_id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-black/10"
                          >
                            <div className="text-sm font-medium text-black/70 mb-2">
                              Top Risk Factors:
                            </div>
                            {disease.top_factors.map((factor, i) => (
                              <div key={factor.feature} className="flex justify-between text-sm mb-1">
                                <span className="text-black/60">{factor.feature}</span>
                                <span className="font-mono text-black">
                                  {factor.value?.toFixed(1) ?? 'N/A'}
                                </span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Genetics Tab */}
          {activeTab === 'genetics' && (
            <motion.div
              key="genetics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(prsResults).map((prs, index) => {
                  const riskColors = {
                    HIGH: 'from-red-500 to-red-600',
                    ELEVATED: 'from-amber-500 to-amber-600',
                    AVERAGE: 'from-blue-500 to-blue-600',
                    LOW: 'from-green-500 to-green-600'
                  };
                  
                  return (
                    <motion.div
                      key={prs.category}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-black">{prs.category_name}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full text-white bg-gradient-to-r ${
                            riskColors[prs.risk_level as keyof typeof riskColors] || riskColors.AVERAGE
                          }`}>
                            {prs.risk_level}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-black">
                            {prs.percentile}
                          </div>
                          <div className="text-xs text-black/50">percentile</div>
                        </div>
                      </div>

                      {/* Percentile Bar */}
                      <div className="relative w-full h-3 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-full mb-4">
                        <motion.div
                          initial={{ left: '0%' }}
                          animate={{ left: `${prs.percentile}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full border-2 border-white shadow-lg"
                        />
                      </div>

                      <p className="text-sm text-black/60">{prs.interpretation}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Ancestry Warning */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-6"
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h4 className="font-bold text-amber-800 mb-1">Ancestry Consideration</h4>
                    <p className="text-sm text-amber-700">
                      Polygenic risk scores were primarily developed using European ancestry populations. 
                      Predictive accuracy may be reduced for individuals of other ancestries. 
                      Results should be interpreted with appropriate clinical context.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Privacy Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-black/5 rounded-2xl p-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-green-600">🔒</span>
            </div>
            <div>
              <div className="font-medium text-black">Privacy Protected</div>
              <div className="text-sm text-black/60">
                Federated Learning + Differential Privacy (ε=3.0) • No data sent to cloud
              </div>
            </div>
          </div>
          <div className="text-xs text-black/40">
            BioTeK v3.0 • 13 Diseases • 55 Features • 5 PRS Panels
          </div>
        </motion.div>
      </div>
    </div>
  );
}
