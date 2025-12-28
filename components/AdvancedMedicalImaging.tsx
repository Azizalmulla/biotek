'use client';

import { useState, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://biotek-production.up.railway.app';
import { motion, AnimatePresence } from 'framer-motion';

type AnalysisMode = 'standard' | 'localize' | 'deep-diagnosis' | 'compare' | 'video' | 'document';

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  raw: number[];
}

interface AnalysisResult {
  success: boolean;
  data: {
    analysis?: string;
    reasoning_analysis?: string;
    bounding_boxes?: BoundingBox[];
    findings_count?: number;
    comparison_type?: string;
    images_compared?: number;
    video_type?: string;
    frames_analyzed?: number;
    document_type?: string;
    structured_data?: any;
    feature?: string;
    model?: string;
    timestamp?: string;
  };
}

const ANALYSIS_MODES = [
  { id: 'standard', label: 'Standard Analysis', icon: '🔍', desc: 'Basic image analysis' },
  { id: 'localize', label: 'Localize Findings', icon: '🎯', desc: 'Highlight abnormalities with bounding boxes' },
  { id: 'deep-diagnosis', label: 'Deep Diagnosis', icon: '🧠', desc: 'Chain-of-thought reasoning' },
  { id: 'compare', label: 'Compare Images', icon: '📊', desc: 'Before/after progression' },
  { id: 'video', label: 'Video Analysis', icon: '🎬', desc: 'Ultrasound/Echo frames' },
  { id: 'document', label: 'Parse Document', icon: '📄', desc: 'Extract from lab reports' },
];

const IMAGE_TYPES = ['xray', 'ct', 'mri', 'ultrasound', 'pathology'];
const VIDEO_TYPES = ['ultrasound', 'echocardiogram', 'fluoroscopy'];
const DOCUMENT_TYPES = ['lab_report', 'prescription', 'ehr', 'pathology', 'radiology_report'];

export default function AdvancedMedicalImaging() {
  const [mode, setMode] = useState<AnalysisMode>('standard');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [imageType, setImageType] = useState('xray');
  const [videoType, setVideoType] = useState('ultrasound');
  const [documentType, setDocumentType] = useState('lab_report');
  const [patientContext, setPatientContext] = useState('');
  const [targetFindings, setTargetFindings] = useState('');
  const [clinicalContext, setClinicalContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Limit files based on mode
    const maxFiles = mode === 'compare' ? 4 : mode === 'video' ? 8 : 1;
    const filesToUse = selectedFiles.slice(0, maxFiles);
    
    setFiles(filesToUse);
    
    // Generate previews
    const newPreviews: string[] = [];
    filesToUse.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === filesToUse.length) {
          setPreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();

    try {
      let endpoint = '';
      
      switch (mode) {
        case 'standard':
          endpoint = '/cloud/vision/analyze';
          formData.append('file', files[0]);
          formData.append('image_type', imageType);
          break;
          
        case 'localize':
          endpoint = '/cloud/vision/localize';
          formData.append('file', files[0]);
          formData.append('image_type', imageType);
          if (targetFindings) formData.append('target_findings', targetFindings);
          break;
          
        case 'deep-diagnosis':
          endpoint = '/cloud/vision/deep-diagnosis';
          formData.append('file', files[0]);
          formData.append('image_type', imageType);
          if (patientContext) formData.append('patient_context', patientContext);
          break;
          
        case 'compare':
          endpoint = '/cloud/vision/compare';
          files.forEach(file => formData.append('files', file));
          formData.append('comparison_type', 'progression');
          if (clinicalContext) formData.append('clinical_context', clinicalContext);
          break;
          
        case 'video':
          endpoint = '/cloud/vision/video';
          files.forEach(file => formData.append('files', file));
          formData.append('video_type', videoType);
          break;
          
        case 'document':
          endpoint = '/cloud/vision/parse-document';
          formData.append('file', files[0]);
          formData.append('document_type', documentType);
          formData.append('extract_structured', 'true');
          break;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
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

  const renderBoundingBoxes = () => {
    if (!result?.data?.bounding_boxes || result.data.bounding_boxes.length === 0) return null;
    
    return (
      <div className="absolute inset-0">
        {result.data.bounding_boxes.map((box, idx) => (
          <div
            key={idx}
            className="absolute border-2 border-red-500 bg-red-500/10"
            style={{
              left: `${box.x1 * 100}%`,
              top: `${box.y1 * 100}%`,
              width: `${(box.x2 - box.x1) * 100}%`,
              height: `${(box.y2 - box.y1) * 100}%`,
            }}
          >
            <span className="absolute -top-5 left-0 bg-red-500 text-white text-xs px-1 rounded">
              Finding {idx + 1}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-black/10 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shadow-lg">
            <span className="text-3xl">🩻</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">Advanced Medical Imaging</h2>
            <p className="text-sm text-black/60">GLM-4.5V • 6 Analysis Modes • AI-Powered</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
          {ANALYSIS_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id as AnalysisMode);
                setFiles([]);
                setPreviews([]);
                setResult(null);
              }}
              className={`p-3 rounded-xl text-left transition-all ${
                mode === m.id
                  ? 'bg-black text-white shadow-lg'
                  : 'bg-black/5 hover:bg-black/10 text-black'
              }`}
            >
              <div className="text-xl mb-1">{m.icon}</div>
              <div className="text-xs font-semibold">{m.label}</div>
            </button>
          ))}
        </div>

        {/* Mode Description */}
        <div className="bg-stone-50 rounded-xl p-4 mb-6 border border-stone-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">{ANALYSIS_MODES.find(m => m.id === mode)?.icon}</span>
            <div>
              <div className="font-semibold text-black">{ANALYSIS_MODES.find(m => m.id === mode)?.label}</div>
              <div className="text-sm text-black/60">{ANALYSIS_MODES.find(m => m.id === mode)?.desc}</div>
            </div>
          </div>
        </div>

        {/* Mode-specific options */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {(mode === 'standard' || mode === 'localize' || mode === 'deep-diagnosis') && (
            <div>
              <label className="block text-sm font-medium text-black/70 mb-2">Image Type</label>
              <select
                value={imageType}
                onChange={(e) => setImageType(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-stone-500"
              >
                {IMAGE_TYPES.map(t => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </select>
            </div>
          )}

          {mode === 'video' && (
            <div>
              <label className="block text-sm font-medium text-black/70 mb-2">Video Type</label>
              <select
                value={videoType}
                onChange={(e) => setVideoType(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-stone-500"
              >
                {VIDEO_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          )}

          {mode === 'document' && (
            <div>
              <label className="block text-sm font-medium text-black/70 mb-2">Document Type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-stone-500"
              >
                {DOCUMENT_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
          )}

          {mode === 'localize' && (
            <div>
              <label className="block text-sm font-medium text-black/70 mb-2">Target Findings (optional)</label>
              <input
                type="text"
                value={targetFindings}
                onChange={(e) => setTargetFindings(e.target.value)}
                placeholder="e.g., nodules, masses, fractures"
                className="w-full px-4 py-2 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-stone-500"
              />
            </div>
          )}

          {mode === 'deep-diagnosis' && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-black/70 mb-2">Patient Context (optional)</label>
              <textarea
                value={patientContext}
                onChange={(e) => setPatientContext(e.target.value)}
                placeholder="Age, symptoms, relevant history..."
                className="w-full px-4 py-2 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-stone-500"
                rows={2}
              />
            </div>
          )}

          {mode === 'compare' && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-black/70 mb-2">Clinical Context (optional)</label>
              <input
                type="text"
                value={clinicalContext}
                onChange={(e) => setClinicalContext(e.target.value)}
                placeholder="Treatment history, time between scans..."
                className="w-full px-4 py-2 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-stone-500"
              />
            </div>
          )}
        </div>

        {/* File Upload */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            files.length > 0 ? 'border-green-300 bg-green-50' : 'border-black/20 hover:border-stone-400 hover:bg-stone-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={mode === 'compare' || mode === 'video'}
            onChange={handleFileSelect}
            className="hidden"
          />
          {files.length > 0 ? (
            <div>
              <span className="text-3xl">✅</span>
              <div className="text-sm font-medium text-black mt-2">
                {files.length} file(s) selected
              </div>
              <div className="text-xs text-black/50">Click to change</div>
            </div>
          ) : (
            <div>
              <span className="text-4xl">📤</span>
              <div className="text-sm font-medium text-black mt-2">
                {mode === 'compare' ? 'Drop 2-4 images to compare' : 
                 mode === 'video' ? 'Drop video frames (up to 8)' :
                 'Drop medical image or click to browse'}
              </div>
              <div className="text-xs text-black/50 mt-1">
                Supports JPG, PNG, DICOM preview
              </div>
            </div>
          )}
        </div>

        {/* Image Previews */}
        {previews.length > 0 && (
          <div className={`grid gap-4 mt-4 ${previews.length > 1 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1'}`}>
            {previews.map((preview, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden bg-black">
                <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-48 object-contain" />
                {mode === 'localize' && result && renderBoundingBoxes()}
                {previews.length > 1 && (
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {idx + 1}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Analyze Button */}
        <motion.button
          onClick={handleAnalyze}
          disabled={isAnalyzing || files.length === 0}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 ${
            isAnalyzing || files.length === 0
              ? 'bg-black/20 text-black/40 cursor-not-allowed'
              : 'bg-black text-white shadow-lg hover:bg-stone-800'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing with GLM-4.5V...
            </>
          ) : (
            <>
              <span>{ANALYSIS_MODES.find(m => m.id === mode)?.icon}</span>
              Run {ANALYSIS_MODES.find(m => m.id === mode)?.label}
            </>
          )}
        </motion.button>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-md rounded-3xl border border-black/10 p-6"
          >
            {/* Result Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <span className="text-xl">✅</span>
                </div>
                <div>
                  <div className="font-bold text-black">Analysis Complete</div>
                  <div className="text-xs text-black/50">
                    {result.data.model} • {result.data.feature || mode}
                  </div>
                </div>
              </div>
              {result.data.bounding_boxes && (
                <div className="px-3 py-1 bg-red-100 rounded-full text-red-700 text-sm font-medium">
                  {result.data.findings_count} findings located
                </div>
              )}
              {result.data.images_compared && (
                <div className="px-3 py-1 bg-blue-100 rounded-full text-blue-700 text-sm font-medium">
                  {result.data.images_compared} images compared
                </div>
              )}
              {result.data.frames_analyzed && (
                <div className="px-3 py-1 bg-stone-100 rounded-full text-black text-sm font-medium">
                  {result.data.frames_analyzed} frames analyzed
                </div>
              )}
            </div>

            {/* Structured Data (for document parsing) - Doctor-Friendly View */}
            {result.data.structured_data && (
              <div className="mb-6 space-y-4">
                {/* Document Header */}
                <div className="bg-stone-100 rounded-xl p-4 border border-stone-200">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      <div className="font-bold text-black text-lg">
                        {result.data.document_type?.replace('_', ' ').toUpperCase() || 'DOCUMENT'} SUMMARY
                      </div>
                      <div className="text-xs text-black/50">
                        {result.data.structured_data.patient_name && `Patient: ${result.data.structured_data.patient_name}`}
                        {result.data.structured_data.collection_date && ` • Date: ${result.data.structured_data.collection_date}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Critical/Abnormal Values Section */}
                {result.data.structured_data.tests && (
                  <>
                    {/* Critical Values */}
                    {result.data.structured_data.tests.some((t: any) => t.flag === 'critical' || t.flag === 'high' || t.flag === 'low') && (
                      <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">⚠️</span>
                          <span className="font-bold text-red-800">ABNORMAL VALUES - Require Attention</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-red-700 border-b border-red-200">
                                <th className="pb-2 pr-4">Test</th>
                                <th className="pb-2 pr-4">Result</th>
                                <th className="pb-2 pr-4">Reference</th>
                                <th className="pb-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.data.structured_data.tests
                                .filter((t: any) => t.flag === 'critical' || t.flag === 'high' || t.flag === 'low')
                                .map((test: any, idx: number) => (
                                  <tr key={idx} className="border-b border-red-100 last:border-0">
                                    <td className="py-2 pr-4 font-medium text-black">{test.name}</td>
                                    <td className="py-2 pr-4 font-bold text-red-700">
                                      {test.result} {test.unit}
                                    </td>
                                    <td className="py-2 pr-4 text-black/60">{test.reference_range || '-'}</td>
                                    <td className="py-2">
                                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        test.flag === 'critical' ? 'bg-red-600 text-white' :
                                        test.flag === 'high' ? 'bg-red-100 text-red-700' :
                                        'bg-blue-100 text-blue-700'
                                      }`}>
                                        {test.flag === 'critical' ? '🔴 CRITICAL' :
                                         test.flag === 'high' ? '↑ HIGH' : '↓ LOW'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Normal Values */}
                    {result.data.structured_data.tests.some((t: any) => t.flag === 'normal' || !t.flag) && (
                      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">✅</span>
                          <span className="font-bold text-green-800">NORMAL VALUES</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {result.data.structured_data.tests
                            .filter((t: any) => t.flag === 'normal' || !t.flag)
                            .map((test: any, idx: number) => (
                              <div key={idx} className="bg-white rounded-lg p-2 border border-green-100">
                                <div className="text-xs text-black/50">{test.name}</div>
                                <div className="font-semibold text-green-700">
                                  {test.result} {test.unit}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Medications (for prescriptions) */}
                {result.data.structured_data.medications && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">💊</span>
                      <span className="font-bold text-blue-800">MEDICATIONS</span>
                    </div>
                    <div className="space-y-2">
                      {result.data.structured_data.medications.map((med: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-blue-100">
                          <div className="font-semibold text-black">{med.name}</div>
                          <div className="text-sm text-black/70">
                            {med.dose} • {med.frequency} • {med.duration}
                          </div>
                          {med.quantity && <div className="text-xs text-black/50">Qty: {med.quantity}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diagnosis/Assessment */}
                {(result.data.structured_data.diagnosis || result.data.structured_data.assessment) && (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🩺</span>
                      <span className="font-bold text-amber-800">DIAGNOSIS / ASSESSMENT</span>
                    </div>
                    <div className="text-black/80">
                      {result.data.structured_data.diagnosis || result.data.structured_data.assessment}
                    </div>
                  </div>
                )}

                {/* Findings (for radiology/pathology) */}
                {result.data.structured_data.findings && (
                  <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🔍</span>
                      <span className="font-bold text-black">FINDINGS</span>
                    </div>
                    <div className="text-black/80 whitespace-pre-wrap">
                      {typeof result.data.structured_data.findings === 'string' 
                        ? result.data.structured_data.findings 
                        : JSON.stringify(result.data.structured_data.findings, null, 2)}
                    </div>
                  </div>
                )}

                {/* Findings by Body Region (for ultrasound/radiology) */}
                {result.data.structured_data.findings_by_body_region && (
                  <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-200">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">🩻</span>
                      <span className="font-bold text-cyan-800">FINDINGS BY BODY REGION</span>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(result.data.structured_data.findings_by_body_region).map(([region, finding]: [string, any]) => (
                        <div key={region} className="bg-white rounded-lg p-3 border border-cyan-100">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">
                              {region === 'head' ? '🧠' : 
                               region === 'neck' ? '👤' : 
                               region === 'spine' ? '🦴' : 
                               region === 'face' ? '😊' : 
                               region === 'general' ? '📊' :
                               region === 'heart' ? '❤️' :
                               region === 'lungs' ? '🫁' :
                               region === 'abdomen' ? '🫃' : '📍'}
                            </span>
                            <span className="font-semibold text-cyan-800 uppercase text-sm">{region}</span>
                          </div>
                          <div className="text-sm text-black/80 leading-relaxed">
                            {finding}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Critical/Abnormal Values for Radiology */}
                {result.data.structured_data.critical_or_abnormal_values && 
                 result.data.structured_data.critical_or_abnormal_values.length > 0 && (
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🚨</span>
                      <span className="font-bold text-red-800">CRITICAL/ABNORMAL FINDINGS</span>
                    </div>
                    <ul className="space-y-2">
                      {result.data.structured_data.critical_or_abnormal_values.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-red-700">
                          <span className="text-red-500">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Normal Scan Indicator (when no abnormalities) */}
                {result.data.structured_data.critical_or_abnormal_values && 
                 result.data.structured_data.critical_or_abnormal_values.length === 0 && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">✅</span>
                      <div>
                        <div className="font-bold text-green-800">NO ABNORMALITIES DETECTED</div>
                        <div className="text-sm text-green-700">All findings within normal limits</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Impression/Recommendations */}
                {(result.data.structured_data.impression || result.data.structured_data.recommendations) && (
                  <div className="bg-stone-100 rounded-xl p-4 border border-stone-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">📝</span>
                      <span className="font-bold text-black">IMPRESSION & RECOMMENDATIONS</span>
                    </div>
                    {result.data.structured_data.impression && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-black/50 mb-1">IMPRESSION</div>
                        {Array.isArray(result.data.structured_data.impression) ? (
                          <ul className="space-y-1">
                            {result.data.structured_data.impression.map((item: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-black/80">
                                <span className="text-stone-400">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-black/80">{result.data.structured_data.impression}</div>
                        )}
                      </div>
                    )}
                    {result.data.structured_data.recommendations && 
                     (Array.isArray(result.data.structured_data.recommendations) 
                       ? result.data.structured_data.recommendations.length > 0 
                       : true) && (
                      <div>
                        <div className="text-xs font-semibold text-black/50 mb-1">RECOMMENDATIONS</div>
                        {Array.isArray(result.data.structured_data.recommendations) ? (
                          <ul className="space-y-1">
                            {result.data.structured_data.recommendations.map((item: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-black/70 text-sm">
                                <span className="text-stone-400">→</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-black/70 text-sm">{result.data.structured_data.recommendations}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Raw JSON Toggle */}
                <details className="bg-black/5 rounded-xl border border-black/10">
                  <summary className="p-3 cursor-pointer text-sm font-medium text-black/60 hover:text-black">
                    📄 View Raw JSON Data
                  </summary>
                  <pre className="text-xs bg-white m-3 mt-0 p-3 rounded-lg overflow-x-auto border border-black/5">
                    {JSON.stringify(result.data.structured_data, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            {/* Doctor-Friendly Analysis Display */}
            {(result.data.analysis || result.data.reasoning_analysis) && (
              <div className="space-y-4">
                {/* Deep Diagnosis - Reasoning Chain */}
                {result.data.reasoning_analysis && (
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🧠</span>
                      <span className="font-bold text-purple-800">CLINICAL REASONING</span>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                      <div className="text-sm text-black/80 leading-relaxed whitespace-pre-wrap">
                        {result.data.reasoning_analysis}
                      </div>
                    </div>
                  </div>
                )}

                {/* Standard Analysis - Formatted Output */}
                {result.data.analysis && !result.data.reasoning_analysis && (
                  <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">📋</span>
                      <span className="font-bold text-black">ANALYSIS REPORT</span>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-stone-100">
                      <div className="text-sm text-black/80 leading-relaxed whitespace-pre-wrap">
                        {result.data.analysis}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Localized Findings with Visual Indicators */}
            {result.data.bounding_boxes && result.data.bounding_boxes.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    <span className="font-bold text-red-800">LOCALIZED ABNORMALITIES</span>
                  </div>
                  <span className="px-3 py-1 bg-red-100 rounded-full text-red-700 text-sm font-bold">
                    {result.data.findings_count || result.data.bounding_boxes.length} found
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.data.bounding_boxes.map((box, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-red-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-black text-sm">Finding #{idx + 1}</div>
                        <div className="text-xs text-black/50">
                          Location: ({(box.x1 * 100).toFixed(0)}%, {(box.y1 * 100).toFixed(0)}%) → ({(box.x2 * 100).toFixed(0)}%, {(box.y2 * 100).toFixed(0)}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-red-700 bg-red-100 rounded-lg p-2">
                  💡 Red boxes overlaid on the image above indicate areas of concern
                </div>
              </div>
            )}

            {/* Compare Images - Progression Summary */}
            {result.data.comparison_type && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    <span className="font-bold text-blue-800">COMPARISON ANALYSIS</span>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 rounded-full text-blue-700 text-sm">
                    {result.data.images_compared} images compared
                  </span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="text-xs font-semibold text-black/50 mb-1">COMPARISON TYPE</div>
                  <div className="font-semibold text-blue-800 capitalize mb-2">
                    {result.data.comparison_type} Analysis
                  </div>
                  <div className="text-sm text-black/70">
                    Sequential comparison of {result.data.images_compared} images to assess changes over time.
                  </div>
                </div>
              </div>
            )}

            {/* Video Analysis - Frame Summary */}
            {result.data.video_type && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎬</span>
                    <span className="font-bold text-amber-800">VIDEO ANALYSIS</span>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 rounded-full text-amber-700 text-sm">
                    {result.data.frames_analyzed} frames
                  </span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-amber-100">
                  <div className="text-xs font-semibold text-black/50 mb-1">STUDY TYPE</div>
                  <div className="font-semibold text-amber-800 capitalize mb-2">
                    {result.data.video_type}
                  </div>
                  <div className="text-sm text-black/70">
                    Analyzed {result.data.frames_analyzed} frames for motion patterns and abnormalities.
                  </div>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="mt-4 text-center text-xs text-black/40">
              🔒 AI-assisted analysis for clinical decision support only. Not a diagnosis.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
