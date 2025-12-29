'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import PredictionForm from '@/components/PredictionForm';
import RiskVisualization from '@/components/RiskVisualization';
import FeatureImportance from '@/components/FeatureImportance';
import FederatedStatus from '@/components/FederatedStatus';
import PurposeSelector from '@/components/PurposeSelector';
import PatientSelector from '@/components/PatientSelector';
import DNAAnalysis from '@/components/DNAAnalysis';
import MedicalImagingUpload from '@/components/MedicalImagingUpload';
import MultiDiseaseRisk from '@/components/MultiDiseaseRisk';
import AdvancedMedicalImaging from '@/components/AdvancedMedicalImaging';

const API_BASE = 'https://biotek-production.up.railway.app';

export default function PlatformPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [consent, setConsent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'predict' | 'dna-analysis' | 'medical-imaging' | 'ai-insights' | 'federated' | 'audit'>('predict');
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [llmReport, setLlmReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Purpose selection state
  const [showPurposeSelector, setShowPurposeSelector] = useState(false);
  const [currentPurpose, setCurrentPurpose] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<any>(null);
  
  // Patient context for multi-tenant access control
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  
  // Genomic risk state
  const [useGenomics, setUseGenomics] = useState(false);
  const [genomicRiskLevel, setGenomicRiskLevel] = useState<'low' | 'average' | 'high'>('average');
  const [genomicData, setGenomicData] = useState<any>(null);
  
  // AI Insights state
  const [progression, setProgression] = useState<any>(null);
  const [causalGraph, setCausalGraph] = useState<any>(null);
  const [treatment, setTreatment] = useState<any>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{role: 'user' | 'assistant', content: string, timestamp?: string}>>([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Multi-disease predictions state
  const [multiDiseaseData, setMultiDiseaseData] = useState<any>(null);
  const [loadingMultiDisease, setLoadingMultiDisease] = useState(false);
  
  // Patient-specific chat memory
  const [patientChatHistories, setPatientChatHistories] = useState<Record<string, Array<{role: 'user' | 'assistant', content: string, timestamp?: string}>>>({});

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedHistories = localStorage.getItem('biotek_chat_histories');
    if (savedHistories) {
      try {
        setPatientChatHistories(JSON.parse(savedHistories));
      } catch (e) {
        console.error('Failed to parse chat histories:', e);
      }
    }
  }, []);

  // Load patient-specific chat when patient changes
  useEffect(() => {
    const loadPatientChat = async () => {
      if (!currentPatientId) return;
      
      // First check localStorage
      if (patientChatHistories[currentPatientId]) {
        setAiMessages(patientChatHistories[currentPatientId]);
        return;
      }
      
      // Then try backend
      try {
        const response = await fetch(`${API_BASE}/ai/load-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: currentPatientId,
            session_id: session?.userId
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            setAiMessages(data.messages);
            // Also update local cache
            setPatientChatHistories(prev => ({
              ...prev,
              [currentPatientId]: data.messages
            }));
          } else {
            setAiMessages([]);
          }
        }
      } catch (e) {
        console.error('Failed to load chat from backend:', e);
        setAiMessages([]);
      }
    };
    
    loadPatientChat();
  }, [currentPatientId]);

  // Load prediction results when patient changes
  useEffect(() => {
    const loadPatientPrediction = async () => {
      if (!currentPatientId) {
        setPrediction(null);
        setMultiDiseaseData(null);
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE}/patient/${currentPatientId}/prediction-results`, {
          headers: {
            'X-User-ID': session?.userId || 'unknown',
            'X-User-Role': session?.role || 'unknown'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.found && data.prediction) {
            setPrediction(data.prediction);
            setMultiDiseaseData(data.prediction);
          } else {
            setPrediction(null);
            setMultiDiseaseData(null);
          }
        }
      } catch (e) {
        console.error('Failed to load prediction results:', e);
      }
    };
    
    loadPatientPrediction();
  }, [currentPatientId, session]);

  // Save chat history to localStorage when messages change
  useEffect(() => {
    if (currentPatientId && aiMessages.length > 0) {
      const updatedHistories = {
        ...patientChatHistories,
        [currentPatientId]: aiMessages
      };
      setPatientChatHistories(updatedHistories);
      localStorage.setItem('biotek_chat_histories', JSON.stringify(updatedHistories));
      
      // Also save to backend for persistence
      saveChatToBackend(currentPatientId, aiMessages);
    }
  }, [aiMessages, currentPatientId]);

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem('biotek_session');
    localStorage.removeItem('biotek_consent');
    localStorage.removeItem('biotek_chat_histories');
    router.push('/login');
  };

  // Save chat to backend database
  const saveChatToBackend = async (patientId: string, messages: any[]) => {
    try {
      await fetch(`${API_BASE}/ai/save-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          messages: messages,
          session_id: session?.userId
        })
      });
    } catch (e) {
      // Silently fail - localStorage is the primary backup
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, aiLoading]);

  useEffect(() => {
    // Check if user has valid session
    const storedSession = localStorage.getItem('biotek_session');
    if (!storedSession) {
      router.push('/login');
      return;
    }
    
    const sessionData = JSON.parse(storedSession);
    
    // Check if session is expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      localStorage.removeItem('biotek_session');
      router.push('/login');
      return;
    }
    
    // Redirect patients to their dashboard
    if (sessionData.role === 'patient') {
      router.push('/patient-dashboard');
      return;
    }
    
    setSession(sessionData);

    // Check if user has consented
    const storedConsent = localStorage.getItem('biotek_consent');
    if (storedConsent) {
      setConsent(JSON.parse(storedConsent));
    } else {
      // Auto-consent for staff members (doctors, nurses, researchers, admins)
      // They don't need patient-style consent to use the platform
      if (['doctor', 'nurse', 'researcher', 'admin', 'receptionist'].includes(sessionData.role)) {
        const staffConsent = { role: sessionData.role, autoConsent: true, timestamp: new Date().toISOString() };
        localStorage.setItem('biotek_consent', JSON.stringify(staffConsent));
        setConsent(staffConsent);
      }
    }

    // Load model info and audit logs
    loadModelInfo();
    loadAuditLogs();
  }, [router]);

  const loadModelInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/model/info`);
      const data = await response.json();
      setModelInfo(data);
    } catch (error) {
      console.error('Failed to load model info:', error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await fetch(`${API_BASE}/audit/logs?limit=10`);
      const data = await response.json();
      setAuditLogs(data);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!prediction) return;
    
    setGeneratingReport(true);
    setLlmReport(null);
    
    try {
      const response = await fetch(`${API_BASE}/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction: prediction
        }),
      });

      if (!response.ok) throw new Error('Report generation failed');
      
      const data = await response.json();
      setLlmReport(data.report);
    } catch (error) {
      console.error('Report generation error:', error);
      alert('Failed to generate AI report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handlePredictWithPurpose = (formData: any) => {
    // Check if user needs to select a patient (doctors, nurses)
    if (session && ['doctor', 'nurse'].includes(session.role) && !currentPatientId) {
      alert('Please select a patient before making predictions');
      return;
    }
    
    // Store the form data and show purpose selector
    setPendingAction({ type: 'predict', data: formData });
    setShowPurposeSelector(true);
  };

  const handlePurposeSelected = (purpose: string) => {
    setCurrentPurpose(purpose);
    setShowPurposeSelector(false);
    
    // Execute the pending action with the selected purpose
    if (pendingAction?.type === 'predict') {
      executePrediction(pendingAction.data, purpose);
    }
    
    setPendingAction(null);
  };

  const handleSendMessage = async () => {
    if (!aiQuestion.trim() || !prediction) return;
    
    // Add user message with timestamp
    const userMessage = aiQuestion;
    const timestamp = new Date().toISOString();
    const newMessages = [...aiMessages, { role: 'user' as const, content: userMessage, timestamp }];
    setAiMessages(newMessages);
    setAiQuestion('');
    setAiLoading(true);
    
    // Retry logic for cold start handling
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Build multi-disease context for AI
        const topRisks = multiDiseaseData?.predictions 
          ? Object.values(multiDiseaseData.predictions)
              .sort((a: any, b: any) => b.risk_score - a.risk_score)
              .slice(0, 5)
              .map((d: any) => ({
                name: d.name,
                risk: d.risk_percentage,
                category: d.risk_category,
                factors: d.top_factors?.slice(0, 2).map((f: any) => f.feature) || []
              }))
          : [];

        // Get full clinical data from multiDiseaseData
        const clinicalData = multiDiseaseData?.input_data || multiDiseaseData?.clinical_data || {};
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        const response = await fetch(`${API_BASE}/ai/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: userMessage,
            conversation_history: aiMessages,
            prediction_data: {
              risk_percentage: prediction.risk_percentage,
              risk_category: prediction.risk_category,
              top_factors: Object.keys(prediction.feature_importance || {}).slice(0, 3),
              // Include ALL clinical data
              clinical_values: {
                age: clinicalData.age || prediction.feature_importance?.age,
                bmi: clinicalData.bmi || prediction.feature_importance?.bmi,
                bp_systolic: clinicalData.bp_systolic,
                bp_diastolic: clinicalData.bp_diastolic,
                total_cholesterol: clinicalData.total_cholesterol,
                hdl: clinicalData.hdl,
                ldl: clinicalData.ldl || prediction.feature_importance?.ldl,
                triglycerides: clinicalData.triglycerides,
                hba1c: clinicalData.hba1c || prediction.feature_importance?.hba1c,
                egfr: clinicalData.egfr,
                smoking_pack_years: clinicalData.smoking_pack_years,
                exercise_hours_weekly: clinicalData.exercise_hours_weekly,
                has_diabetes: clinicalData.has_diabetes,
                on_bp_medication: clinicalData.on_bp_medication,
                family_history_score: clinicalData.family_history_score,
                sex: clinicalData.sex
              },
              // Multi-disease context
              multi_disease_analysis: {
                total_diseases: 12,
                high_risk_count: multiDiseaseData?.summary?.high_risk_count || 0,
                top_risks: topRisks
              }
            }
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Add AI response with timestamp
        setAiMessages(prev => [...prev, { role: 'assistant', content: data.answer, timestamp: new Date().toISOString() }]);
        setAiLoading(false);
        return; // Success - exit retry loop
        
      } catch (error: any) {
        lastError = error;
        console.warn(`AI request attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff: 1s, 2s, 4s)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }
    
    // All retries failed
    console.error('AI question failed after all retries:', lastError);
    setAiMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `⚠️ Connection issue. The server may be waking up - please try again in a moment.` 
    }]);
    setAiLoading(false);
  };

  // Fetch multi-disease predictions
  const fetchMultiDiseasePredictions = async (formData: any) => {
    setLoadingMultiDisease(true);
    try {
      const response = await fetch(`${API_BASE}/predict/multi-disease`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: formData.age || 50,
          sex: formData.sex || 1,
          bmi: formData.bmi || 25,
          hba1c: formData.hba1c || 5.7,
          ldl: formData.ldl || 100,
          bp_systolic: formData.bp_systolic || 120,
          bp_diastolic: formData.bp_diastolic || 80,
          smoking_pack_years: formData.smoking || 0,
          family_history_score: 2
        })
      });
      const data = await response.json();
      setMultiDiseaseData(data);
      return data;
    } catch (error) {
      console.error('Multi-disease prediction failed:', error);
      return null;
    } finally {
      setLoadingMultiDisease(false);
    }
  };

  const executePrediction = async (formData: any, purpose: string) => {
    if (!session) return;

    setLoading(true);
    setLlmReport(null);
    setMultiDiseaseData(null); // Reset multi-disease data
    
    try {
      let finalData = formData;
      let genomicResult = null;
      
      // If genomics enabled, get sample genotypes and calculate combined risk
      if (useGenomics) {
        // Get sample genotypes
        const genoResponse = await fetch(`${API_BASE}/genomics/sample-genotypes/${genomicRiskLevel}`);
        const genoData = await genoResponse.json();
        
        // Calculate combined genetic + clinical risk
        const combinedResponse = await fetch(`${API_BASE}/genomics/combined-risk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: currentPatientId || `PAT-${Date.now()}`,
            clinical_data: formData,
            genotypes: genoData.genotypes
          }),
        });
        
        genomicResult = await combinedResponse.json();
        setGenomicData(genomicResult);
        
        // Add PRS to form data for final prediction
        finalData = {
          ...formData,
          prs: genomicResult.prs || 0
        };
      }
      
      const response = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...finalData,
          patient_id: currentPatientId || `PAT-${Date.now()}`,
          consent_id: consent?.consentId,
          user_id: session.userId,
          user_role: session.role,
          access_purpose: purpose,
        }),
      });
      
      const data = await response.json();
      
      // Merge genomic data if available
      if (genomicResult) {
        data.genomic_risk = genomicResult;
      }
      
      setPrediction(data);
      loadAuditLogs(); // Refresh audit logs
      
      // Also fetch multi-disease predictions for AI Clinical Intelligence
      fetchMultiDiseasePredictions(formData);
    } catch (error) {
      console.error('Prediction failed:', error);
      alert('Prediction failed. Ensure API is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  if (!consent) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f3e7d9' }}>
        <div className="text-black/50">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f3e7d9' }}>
      {/* Header */}
      <header className="border-b border-black/10 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image 
                src="/images/ChatGPT Image Nov 10, 2025, 08_09_36 AM.png" 
                alt="BioTeK"
                width={40}
                height={40}
              />
              <div>
                <div className="text-xl font-bold">BioTeK Clinical Platform</div>
                <div className="text-xs text-black/50">Enterprise Disease Risk Prediction System</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {/* User Info */}
              {session && (
                <div className="flex items-center gap-3 px-4 py-2 bg-black/5 rounded-full">
                  <div className="text-2xl">
                    {session.role === 'doctor' && '👨‍⚕️'}
                    {session.role === 'nurse' && '👩‍⚕️'}
                    {session.role === 'researcher' && '🔬'}
                    {session.role === 'admin' && '⚙️'}
                    {session.role === 'patient' && '🧑'}
                    {session.role === 'receptionist' && '📋'}
                  </div>
                  <div className="text-sm">
                    <div className="font-medium capitalize">{session.role}</div>
                    <div className="text-black/50 text-xs">{session.userId}</div>
                  </div>
                </div>
              )}
              
              {modelInfo && (
                <div className="hidden md:flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-black/50">Model:</span>
                    <span className="ml-1 font-medium">{modelInfo.model_type}</span>
                  </div>
                  <div>
                    <span className="text-black/50">Accuracy:</span>
                    <span className="ml-1 font-medium">{(modelInfo.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-black/50">AUC:</span>
                    <span className="ml-1 font-medium">{modelInfo.auc.toFixed(3)}</span>
                  </div>
                </div>
              )}
              <div className="h-8 w-px bg-black/10" />
              <span className="text-sm text-black/60">Dr. Smith</span>
              <button 
                onClick={handleSignOut}
                className="bg-black text-white px-4 py-2 rounded-full text-sm hover:bg-black/90 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-black/10 bg-white/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {[
              { id: 'predict', label: 'Risk Prediction', icon: '🎯' },
              { id: 'dna-analysis', label: 'DNA Analysis', icon: '🧬' },
              { id: 'medical-imaging', label: 'Medical Imaging', icon: '👁️' },
              { id: 'ai-insights', label: 'AI Clinical Intelligence', icon: '🧠' },
              { id: 'federated', label: 'Federated Network', icon: '🔗' },
              { id: 'audit', label: 'Audit Trail', icon: '📋' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-black text-black font-medium'
                    : 'border-transparent text-black/50 hover:text-black'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Patient Selector - Always visible for doctors/nurses */}
        {session && ['doctor', 'nurse'].includes(session.role) && (
          <PatientSelector 
            onSelect={setCurrentPatientId}
            currentPatientId={currentPatientId || undefined}
          />
        )}

        <AnimatePresence mode="wait">
          {/* Prediction Tab - Multi-Disease Risk Assessment */}
          {activeTab === 'predict' && (
            <motion.div
              key="predict"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MultiDiseaseRisk 
                onPredictionComplete={(data) => {
                  setPrediction(data);
                  setMultiDiseaseData(data);
                }}
                patientId={currentPatientId}
                userId={session?.userId}
                userRole={session?.role}
              />
            </motion.div>
          )}

          {/* DNA Analysis Tab (Evo 2) */}
          {activeTab === 'dna-analysis' && (
            <motion.div
              key="dna-analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <DNAAnalysis />
            </motion.div>
          )}

          {/* Medical Imaging Tab (GLM-4.5V) */}
          {activeTab === 'medical-imaging' && (
            <motion.div
              key="medical-imaging"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <AdvancedMedicalImaging />
            </motion.div>
          )}

          {/* AI Clinical Intelligence Tab */}
          {activeTab === 'ai-insights' && (
            <motion.div
              key="ai-insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {!prediction ? (
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center">
                  <div className="text-5xl mb-4">🧠</div>
                  <h3 className="text-xl font-bold text-black mb-2">No Prediction Data</h3>
                  <p className="text-black/60">
                    Generate a prediction first to access AI Clinical Intelligence features
                  </p>
                </div>
              ) : (
                <>
                  {/* Header with Multi-Disease Summary */}
                  <div className="bg-stone-50 backdrop-blur-md rounded-3xl p-8 border border-stone-200">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl">🧠</span>
                      <div>
                        <h2 className="text-2xl font-bold text-black">AI Clinical Intelligence</h2>
                        <p className="text-sm text-black/60">12-Disease Risk Analysis • XGBoost+LightGBM Models • 83% Average Accuracy</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="bg-white rounded-xl p-4 border border-stone-100">
                        <div className="text-sm text-black/60 mb-1">Diseases Analyzed</div>
                        <div className="text-3xl font-bold text-black">12</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-stone-100">
                        <div className="text-sm text-black/60 mb-1">High Risk Conditions</div>
                        <div className="text-3xl font-bold text-red-600">
                          {multiDiseaseData?.predictions ? Object.values(multiDiseaseData.predictions).filter((p: any) => p.risk_category === 'HIGH').length : '-'}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-stone-100">
                        <div className="text-sm text-black/60 mb-1">Patient ID</div>
                        <div className="text-lg font-medium text-black">{currentPatientId || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Top 3 Highest Risk Diseases */}
                  <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-black/10">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-3xl">⚠️</span>
                      <div>
                        <h3 className="text-xl font-bold text-black">Top Risk Conditions</h3>
                        <p className="text-sm text-black/60">Highest priority conditions from 12-disease analysis</p>
                      </div>
                    </div>
                    
                    {loadingMultiDisease ? (
                      <div className="text-center py-8">
                        <div className="animate-spin text-4xl mb-2">⏳</div>
                        <p className="text-black/60">Analyzing 12 disease models...</p>
                      </div>
                    ) : multiDiseaseData?.predictions ? (
                      <div className="space-y-4">
                        {Object.values(multiDiseaseData.predictions)
                          .sort((a: any, b: any) => b.risk_score - a.risk_score)
                          .slice(0, 4)
                          .map((disease: any, idx: number) => (
                            <div key={disease.disease_id} className={`rounded-2xl p-5 border ${
                              disease.risk_category === 'HIGH' ? 'bg-red-50 border-red-200' :
                              disease.risk_category === 'MODERATE' ? 'bg-amber-50 border-amber-200' :
                              'bg-stone-50 border-stone-200'
                            }`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">
                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '📊'}
                                  </span>
                                  <div>
                                    <h4 className="font-bold text-black">{disease.name}</h4>
                                    <p className="text-xs text-black/60">{disease.model_type} • Confidence: {(disease.confidence * 100).toFixed(0)}%</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-2xl font-bold ${
                                    disease.risk_category === 'HIGH' ? 'text-red-600' :
                                    disease.risk_category === 'MODERATE' ? 'text-amber-600' : 'text-stone-600'
                                  }`}>
                                    {disease.risk_percentage.toFixed(1)}%
                                  </div>
                                  <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                                    disease.risk_category === 'HIGH' ? 'bg-red-100 text-red-700' :
                                    disease.risk_category === 'MODERATE' ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-700'
                                  }`}>
                                    {disease.risk_category}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Risk bar */}
                              <div className="h-2 bg-black/10 rounded-full overflow-hidden mb-3">
                                <div
                                  className={`h-full rounded-full ${
                                    disease.risk_category === 'HIGH' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                    disease.risk_category === 'MODERATE' ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                                    'bg-gradient-to-r from-stone-400 to-stone-600'
                                  }`}
                                  style={{ width: `${Math.min(disease.risk_percentage, 100)}%` }}
                                />
                              </div>
                              
                              {/* Top factors from real model */}
                              {disease.top_factors && disease.top_factors.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  <span className="text-xs text-black/50">Key factors:</span>
                                  {disease.top_factors.slice(0, 3).map((factor: any, fIdx: number) => (
                                    <span key={fIdx} className="text-xs bg-white px-2 py-1 rounded-full border border-black/5">
                                      {factor.feature}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-black/50">
                        Multi-disease data not available
                      </div>
                    )}
                  </div>

                  {/* Risk Factor Impact Calculator */}
                  <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-black/10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🎯</span>
                        <div>
                          <h3 className="text-xl font-bold text-black">Risk Factor Impact Analysis</h3>
                          <p className="text-sm text-black/60">Modifiable factors ranked by potential risk reduction</p>
                        </div>
                      </div>
                      {multiDiseaseData && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            -{(() => {
                              const inputData = multiDiseaseData?.input_data || {};
                              let total = 0;
                              if (inputData.bmi > 25) total += Math.min(12, Math.round((inputData.bmi - 25) * 2.4));
                              if (inputData.hba1c > 5.7) total += Math.min(15, Math.round((inputData.hba1c - 5.4) * 5));
                              if (inputData.bp_systolic > 120) total += Math.min(10, Math.round((inputData.bp_systolic - 120) * 0.5));
                              if (inputData.ldl > 100) total += Math.min(8, Math.round((inputData.ldl - 100) * 0.16));
                              if (inputData.smoking_pack_years > 0) total += Math.min(15, inputData.smoking_pack_years);
                              if ((inputData.exercise_hours_weekly || 0) < 5) total += Math.round((5 - (inputData.exercise_hours_weekly || 0)) * 1.5);
                              return Math.min(45, total);
                            })()}%
                          </div>
                          <div className="text-xs text-black/50">Potential Risk Reduction</div>
                        </div>
                      )}
                    </div>

                    {multiDiseaseData ? (
                      <div className="space-y-4">
                        {/* Risk Factors - Sorted by Impact */}
                        {(() => {
                          const inputData = multiDiseaseData?.input_data || {};
                          const factors = [
                            {
                              name: 'HbA1c',
                              current: inputData.hba1c || 5.7,
                              target: 5.4,
                              unit: '%',
                              impact: inputData.hba1c > 5.7 ? Math.min(15, Math.round((inputData.hba1c - 5.4) * 5)) : 0,
                              status: inputData.hba1c <= 5.4 ? 'optimal' : inputData.hba1c <= 5.7 ? 'elevated' : 'high',
                              action: inputData.hba1c > 5.7 ? 'Reduce refined carbs, increase fiber, consider metformin if prediabetic' : 'Maintain current glycemic control',
                              icon: '🩸'
                            },
                            {
                              name: 'BMI',
                              current: inputData.bmi || 27.5,
                              target: 25.0,
                              unit: 'kg/m²',
                              impact: inputData.bmi > 25 ? Math.min(12, Math.round((inputData.bmi - 25) * 2.4)) : 0,
                              status: inputData.bmi <= 25 ? 'optimal' : inputData.bmi <= 30 ? 'elevated' : 'high',
                              action: inputData.bmi > 25 ? `Lose ${Math.round((inputData.bmi - 25) * 2.5)}kg through caloric deficit (500kcal/day)` : 'Maintain healthy weight',
                              icon: '⚖️'
                            },
                            {
                              name: 'Blood Pressure',
                              current: inputData.bp_systolic || 130,
                              target: 120,
                              unit: 'mmHg',
                              impact: inputData.bp_systolic > 120 ? Math.min(10, Math.round((inputData.bp_systolic - 120) * 0.5)) : 0,
                              status: inputData.bp_systolic <= 120 ? 'optimal' : inputData.bp_systolic <= 130 ? 'elevated' : 'high',
                              action: inputData.bp_systolic > 120 ? 'DASH diet, reduce sodium <2000mg/day, consider ACE inhibitor' : 'Continue BP monitoring',
                              icon: '💓'
                            },
                            {
                              name: 'LDL Cholesterol',
                              current: inputData.ldl || 120,
                              target: 100,
                              unit: 'mg/dL',
                              impact: inputData.ldl > 100 ? Math.min(8, Math.round((inputData.ldl - 100) * 0.16)) : 0,
                              status: inputData.ldl <= 100 ? 'optimal' : inputData.ldl <= 130 ? 'elevated' : 'high',
                              action: inputData.ldl > 100 ? 'Statin therapy, reduce saturated fat, increase omega-3' : 'Maintain lipid profile',
                              icon: '🫀'
                            },
                            {
                              name: 'Smoking',
                              current: inputData.smoking_pack_years || 0,
                              target: 0,
                              unit: 'pack-years',
                              impact: inputData.smoking_pack_years > 0 ? Math.min(15, inputData.smoking_pack_years) : 0,
                              status: inputData.smoking_pack_years === 0 ? 'optimal' : 'high',
                              action: inputData.smoking_pack_years > 0 ? 'Smoking cessation program, NRT or varenicline' : 'Non-smoker ✓',
                              icon: '🚭'
                            },
                            {
                              name: 'Exercise',
                              current: inputData.exercise_hours_weekly || 2.5,
                              target: 5,
                              unit: 'hrs/week',
                              impact: (inputData.exercise_hours_weekly || 0) < 5 ? Math.round((5 - (inputData.exercise_hours_weekly || 0)) * 1.5) : 0,
                              status: (inputData.exercise_hours_weekly || 0) >= 5 ? 'optimal' : (inputData.exercise_hours_weekly || 0) >= 2.5 ? 'elevated' : 'high',
                              action: (inputData.exercise_hours_weekly || 0) < 5 ? `Add ${Math.round(5 - (inputData.exercise_hours_weekly || 0))} more hrs/week moderate activity` : 'Excellent activity level',
                              icon: '🏃'
                            }
                          ].sort((a, b) => b.impact - a.impact);

                          return factors.map((factor, idx) => (
                            <div 
                              key={factor.name}
                              className={`p-4 rounded-2xl border transition-all ${
                                factor.status === 'optimal' 
                                  ? 'bg-emerald-50 border-emerald-200' 
                                  : factor.status === 'elevated'
                                  ? 'bg-amber-50 border-amber-200'
                                  : 'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <span className="text-2xl">{factor.icon}</span>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-bold text-black">{factor.name}</span>
                                      {factor.impact > 0 && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                          -{factor.impact}% risk
                                        </span>
                                      )}
                                      {factor.status === 'optimal' && (
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                          ✓ Optimal
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm mb-2">
                                      <span className={`font-medium ${factor.status === 'optimal' ? 'text-emerald-700' : factor.status === 'elevated' ? 'text-amber-700' : 'text-red-700'}`}>
                                        Current: {factor.current} {factor.unit}
                                      </span>
                                      {factor.status !== 'optimal' && (
                                        <>
                                          <span className="text-black/30">→</span>
                                          <span className="text-emerald-600 font-medium">Target: {factor.target} {factor.unit}</span>
                                        </>
                                      )}
                                    </div>
                                    <p className="text-xs text-black/60">{factor.action}</p>
                                  </div>
                                </div>
                                {factor.impact > 0 && (
                                  <div className="w-24 ml-4">
                                    <div className="h-2 bg-black/10 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                                        style={{ width: `${Math.min(100, factor.impact * 6.67)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ));
                        })()}

                        {/* Summary Card */}
                        <div className="bg-gradient-to-r from-stone-100 to-stone-50 rounded-2xl p-6 border border-stone-200 mt-6">
                          <div className="flex items-start gap-4">
                            <span className="text-3xl">📋</span>
                            <div>
                              <h4 className="font-bold text-black mb-2">Clinical Priority Order</h4>
                              <p className="text-sm text-black/70 mb-3">
                                Based on this patient's profile, address modifiable factors in order of impact. 
                                Combined interventions could reduce overall disease risk by up to{' '}
                                <span className="font-bold text-green-600">
                                  {(() => {
                                    const inputData = multiDiseaseData?.input_data || {};
                                    let total = 0;
                                    if (inputData.bmi > 25) total += Math.min(12, Math.round((inputData.bmi - 25) * 2.4));
                                    if (inputData.hba1c > 5.7) total += Math.min(15, Math.round((inputData.hba1c - 5.4) * 5));
                                    if (inputData.bp_systolic > 120) total += Math.min(10, Math.round((inputData.bp_systolic - 120) * 0.5));
                                    if (inputData.ldl > 100) total += Math.min(8, Math.round((inputData.ldl - 100) * 0.16));
                                    if (inputData.smoking_pack_years > 0) total += Math.min(15, inputData.smoking_pack_years);
                                    if ((inputData.exercise_hours_weekly || 0) < 5) total += Math.round((5 - (inputData.exercise_hours_weekly || 0)) * 1.5);
                                    return Math.min(45, total);
                                  })()}%
                                </span>.
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {['lifestyle', 'medication', 'monitoring'].map(tag => (
                                  <span key={tag} className="px-2 py-1 bg-white rounded-full text-xs font-medium text-black/60 border border-black/10">
                                    {tag === 'lifestyle' ? '🥗 Lifestyle' : tag === 'medication' ? '💊 Medication' : '📊 Monitoring'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-black/50">
                        <span className="text-4xl mb-4 block">📊</span>
                        Run a risk prediction first to see personalized risk factor analysis
                      </div>
                    )}
                  </div>

                  {/* AI Research Assistant */}
                  <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-black/10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">💬</span>
                        <div>
                          <h3 className="text-xl font-bold text-black">AI Research Assistant</h3>
                          <p className="text-sm text-black/60">Ask questions about this prediction</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAiChatOpen(true)}
                        className="bg-black text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-stone-800 flex items-center gap-2"
                      >
                        <span>💬</span>
                        Open AI Chat
                      </button>
                    </div>

                    <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200">
                      <div className="text-sm text-black/70">
                        Click "Open AI Chat" to start a conversation about this patient's prediction.
                        Ask questions like:
                        <ul className="mt-3 space-y-1 ml-4 list-disc">
                          <li>Why is HbA1c the biggest risk factor?</li>
                          <li>What interventions would you recommend?</li>
                          <li>How does genetics affect this risk?</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Treatment Optimizer */}
                  <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-black/10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">💊</span>
                        <div>
                          <h3 className="text-xl font-bold text-black">AI Treatment Optimizer</h3>
                          <p className="text-sm text-black/60">Evidence-based protocol from clinical trials</p>
                        </div>
                      </div>
                      {!treatment && (
                        <button
                          onClick={async () => {
                            try {
                              // Get data from multiDiseaseData.input_data or prediction or defaults
                              const inputData = multiDiseaseData?.input_data || {};
                              const featureData = prediction?.feature_importance || {};
                              
                              const response = await fetch(`${API_BASE}/ai/optimize-treatment`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  patient_data: {
                                    risk: prediction?.risk_percentage || 50,
                                    hba1c: inputData.hba1c || featureData.hba1c || 5.7,
                                    bmi: inputData.bmi || featureData.bmi || 27.5,
                                    age: inputData.age || featureData.age || 55
                                  }
                                })
                              });
                              const data = await response.json();
                              console.log('Treatment data:', data);
                              setTreatment(data);
                            } catch (error) {
                              console.error('Treatment optimization failed:', error);
                              alert('Failed to generate treatment. Check console.');
                            }
                          }}
                          className="bg-black text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-stone-800"
                        >
                          ✨ Generate Protocol
                        </button>
                      )}
                    </div>

                    {treatment && (
                      <div className="space-y-4">
                        {/* Render treatment protocol with proper formatting */}
                        <div className="space-y-4">
                          {treatment.treatment_protocol.split(/(?=#{1,4}\s|\*\*Phase|\*\*PHASE|---)/g).map((section: string, idx: number) => {
                            const trimmed = section.trim();
                            if (!trimmed) return null;
                            
                            // Main headers (###)
                            if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
                              const title = trimmed.replace(/^#{2,3}\s+/, '').replace(/\*\*/g, '');
                              return (
                                <div key={idx} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-5 mt-4">
                                  <h3 className="text-lg font-bold">{title.split('\n')[0]}</h3>
                                  {title.includes('*') && (
                                    <p className="text-blue-100 text-sm mt-1">{title.split('\n').slice(1).join(' ').replace(/\*/g, '')}</p>
                                  )}
                                </div>
                              );
                            }
                            
                            // Phase headers
                            if (trimmed.includes('**Phase') || trimmed.includes('**PHASE') || trimmed.startsWith('#### ')) {
                              const lines = trimmed.split('\n');
                              const phaseTitle = lines[0].replace(/[#*]/g, '').trim();
                              const phaseNum = phaseTitle.match(/Phase\s*(\d)/i)?.[1] || '1';
                              const colors = {
                                '1': 'from-emerald-500 to-green-600',
                                '2': 'from-amber-500 to-orange-500', 
                                '3': 'from-blue-500 to-cyan-500'
                              };
                              return (
                                <div key={idx} className={`bg-gradient-to-r ${colors[phaseNum as keyof typeof colors] || 'from-gray-500 to-gray-600'} text-white rounded-2xl p-5 mt-6`}>
                                  <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">{phaseNum}</span>
                                    <div>
                                      <h4 className="font-bold text-lg">{phaseTitle}</h4>
                                      {lines[1] && <p className="text-white/80 text-sm">{lines[1].replace(/\*\*/g, '').replace(/Goal:|Initiation Criteria:/i, '').trim()}</p>}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            
                            // Tables and content
                            if (trimmed.includes('|')) {
                              const rows = trimmed.split('\n').filter(r => r.includes('|') && !r.match(/^\|[-:]+\|/));
                              return (
                                <div key={idx} className="bg-white rounded-2xl border border-black/10 overflow-hidden">
                                  {rows.map((row, rowIdx) => {
                                    const cells = row.split('|').filter(c => c.trim());
                                    const isHeader = rowIdx === 0;
                                    return (
                                      <div key={rowIdx} className={`grid grid-cols-2 ${isHeader ? 'bg-stone-100 font-semibold' : 'border-t border-black/5'}`}>
                                        {cells.map((cell, cellIdx) => (
                                          <div key={cellIdx} className={`p-4 text-sm ${cellIdx === 0 ? 'font-medium text-black' : 'text-black/70'}`}>
                                            {cell.replace(/\*\*/g, '').replace(/<br>/g, '\n').split('\n').map((line, lineIdx) => (
                                              <div key={lineIdx} className={lineIdx > 0 ? 'mt-1' : ''}>{line.replace(/^-\s*/, '• ').trim()}</div>
                                            ))}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            
                            // Confidence levels and other content
                            if (trimmed.includes('Confidence Level') || trimmed.includes('**Confidence')) {
                              const level = trimmed.match(/High|Moderate|Low/i)?.[0] || 'Moderate';
                              const colors = { High: 'bg-green-100 text-green-800', Moderate: 'bg-amber-100 text-amber-800', Low: 'bg-red-100 text-red-800' };
                              return (
                                <div key={idx} className={`${colors[level as keyof typeof colors]} rounded-xl p-4 text-sm flex items-center gap-2`}>
                                  <span className="text-lg">{level === 'High' ? '✅' : level === 'Moderate' ? '⚠️' : '❌'}</span>
                                  <span>{trimmed.replace(/\*\*/g, '').replace(/Confidence Level:?/i, 'Confidence:')}</span>
                                </div>
                              );
                            }
                            
                            // Key Considerations section
                            if (trimmed.includes('Key Considerations') || trimmed.includes('Considerations')) {
                              return (
                                <div key={idx} className="bg-amber-50 rounded-2xl p-5 border border-amber-200 mt-4">
                                  <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                                    <span>⚡</span> Key Considerations
                                  </h4>
                                  <div className="space-y-2 text-sm text-amber-800">
                                    {trimmed.split('\n').filter(l => l.match(/^\d\./)).map((item, i) => (
                                      <div key={i} className="flex gap-2">
                                        <span className="font-bold">{i + 1}.</span>
                                        <span>{item.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '')}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            
                            // Regular paragraphs
                            if (trimmed.length > 10 && !trimmed.startsWith('---')) {
                              return (
                                <div key={idx} className="bg-stone-50 rounded-xl p-4 text-sm text-black/70 italic">
                                  {trimmed.replace(/\*/g, '').replace(/^-+$/, '')}
                                </div>
                              );
                            }
                            
                            return null;
                          })}
                        </div>
                        
                        {/* Footer stats */}
                        <div className="flex items-center justify-between text-sm bg-stone-100 rounded-xl p-4 mt-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-black/60">AI Confidence: <span className="font-bold text-black">{treatment.confidence}%</span></span>
                          </div>
                          <span className="text-black/50">Based on: {treatment.based_on_patients}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Federated Learning Tab */}
          {activeTab === 'federated' && (
            <motion.div
              key="federated"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FederatedStatus />
            </motion.div>
          )}

          {/* Audit Trail Tab */}
          {activeTab === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/80 backdrop-blur-md rounded-3xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-black mb-2">Audit Trail</h2>
                  <p className="text-sm text-black/60">Complete prediction history with consent tracking</p>
                </div>
                <button
                  onClick={loadAuditLogs}
                  className="px-4 py-2 bg-black text-white rounded-full text-sm hover:bg-black/90 transition-all"
                >
                  Refresh
                </button>
              </div>

              {auditLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/10">
                        <th className="text-left py-3 px-4 text-sm font-medium text-black/70">ID</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-black/70">Timestamp</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-black/70">Patient</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-black/70">Risk</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-black/70">Genetics</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-black/70">Model</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-b border-black/5 hover:bg-black/5">
                          <td className="py-3 px-4 text-sm text-black">{log.id}</td>
                          <td className="py-3 px-4 text-sm text-black/70">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm font-mono text-black/70">{log.patient_id}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              log.risk_category === 'High Risk'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {log.risk_category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-black/70">
                            {log.used_genetics ? 'Yes' : 'No'}
                          </td>
                          <td className="py-3 px-4 text-sm text-black/70">v{log.model_version}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-black/60">No predictions yet</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Purpose Selector Modal */}
      {showPurposeSelector && session && (
        <PurposeSelector
          allowedPurposes={session.allowedPurposes}
          onSelect={handlePurposeSelected}
          onCancel={() => {
            setShowPurposeSelector(false);
            setPendingAction(null);
          }}
          dataType={pendingAction?.type === 'predict' ? 'predictions' : undefined}
        />
      )}

      {/* AI Chat Modal */}
      {aiChatOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setAiChatOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col m-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-stone-700 to-stone-900 flex items-center justify-center text-white text-sm font-bold">
                  AI
                </div>
                <div>
                  <h3 className="text-base font-semibold text-black">Clinical AI Assistant</h3>
                  <p className="text-xs text-black/50">Evidence-based insights • {aiMessages.length > 0 ? `${Math.floor(aiMessages.length / 2)} exchanges` : 'New conversation'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {aiMessages.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear conversation history?')) {
                        setAiMessages([]);
                      }
                    }}
                    className="text-black/30 hover:text-black/60 text-xs px-3 py-1 rounded-full hover:bg-black/5 transition-all"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setAiChatOpen(false)}
                  className="text-black/30 hover:text-black/60 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {aiMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <h4 className="text-xl font-bold text-black mb-2">Start a Conversation</h4>
                  <p className="text-black/60 text-sm max-w-md">
                    Ask questions about this patient's prediction. Get evidence-based clinical insights.
                  </p>
                  <div className="mt-6 space-y-2 text-left w-full max-w-md">
                    <button
                      onClick={() => setAiQuestion("Why is HbA1c the biggest risk factor?")}
                      className="block w-full text-left px-4 py-3 rounded-full bg-white border border-black/10 hover:bg-gray-50 text-sm text-black/80 shadow-sm transition-all"
                    >
                      Why is HbA1c the biggest risk factor?
                    </button>
                    <button
                      onClick={() => setAiQuestion("What interventions would you recommend?")}
                      className="block w-full text-left px-4 py-3 rounded-full bg-white border border-black/10 hover:bg-gray-50 text-sm text-black/80 shadow-sm transition-all"
                    >
                      What interventions would you recommend?
                    </button>
                    <button
                      onClick={() => setAiQuestion("How does genetics affect this risk?")}
                      className="block w-full text-left px-4 py-3 rounded-full bg-white border border-black/10 hover:bg-gray-50 text-sm text-black/80 shadow-sm transition-all"
                    >
                      How does genetics affect this risk?
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {aiMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-5 py-3 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-stone-700 to-stone-900 text-white rounded-[20px] rounded-br-md'
                            : 'bg-gray-100 text-black/90 rounded-[20px] rounded-bl-md'
                        }`}
                      >
                        <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-[20px] rounded-bl-md px-5 py-3">
                        <div className="flex items-center gap-2 text-[15px] text-black/60">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-black/10 bg-white rounded-b-3xl">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && aiQuestion.trim() && !aiLoading) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Message AI Assistant..."
                  className="flex-1 px-5 py-4 rounded-full border border-black/10 focus:border-purple-400 focus:outline-none bg-white shadow-sm text-sm"
                  disabled={aiLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!aiQuestion.trim() || aiLoading}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold transition-all ${
                    aiQuestion.trim() && !aiLoading
                      ? 'bg-gradient-to-r from-stone-700 to-stone-900 hover:opacity-90 cursor-pointer'
                      : 'bg-black/20 cursor-not-allowed'
                  }`}
                >
                  ↑
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
