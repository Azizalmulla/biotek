'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'https://biotek-production.up.railway.app';

interface ImageAnalysis {
  image: string;
  type: string;
  body_region: string;
  status: string;
  analysis: string;
  reasoning_used?: boolean;
}

interface AnalysisResult {
  success: boolean;
  data: {
    status: string;
    images_analyzed: number;
    findings: ImageAnalysis[];
    abnormalities_detected: Array<{ image: string; finding: string }>;
    recommendations: string[];
    summary: {
      total_images: number;
      successfully_analyzed: number;
      abnormalities_found: number;
      model: string;
      disclaimer: string;
    };
  };
}

const IMAGE_TYPES = [
  { id: 'xray', name: 'X-Ray', icon: '🩻' },
  { id: 'ct', name: 'CT Scan', icon: '🔬' },
  { id: 'mri', name: 'MRI', icon: '🧲' },
  { id: 'ultrasound', name: 'Ultrasound', icon: '📡' },
  { id: 'pathology', name: 'Pathology', icon: '🔍' },
];

const BODY_REGIONS = [
  { id: 'chest', name: 'Chest' },
  { id: 'abdomen', name: 'Abdomen' },
  { id: 'brain', name: 'Brain' },
  { id: 'spine', name: 'Spine' },
  { id: 'extremity', name: 'Extremity' },
  { id: 'cardiac', name: 'Cardiac' },
];

export default function MedicalImagingUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageType, setImageType] = useState('xray');
  const [bodyRegion, setBodyRegion] = useState('chest');
  const [clinicalContext, setClinicalContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('image_type', imageType);
      formData.append('clinical_question', clinicalContext || '');
      formData.append('use_reasoning', 'true');

      const response = await fetch(`${API_BASE}/cloud/vision/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-black/10 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
        <div className="flex items-center gap-3">
          <span className="text-3xl">👁️</span>
          <div>
            <h2 className="text-xl font-bold text-black">Medical Image Analysis</h2>
            <p className="text-sm text-black/60">AI-powered diagnostic imaging support</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            preview
              ? 'border-purple-300 bg-purple-50/50'
              : 'border-black/20 hover:border-black/40 bg-black/5'
          }`}
        >
          {preview ? (
            <div className="space-y-4">
              <img
                src={preview}
                alt="Medical image preview"
                className="max-h-64 mx-auto rounded-xl shadow-lg"
              />
              <button
                onClick={clearImage}
                className="text-sm text-black/50 hover:text-red-500 transition-colors"
              >
                Remove image
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-black/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-black/70 mb-1">Drop medical image here or click to upload</p>
                <p className="text-sm text-black/50">Supports X-Ray, CT, MRI, Ultrasound images</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Image Type Selection */}
        <div>
          <label className="block text-sm font-medium text-black/80 mb-2">Image Type</label>
          <div className="flex flex-wrap gap-2">
            {IMAGE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setImageType(type.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  imageType === type.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                    : 'bg-black/5 text-black/60 hover:bg-black/10'
                }`}
              >
                <span>{type.icon}</span>
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Body Region Selection */}
        <div>
          <label className="block text-sm font-medium text-black/80 mb-2">Body Region</label>
          <div className="flex flex-wrap gap-2">
            {BODY_REGIONS.map((region) => (
              <button
                key={region.id}
                onClick={() => setBodyRegion(region.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  bodyRegion === region.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-black/5 text-black/60 hover:bg-black/10'
                }`}
              >
                {region.name}
              </button>
            ))}
          </div>
        </div>

        {/* Clinical Context */}
        <div>
          <label className="block text-sm font-medium text-black/80 mb-2">
            Clinical Context (Optional)
          </label>
          <textarea
            value={clinicalContext}
            onChange={(e) => setClinicalContext(e.target.value)}
            placeholder="E.g., Patient presents with persistent cough for 2 weeks..."
            className="w-full px-4 py-3 bg-black/5 border border-black/10 rounded-xl text-black placeholder-black/30 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
            rows={3}
          />
        </div>

        {/* Analyze Button */}
        <motion.button
          onClick={handleAnalyze}
          disabled={!selectedFile || isAnalyzing}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-4 rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-3 ${
            selectedFile && !isAnalyzing
              ? 'bg-black text-white hover:bg-black/90'
              : 'bg-black/20 text-black/40 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <span>👁️</span>
              Analyze Medical Image
            </>
          )}
        </motion.button>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600"
            >
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Display */}
        <AnimatePresence>
          {result && result.success && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              {/* Summary */}
              <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl border border-green-200">
                <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                  <span>✅</span> Analysis Complete
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white/80 rounded-xl p-4">
                    <div className="text-2xl font-bold text-black">
                      {result.data.summary?.successfully_analyzed || 0}
                    </div>
                    <div className="text-sm text-black/50">Images Analyzed</div>
                  </div>
                  <div className="bg-white/80 rounded-xl p-4">
                    <div className={`text-2xl font-bold ${
                      (result.data.summary?.abnormalities_found || 0) > 0 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {result.data.summary?.abnormalities_found || 0}
                    </div>
                    <div className="text-sm text-black/50">Abnormalities</div>
                  </div>
                  <div className="bg-white/80 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-600">✓</div>
                    <div className="text-sm text-black/50">Complete</div>
                  </div>
                </div>
              </div>

              {/* Findings */}
              {result.data.findings?.map((finding, index) => (
                <div key={index} className="p-6 bg-white/60 rounded-2xl border border-black/10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">
                      {finding.type === 'xray' ? '🩻' : 
                       finding.type === 'ct' ? '🔬' : 
                       finding.type === 'mri' ? '🧲' : '📷'}
                    </span>
                    <h4 className="font-bold text-black">
                      {finding.type?.toUpperCase()} - {finding.body_region}
                    </h4>
                    {finding.reasoning_used && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                        Deep Reasoning
                      </span>
                    )}
                  </div>
                  <div className="text-black/70 whitespace-pre-wrap text-sm leading-relaxed">
                    {finding.analysis}
                  </div>
                </div>
              ))}

              {/* Abnormalities Alert */}
              {result.data.abnormalities_detected?.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <h4 className="font-bold text-amber-700 mb-2 flex items-center gap-2">
                    <span>⚠️</span> Potential Abnormalities Detected
                  </h4>
                  <ul className="space-y-1">
                    {result.data.abnormalities_detected.map((abn, i) => (
                      <li key={i} className="text-amber-700 text-sm">• {abn.finding}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {result.data.recommendations?.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <h4 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                    <span>💡</span> Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {result.data.recommendations.map((rec, i) => (
                      <li key={i} className="text-blue-700 text-sm">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div className="p-3 bg-black/5 rounded-xl text-center">
                <p className="text-xs text-black/50">
                  ⚕️ For clinical decision support only. Not a diagnosis.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
