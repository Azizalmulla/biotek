'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface PredictionFormProps {
  onPredict: (data: any) => void;
  loading: boolean;
  useGenetics: boolean;
}

export default function PredictionForm({ onPredict, loading, useGenetics }: PredictionFormProps) {
  const [formData, setFormData] = useState({
    age: 55,
    bmi: 27.5,
    hba1c: 5.7,
    ldl: 120,
    smoking: 0,
    prs: 0.0,
    sex: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPredict({
      ...formData,
      use_genetics: useGenetics,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'smoking' || field === 'sex' ? parseInt(value) : parseFloat(value)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Age */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Age (years) *
          </label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => handleChange('age', e.target.value)}
            min="18"
            max="100"
            step="1"
            required
            className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-black/20"
          />
          <p className="text-xs text-black/50 mt-1">Patient age in years</p>
        </div>

        {/* BMI */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            BMI (kg/m²) *
          </label>
          <input
            type="number"
            value={formData.bmi}
            onChange={(e) => handleChange('bmi', e.target.value)}
            min="15"
            max="50"
            step="0.1"
            required
            className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-black/20"
          />
          <p className="text-xs text-black/50 mt-1">Body Mass Index</p>
        </div>

        {/* HbA1c */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            HbA1c (%) *
          </label>
          <input
            type="number"
            value={formData.hba1c}
            onChange={(e) => handleChange('hba1c', e.target.value)}
            min="4.0"
            max="15.0"
            step="0.1"
            required
            className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-black/20"
          />
          <p className="text-xs text-black/50 mt-1">Glycated hemoglobin</p>
        </div>

        {/* LDL */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            LDL (mg/dL) *
          </label>
          <input
            type="number"
            value={formData.ldl}
            onChange={(e) => handleChange('ldl', e.target.value)}
            min="0"
            max="300"
            step="1"
            required
            className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-black/20"
          />
          <p className="text-xs text-black/50 mt-1">Low-density lipoprotein cholesterol</p>
        </div>

        {/* Smoking */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Smoking Status *
          </label>
          <select
            value={formData.smoking}
            onChange={(e) => handleChange('smoking', e.target.value)}
            className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-black/20"
          >
            <option value="0">Non-smoker</option>
            <option value="1">Smoker</option>
          </select>
        </div>

        {/* Sex */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Biological Sex *
          </label>
          <select
            value={formData.sex}
            onChange={(e) => handleChange('sex', e.target.value)}
            className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-black/20"
          >
            <option value="0">Female</option>
            <option value="1">Male</option>
          </select>
        </div>

        {/* PRS - Only if genetics enabled */}
        {useGenetics && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-black mb-2">
              Polygenic Risk Score (PRS)
              <span className="ml-2 text-xs text-black/50">(Optional - Genetic Data)</span>
            </label>
            <input
              type="number"
              value={formData.prs}
              onChange={(e) => handleChange('prs', e.target.value)}
              min="-3"
              max="3"
              step="0.1"
              className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-black/20"
            />
            <p className="text-xs text-black/50 mt-1">
              Standardized genetic risk score (-3 to +3). Leave at 0 if unknown.
            </p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-4 rounded-full font-medium transition-all ${
          loading
            ? 'bg-black/20 text-black/40 cursor-not-allowed'
            : 'bg-black text-white hover:bg-black/90'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            Analyzing...
          </span>
        ) : (
          'Generate Risk Prediction'
        )}
      </button>
    </form>
  );
}
