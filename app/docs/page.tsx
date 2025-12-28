'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#f3e7d9] relative">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-4 bg-[#f3e7d9]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image 
              src="/images/ChatGPT Image Nov 10, 2025, 08_09_36 AM.png" 
              alt="BioTeK"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-bold text-black text-lg">BioTeK Docs</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="text-sm font-medium text-black/60 hover:text-black transition-colors">
                ← Back to Platform
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-8">
            <div>
              <h3 className="font-bold text-black mb-4">Architecture</h3>
              <ul className="space-y-2 text-sm text-black/60">
                <li><a href="#overview" className="hover:text-black transition-colors">System Overview</a></li>
                <li><a href="#federation" className="hover:text-black transition-colors">Federated Learning</a></li>
                <li><a href="#privacy" className="hover:text-black transition-colors">Differential Privacy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-black mb-4">AI Models</h3>
              <ul className="space-y-2 text-sm text-black/60">
                <li><a href="#risk-model" className="hover:text-black transition-colors">Risk Prediction (RF)</a></li>
                <li><a href="#clinical-llm" className="hover:text-black transition-colors">Clinical Assistant (Qwen)</a></li>
                <li><a href="#explainability" className="hover:text-black transition-colors">SHAP Explainability</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-black mb-4">Security</h3>
              <ul className="space-y-2 text-sm text-black/60">
                <li><a href="#encryption" className="hover:text-black transition-colors">Encryption Standards</a></li>
                <li><a href="#access-control" className="hover:text-black transition-colors">RBAC & Audit Logs</a></li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 space-y-16">
          {/* Header */}
          <section>
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-6">Technical Documentation</h1>
            <p className="text-xl text-black/60 leading-relaxed max-w-3xl">
              Comprehensive guide to the BioTeK privacy-preserving multi-disease AI platform. 
              Featuring 12 disease predictions, 55 clinical biomarkers, and 5 genetic risk panels.
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white rounded-2xl p-4 border border-black/5">
                <div className="text-2xl font-bold text-black">12</div>
                <div className="text-xs text-black/50">Diseases</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-black/5">
                <div className="text-2xl font-bold text-black">55</div>
                <div className="text-xs text-black/50">Biomarkers</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-black/5">
                <div className="text-2xl font-bold text-black">59</div>
                <div className="text-xs text-black/50">GWAS SNPs</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-black/5">
                <div className="text-2xl font-bold text-black">85%</div>
                <div className="text-xs text-black/50">Avg Accuracy</div>
              </div>
            </div>
          </section>

          {/* System Overview */}
          <section id="overview" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm">01</span>
              System Overview
            </h2>
            <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm space-y-6">
              <p className="text-black/70 leading-relaxed">
                BioTeK is designed as a distributed system that prioritizes data sovereignty. Unlike traditional centralized AI approaches, 
                patient data never leaves the local hospital node. Instead, we aggregate model updates (gradients) using a secure aggregation server.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="bg-black/[0.03] p-6 rounded-2xl">
                  <div className="font-bold text-black mb-2">Frontend Layer</div>
                  <p className="text-sm text-black/60">Next.js 14 application with React Server Components, utilizing Framer Motion for animations and Tailwind CSS for styling.</p>
                </div>
                <div className="bg-black/[0.03] p-6 rounded-2xl">
                  <div className="font-bold text-black mb-2">API Layer</div>
                  <p className="text-sm text-black/60">FastAPI (Python) backend handling model inference, authentication, and secure communication with local LLM services.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Federated Learning */}
          <section id="federation" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm">02</span>
              Federated Learning Engine
            </h2>
            <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm space-y-6">
              <div className="prose prose-neutral max-w-none">
                <p className="text-black/70 leading-relaxed mb-6">
                  Our FL architecture allows multiple hospital nodes to collaboratively train a global disease risk model. 
                  The central server only coordinates the training rounds and aggregates weights.
                </p>
                <div className="bg-[#0A0A0B] rounded-xl p-6 font-mono text-sm text-gray-300 overflow-x-auto">
                  <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"/>
                    <div className="w-2 h-2 rounded-full bg-yellow-500"/>
                    <div className="w-2 h-2 rounded-full bg-green-500"/>
                    <span className="ml-2 text-white/50">federation_config.yml</span>
                  </div>
                  <pre>
{`# BioTeK Federated Learning Configuration
strategy: FedAvg (Federated Averaging)
min_clients: 3

# Default Hospital Nodes:
- Boston General Hospital: 1,000 patients
- NYC Medical Center: 800 patients  
- LA University Hospital: 1,200 patients

training_rounds: 5
local_model: LogisticRegression (max_iter=100)
aggregation: Weighted average by sample count

# Privacy Guarantee:
data_shared: NONE (only model weights)`}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          {/* Differential Privacy */}
          <section id="privacy" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm">03</span>
              Differential Privacy
            </h2>
            <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm space-y-6">
              <p className="text-black/70 leading-relaxed">
                We implement $(\epsilon, \delta)$-differential privacy to guarantee that the output of the model does not reveal 
                whether any specific individual's data was included in the training set.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] bg-black/[0.03] p-6 rounded-2xl border border-black/5">
                  <div className="text-3xl font-bold text-black mb-1">ε = 3.0</div>
                  <div className="text-sm text-black/50">Privacy Budget</div>
                </div>
                <div className="flex-1 min-w-[200px] bg-black/[0.03] p-6 rounded-2xl border border-black/5">
                  <div className="text-3xl font-bold text-black mb-1">Laplace</div>
                  <div className="text-sm text-black/50">Noise Mechanism</div>
                </div>
                <div className="flex-1 min-w-[200px] bg-black/[0.03] p-6 rounded-2xl border border-black/5">
                  <div className="text-3xl font-bold text-black mb-1">10^-5</div>
                  <div className="text-sm text-black/50">Delta (δ)</div>
                </div>
              </div>
            </div>
          </section>

          {/* AI Models */}
          <section id="risk-model" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm">04</span>
              Multi-Disease Prediction Models
            </h2>
            <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm space-y-6">
              <p className="text-black/70 leading-relaxed">
                BioTeK uses 12 disease-specific XGBoost + LightGBM ensemble models (v2.0.0), each trained on real medical datasets 
                from UCI, Kaggle, and clinical repositories. Average accuracy across all models is 85%.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-black mb-4">Diseases Covered</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      'Type 2 Diabetes', 'Coronary Heart Disease', 'Hypertension', 
                      'Chronic Kidney Disease', 'Fatty Liver (NAFLD)', 'Stroke',
                      'Heart Failure', 'Atrial Fibrillation', 'COPD',
                      'Breast Cancer', 'Colorectal Cancer', "Alzheimer's"
                    ].map((d) => (
                      <div key={d} className="flex items-center gap-2 text-black/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"/>
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-4">Feature Categories (55 total)</h3>
                  <div className="space-y-2 text-sm">
                    {[
                      { cat: 'Demographics', n: 5 },
                      { cat: 'Metabolic Panel', n: 8 },
                      { cat: 'Liver Panel', n: 6 },
                      { cat: 'Kidney Panel', n: 5 },
                      { cat: 'Cardiac Markers', n: 4 },
                      { cat: 'Inflammatory', n: 5 },
                      { cat: 'Blood Panel', n: 6 },
                      { cat: 'Vitals', n: 4 },
                      { cat: 'Lifestyle', n: 4 },
                      { cat: 'Hormonal', n: 3 },
                      { cat: 'Genetic PRS', n: 5 },
                    ].map((item) => (
                      <div key={item.cat} className="flex justify-between text-black/60">
                        <span>{item.cat}</span>
                        <span className="font-mono">{item.n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-black/[0.03] p-6 rounded-2xl">
                <h4 className="font-bold text-black mb-3">Ensemble Architecture (v2.0.0)</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-mono text-black">XGBoost</div>
                    <div className="text-black/50">50% weight • 200 trees</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-black">LightGBM</div>
                    <div className="text-black/50">50% weight • 200 trees</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-black/10 text-xs text-black/50">
                  Trained on real medical datasets: UCI Heart Disease, Pima Diabetes, Framingham, CKD dataset, and more.
                </div>
              </div>
            </div>
          </section>

          {/* Genetic Risk Panels */}
          <section id="genetics" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm">05</span>
              Polygenic Risk Score Panels
            </h2>
            <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm space-y-6">
              <p className="text-black/70 leading-relaxed">
                Five disease-category PRS panels with 59 real GWAS-validated SNPs from published research.
              </p>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Metabolic', snps: 12, diseases: 'T2D, Obesity, NAFLD' },
                  { name: 'Cardiovascular', snps: 12, diseases: 'CAD, Stroke, AF, HTN' },
                  { name: 'Cancer', snps: 12, diseases: 'Breast, Colorectal, Prostate' },
                  { name: 'Neurological', snps: 12, diseases: "Alzheimer's, Parkinson's" },
                  { name: 'Autoimmune', snps: 11, diseases: 'T1D, RA, Lupus, Celiac' },
                ].map((panel) => (
                  <div key={panel.name} className="bg-black/[0.03] p-4 rounded-xl">
                    <div className="font-bold text-black">{panel.name}</div>
                    <div className="text-xs text-black/50 mt-1">{panel.snps} SNPs</div>
                    <div className="text-xs text-black/40 mt-2">{panel.diseases}</div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-amber-600">⚠️</span>
                  <div className="text-sm text-amber-800">
                    <strong>Ancestry Note:</strong> PRS models were developed primarily on European populations. 
                    Predictive accuracy may be reduced for other ancestries (60-80% of EUR performance).
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Clinical LLM */}
          <section id="clinical-llm" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm">06</span>
              Clinical Assistant (LLM)
            </h2>
            <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm space-y-6">
              <p className="text-black/70 leading-relaxed">
                We utilize <strong>Qwen3-8B</strong> running locally via Ollama at <code className="bg-black/5 px-2 py-0.5 rounded text-sm">localhost:11434</code>. 
                This allows for natural language generation of clinical reports without sending sensitive patient context to external cloud providers.
              </p>
              <div className="bg-stone-50 border border-stone-200 p-6 rounded-2xl flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 text-black">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-black text-sm mb-1">Why Local Inference?</h4>
                  <p className="text-sm text-black/70">
                    By running the LLM on the hospital's own hardware (on-premise), we eliminate the risk of data leakage via API calls. 
                    This ensures compliance with GDPR and HIPAA regulations regarding data sovereignty.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SHAP Explainability */}
          <section id="explainability" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm">06</span>
              SHAP Explainability
            </h2>
            <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm space-y-6">
              <p className="text-black/70 leading-relaxed">
                We use <strong>SHAP (SHapley Additive exPlanations)</strong> to provide transparent, interpretable explanations for each prediction. 
                SHAP values are computed using a TreeExplainer optimized for our RandomForest model.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-black/[0.03] p-6 rounded-2xl">
                  <div className="font-bold text-black mb-2">How It Works</div>
                  <p className="text-sm text-black/60">
                    SHAP assigns each feature a contribution score based on game theory (Shapley values). 
                    Features with higher absolute SHAP values have more influence on the prediction.
                  </p>
                </div>
                <div className="bg-black/[0.03] p-6 rounded-2xl">
                  <div className="font-bold text-black mb-2">Medical Knowledge RAG</div>
                  <p className="text-sm text-black/60">
                    Feature importances are combined with a medical knowledge base (7 entries) to generate 
                    human-readable explanations of clinical significance.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Encryption Standards */}
          <section id="encryption" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm">07</span>
              Encryption Standards
            </h2>
            <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-black">Data at Rest</h3>
                  <div className="bg-black/[0.03] p-4 rounded-xl">
                    <div className="font-mono text-sm text-black/80">AES-256</div>
                    <div className="text-xs text-black/50 mt-1">Sensitive fields encrypted in SQLite database</div>
                  </div>
                  <div className="bg-black/[0.03] p-4 rounded-xl">
                    <div className="font-mono text-sm text-black/80">bcrypt</div>
                    <div className="text-xs text-black/50 mt-1">Password hashing with salt rounds</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-black">Data in Transit</h3>
                  <div className="bg-black/[0.03] p-4 rounded-xl">
                    <div className="font-mono text-sm text-black/80">TLS 1.3</div>
                    <div className="text-xs text-black/50 mt-1">All API communications encrypted</div>
                  </div>
                  <div className="bg-black/[0.03] p-4 rounded-xl">
                    <div className="font-mono text-sm text-black/80">HTTPS</div>
                    <div className="text-xs text-black/50 mt-1">Frontend-backend communication</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* RBAC & Audit Logs */}
          <section id="access-control" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm">08</span>
              RBAC & Audit Logs
            </h2>
            <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-black mb-4">Role-Based Access Control</h3>
                  <div className="space-y-2">
                    {[
                      { role: 'Doctor', access: 'Full patient data + predictions + genetics' },
                      { role: 'Nurse', access: 'Clinical data, no genetic access' },
                      { role: 'Researcher', access: 'Anonymized data for studies' },
                      { role: 'Receptionist', access: 'Demographics only' },
                      { role: 'Admin', access: 'System management, user creation' },
                    ].map((item) => (
                      <div key={item.role} className="flex items-start gap-3 text-sm">
                        <span className="font-mono bg-black/5 px-2 py-0.5 rounded text-black/70 flex-shrink-0">{item.role}</span>
                        <span className="text-black/60">{item.access}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-4">Audit Trail</h3>
                  <p className="text-sm text-black/60 mb-4">
                    Every action is logged to SQLite with timestamp, user ID, role, action type, and patient ID (if applicable).
                  </p>
                  <div className="bg-[#0A0A0B] rounded-xl p-4 font-mono text-xs text-gray-400">
                    <div className="text-green-400">// Sample audit entry</div>
                    <div>{`{`}</div>
                    <div className="pl-4">"timestamp": "2025-12-16T14:30:00",</div>
                    <div className="pl-4">"user_id": "doctor_DOC001",</div>
                    <div className="pl-4">"action": "run_prediction",</div>
                    <div className="pl-4">"patient_id": "PAT-123456",</div>
                    <div className="pl-4">"genetics_used": true</div>
                    <div>{`}`}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-12 border-t border-black/10 text-center text-black/40 text-sm">
            BioTeK Documentation · Model v2.0.0 · XGBoost+LightGBM Ensemble · Updated Dec 2025
          </div>
        </div>
      </div>
    </main>
  );
}
