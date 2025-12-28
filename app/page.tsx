'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import ExpandableCards from '@/components/ExpandableCards';
import WorkflowCards from '@/components/WorkflowCards';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#f3e7d9' }}>
      
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="backdrop-blur-md rounded-2xl px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)', border: 'none' }}>
            <div className="flex items-center gap-3">
              <Image 
                src="/images/ChatGPT Image Nov 10, 2025, 08_09_36 AM.png" 
                alt="BioTeK"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-xl font-bold tracking-tight">BioTeK</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a href="#features" className="text-black/60 hover:text-black transition-colors">Features</a>
              <a href="#privacy" className="text-black/60 hover:text-black transition-colors">Privacy</a>
              <Link href="/docs" className="text-black/60 hover:text-black transition-colors">Technology</Link>
            </div>
            
            <div className="flex items-center gap-3">
              <Link href="/login">
                <button className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-black/80 hover:scale-105 transition-all shadow-lg shadow-black/10">
                  Sign In
                </button>
              </Link>
              
              <Link href="/admin/login">
                <button className="bg-white text-black border border-black/10 px-4 py-2.5 rounded-full text-xs font-medium hover:bg-gray-50 hover:border-black/20 transition-all flex items-center gap-2 shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Admin</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center px-6 pt-32 pb-20">
        <div className="max-w-7xl mx-auto w-full">
          {/* Text Content */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8 z-10 max-w-2xl"
          >
            <div className="inline-block">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="glass-dark px-4 py-2 rounded-full text-xs font-medium text-black inline-flex items-center gap-2"
              >
                <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
                Privacy-Preserving AI Platform
              </motion.div>
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight text-black">
              <span className="block">AI for</span>
              <span className="block">Ethical</span>
              <span className="block">Genomics</span>
            </h1>
            
            <p className="text-lg md:text-xl text-black/60 max-w-xl leading-relaxed">
              Predict disease risk from genetic and clinical data without compromising patient privacy. 
              Built on federated learning and differential privacy.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link href="/login">
                <button className="bg-black/90 backdrop-blur-md text-white px-8 py-4 rounded-full font-medium hover:bg-black transition-all group shadow-xl shadow-black/5 hover:scale-105 hover:shadow-2xl hover:shadow-black/10">
                  <span className="flex items-center gap-2">
                    Access Platform
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-black">ε=3.0</div>
                <div className="text-sm text-black/50">Privacy Budget</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-black">78%</div>
                <div className="text-sm text-black/50">Model Accuracy</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-black">SHAP</div>
                <div className="text-sm text-black/50">Explainability</div>
              </div>
            </div>
          </motion.div>

        </div>
        
        {/* Logo - Positioned top right */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute top-12 right-0 lg:right-6 w-[450px] lg:w-[650px] pointer-events-none flex items-center justify-center"
        >
          <Image
            src="/images/ChatGPT Image Nov 19, 2025, 04_07_56 PM.png"
            alt="BioTeK DNA"
            width={800}
            height={800}
            className="w-full h-auto opacity-90"
            priority
          />
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-black">
              Enterprise-Grade Clinical AI
            </h2>
            <p className="text-xl text-black/60 max-w-2xl mx-auto">
              Privacy-first architecture combined with genomic risk analysis and complete model transparency
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <ExpandableCards />
          </motion.div>
        </div>
      </section>

      {/* Video Section */}
      <section className="relative py-24 px-6 border-t border-black/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-black leading-tight">
                Privacy-preserving AI for precision genomic medicine
              </h2>
              <p className="text-lg text-black/60 leading-relaxed">
                BioTeK combines federated learning, differential privacy, and genomic risk analysis 
                to deliver accurate disease predictions without compromising patient data. 
                Built for hospitals, clinics, and research institutions.
              </p>
            </motion.div>

            {/* Right: Video Player - Seamless */}
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16 / 9' }}>
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                >
                  <source src="/images/biotek vid.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Clinical Platform Section */}
      <section className="relative py-24 px-6 border-t border-black/10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
              How It Works
            </h2>
            <p className="text-lg text-black/60 max-w-3xl mx-auto">
              From patient selection to clinical decision in four simple steps
            </p>
          </motion.div>

          <WorkflowCards />
        </div>
      </section>

      {/* Privacy Section */}
      <section id="privacy" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-black mb-4">
              Privacy by Design
            </h2>
            <p className="text-xl text-black/60 max-w-3xl mx-auto">
              Your data never leaves its source. We use federated learning to train models 
              across distributed hospital nodes without centralizing sensitive information.
            </p>
          </motion.div>

          {/* Privacy Stats Grid */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
          >
            {[
              { label: 'Privacy Budget', value: 'ε = 3.0', desc: 'Differential privacy' },
              { label: 'Data Encryption', value: 'E2E', desc: 'AES-256 security' },
              { label: 'Federated Nodes', value: '3+', desc: 'Hospital sites' },
              { label: 'Local Training', value: '100%', desc: 'No data sharing' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 border border-black/5 shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="text-4xl font-bold text-black mb-2 group-hover:scale-105 transition-transform origin-left">{stat.value}</div>
                <div className="text-sm font-semibold text-black/80 mb-1">{stat.label}</div>
                <div className="text-xs text-black/50 font-medium">{stat.desc}</div>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Features Cards */}
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {privacyFeatures.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm hover:shadow-lg transition-all group cursor-default"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-black/[0.03] group-hover:bg-black group-hover:text-white flex items-center justify-center flex-shrink-0 transition-colors duration-300">
                      {/* Icons based on title */}
                      {i === 0 && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      )}
                      {i === 1 && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                      {i === 2 && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      )}
                      {i === 3 && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="font-bold text-lg text-black mb-1">{item.title}</div>
                      <div className="text-sm text-black/60 leading-relaxed">{item.description}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Federation Dashboard */}
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white rounded-3xl p-1 shadow-2xl overflow-hidden border border-black/5">
                {/* Dashboard Header */}
                <div className="bg-black/[0.02] px-6 py-4 flex items-center justify-between border-b border-black/5">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="h-4 w-[1px] bg-black/10 mx-1" />
                    <span className="text-xs font-mono text-black/40">biotek-federation-cli — v2.4.0</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-600">Connected</span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono text-black/40 mb-1">GLOBAL MODEL STATUS</div>
                      <div className="text-xl font-bold text-black tracking-tight">System Operational</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-black/40 mb-1">CURRENT ROUND</div>
                      <div className="text-xl font-mono text-black">#4,291</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { name: 'Hospital Node A', status: 'Training', sync: '98%', patients: '1,240', latency: '24ms' },
                      { name: 'Hospital Node B', status: 'Syncing', sync: '45%', patients: '890', latency: '41ms' },
                      { name: 'Hospital Node C', status: 'Idle', sync: '100%', patients: '1,100', latency: '18ms' },
                    ].map((node, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
                        viewport={{ once: true }}
                        className="bg-black/[0.03] rounded-xl p-4 border border-black/5 hover:bg-black/[0.05] transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${node.status === 'Training' ? 'bg-blue-500 animate-pulse' : node.status === 'Syncing' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            <span className="font-mono text-sm text-black/80">{node.name}</span>
                          </div>
                          <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded text-black/50 shadow-sm border border-black/5">{node.latency}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-black/40">{node.status.toUpperCase()}</span>
                            <span className="text-black/60">{node.sync}</span>
                          </div>
                          <div className="h-1 bg-black/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: node.sync === '100%' ? '100%' : node.sync }}
                              transition={{ duration: 1.5, delay: 0.5 + i * 0.1, ease: "easeOut" }}
                              viewport={{ once: true }}
                              className={`h-full rounded-full ${node.status === 'Training' ? 'bg-blue-500' : node.status === 'Syncing' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="pt-2 border-t border-black/5 flex justify-between text-[10px] font-mono text-black/30">
                    <span>ENCRYPTION: AES-256-GCM</span>
                    <span>PROTOCOL: GRPC/TLS 1.3</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-black/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image 
              src="/images/ChatGPT Image Nov 10, 2025, 08_09_36 AM.png" 
              alt="BioTeK"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-bold text-black">BioTeK</span>
            <span className="text-black/30">·</span>
            <span className="text-sm text-black/50">AI for Ethical Genomics</span>
          </div>
          <div className="text-sm text-black/50">
            University Research Project · Not for Clinical Use
          </div>
        </div>
      </footer>
    </main>
  );
}

const features = [
  {
    icon: '🧬',
    title: 'Genomic Risk Prediction',
    description: 'RandomForest-powered disease risk assessment using polygenic risk scores and clinical data.',
  },
  {
    icon: '🔒',
    title: 'Federated Learning',
    description: 'Train models across distributed hospital nodes without centralizing patient data.',
  },
  {
    icon: '🎯',
    title: 'SHAP Explainability',
    description: 'Understand which features drive predictions with transparent, interpretable AI explanations.',
  },
  {
    icon: '🛡️',
    title: 'Differential Privacy',
    description: 'Add calibrated noise to protect individual privacy while maintaining utility.',
  },
  {
    icon: '📊',
    title: 'Audit Trail',
    description: 'Complete logging of consent decisions, model versions, and privacy parameters.',
  },
  {
    icon: '⚡',
    title: 'Real-Time Analysis',
    description: 'Instant predictions with what-if scenario testing for clinical decision support.',
  },
];

const privacyFeatures = [
  {
    title: 'Federated Training',
    description: 'Models trained locally at each hospital, only model updates are shared',
  },
  {
    title: 'Differential Privacy',
    description: 'Mathematical guarantees that individual data cannot be reverse-engineered',
  },
  {
    title: 'Encrypted Communication',
    description: 'All data transmission secured with end-to-end encryption',
  },
  {
    title: 'Consent Management',
    description: 'Granular control over genetic data usage with full audit trail',
  },
];

const technologies = [
  { icon: '⚡', name: 'RandomForest' },
  { icon: '🔍', name: 'SHAP' },
  { icon: '🔐', name: 'Diff Privacy' },
  { icon: '🌐', name: 'Federation' },
];
