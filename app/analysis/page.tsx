'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import DNAAnalysis from '@/components/DNAAnalysis';
import MedicalImagingUpload from '@/components/MedicalImagingUpload';

type TabType = 'dna' | 'imaging' | 'combined';

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dna');

  const tabs = [
    { id: 'dna' as TabType, name: 'DNA Analysis', icon: '🧬', model: 'Evo 2' },
    { id: 'imaging' as TabType, name: 'Medical Imaging', icon: '👁️', model: 'GLM-4.5V' },
    { id: 'combined' as TabType, name: 'Combined Analysis', icon: '🔬', model: 'All Models' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/" className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                BioTeK
              </a>
              <span className="text-gray-500">/</span>
              <span className="text-gray-300">Advanced Analysis</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Cloud Models Connected
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-900 to-black py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            <span className="bg-gradient-to-r from-green-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              AI-Powered Analysis
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg max-w-2xl mx-auto"
          >
            Leverage cutting-edge foundation models for DNA sequence analysis and medical imaging interpretation
          </motion.p>

          {/* Model Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-2 gap-4 mt-8 max-w-3xl mx-auto"
          >
            <div className="p-4 bg-gradient-to-br from-green-900/30 to-cyan-900/30 rounded-xl border border-green-500/20">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🧬</span>
                <div className="text-left">
                  <h3 className="font-semibold text-white">Evo 2</h3>
                  <p className="text-xs text-gray-400">Arc Institute • NVIDIA NIM</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 text-left">
                40B parameter DNA foundation model trained on 9T+ nucleotides
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500/20">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">👁️</span>
                <div className="text-left">
                  <h3 className="font-semibold text-white">GLM-4.5V</h3>
                  <p className="text-xs text-gray-400">ZhipuAI • OpenRouter</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 text-left">
                106B vision-language model with medical imaging capabilities
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 p-1 bg-gray-900 rounded-xl w-fit mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden md:inline">{tab.name}</span>
              <span className="text-xs opacity-60">({tab.model})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'dna' && <DNAAnalysis />}
          {activeTab === 'imaging' && <MedicalImagingUpload />}
          {activeTab === 'combined' && (
            <div className="space-y-6">
              {/* Combined Analysis Intro */}
              <div className="p-6 bg-gradient-to-r from-green-900/20 via-cyan-900/20 to-purple-900/20 rounded-2xl border border-gray-800">
                <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  <span>🔬</span> Combined Multi-Modal Analysis
                </h2>
                <p className="text-gray-400">
                  Upload both DNA sequence data and medical images for comprehensive analysis. 
                  The system will correlate genetic risk factors with imaging findings.
                </p>
              </div>

              {/* Both Components */}
              <div className="grid gap-6">
                <DNAAnalysis />
                <MedicalImagingUpload />
              </div>

              {/* Integration Note */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <h3 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <span>💡</span> How Combined Analysis Works
                </h3>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>• DNA analysis identifies genetic predispositions and variant effects</li>
                  <li>• Medical imaging detects current anatomical abnormalities</li>
                  <li>• Combined risk score correlates genetic risk with imaging findings</li>
                  <li>• Clinical report integrates all data sources for comprehensive assessment</li>
                </ul>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>
            ⚕️ AI-assisted analysis for research and clinical decision support only. 
            Not intended as medical diagnosis.
          </p>
          <p className="mt-2">
            Powered by Evo 2 (Arc Institute) • GLM-4.5V (ZhipuAI) • BioTeK Platform
          </p>
        </div>
      </div>
    </div>
  );
}
