'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const MODEL_CARDS = [
  {
    disease: 'Type 2 Diabetes',
    id: 'type2_diabetes',
    auc: 0.89,
    samples: 101766,
    dataSource: 'UCI Diabetes 130 Hospitals',
    features: ['HbA1c', 'BMI', 'Age', 'Blood Pressure'],
    limitations: [
      'Trained primarily on US hospital data',
      'May underperform for gestational diabetes',
      'Requires lab values not always available'
    ],
    fairness: {
      sexParity: true,
      ageGroups: 'Validated 30-80 years',
      ancestry: 'Primarily European/African American'
    }
  },
  {
    disease: 'Coronary Heart Disease',
    id: 'coronary_heart_disease',
    auc: 0.87,
    samples: 4240,
    dataSource: 'Framingham Heart Study',
    features: ['Cholesterol', 'Blood Pressure', 'Smoking', 'Age'],
    limitations: [
      'Framingham cohort predominantly white',
      'May overestimate risk in Asian populations',
      'Validated for 10-year risk prediction'
    ],
    fairness: {
      sexParity: true,
      ageGroups: 'Validated 30-74 years',
      ancestry: 'Primarily European descent'
    }
  },
  {
    disease: 'Breast Cancer',
    id: 'breast_cancer',
    auc: 0.95,
    samples: 569,
    dataSource: 'Wisconsin Breast Cancer Dataset',
    features: ['Cell morphology', 'Age', 'Family History'],
    limitations: [
      'Female-only applicability',
      'Based on cell biopsy features',
      'Not a screening tool - requires clinical workup'
    ],
    fairness: {
      sexParity: false,
      sexNote: 'Female-only by design',
      ageGroups: 'All adult ages',
      ancestry: 'Limited diversity data'
    }
  },
  {
    disease: 'Prostate Cancer',
    id: 'prostate_cancer',
    auc: 0.82,
    samples: 500,
    dataSource: 'Kaggle Prostate Cancer Dataset',
    features: ['PSA', 'Age', 'Family History', 'Race'],
    limitations: [
      'Male-only applicability',
      'PSA has known limitations as a biomarker',
      'Higher false positive rate in older men'
    ],
    fairness: {
      sexParity: false,
      sexNote: 'Male-only by design',
      ageGroups: 'Validated 50+ years',
      ancestry: 'Higher risk in African American men - model accounts for this'
    }
  },
  {
    disease: "Alzheimer's Disease",
    id: 'alzheimers_disease',
    auc: 0.78,
    samples: 2149,
    dataSource: 'OASIS Brain MRI Dataset',
    features: ['Age', 'Cognitive scores', 'Brain volume', 'Education'],
    limitations: [
      'Early-stage detection challenging',
      'Cognitive tests have cultural bias',
      'MRI features not always available'
    ],
    fairness: {
      sexParity: true,
      ageGroups: 'Validated 60+ years',
      ancestry: 'Limited non-Western data'
    }
  },
  {
    disease: 'Chronic Kidney Disease',
    id: 'chronic_kidney_disease',
    auc: 0.98,
    samples: 400,
    dataSource: 'UCI CKD Dataset',
    features: ['eGFR', 'Creatinine', 'Blood Pressure', 'Diabetes status'],
    limitations: [
      'eGFR formulas have known racial bias',
      'We use CKD-EPI 2021 (race-free) equation',
      'Small training dataset'
    ],
    fairness: {
      sexParity: true,
      ageGroups: 'All adult ages',
      ancestry: 'Race-free eGFR equation used'
    }
  }
];

const ETHICAL_PRINCIPLES = [
  {
    icon: '🔒',
    title: 'Privacy by Design',
    description: 'Patient data never leaves the local hospital. We use federated learning and differential privacy (ε=3.0) to train models without exposing individual records.',
    implementation: [
      'Federated learning - only model weights shared',
      'Differential privacy with Laplace noise',
      'Local LLM option for zero cloud dependency',
      'AES-256 encryption at rest'
    ]
  },
  {
    icon: '✋',
    title: 'Consent-First',
    description: 'Granular, informed consent with clear explanations. Patients control exactly what data is used and can revoke consent at any time.',
    implementation: [
      'Separate consent for genetic, imaging, research',
      'Plain-language explanations',
      'One-click revocation',
      'Consent versioning and audit trail'
    ]
  },
  {
    icon: '⚖️',
    title: 'Fairness & Bias Awareness',
    description: 'We acknowledge model limitations across demographics and implement safeguards to prevent discriminatory outcomes.',
    implementation: [
      'Sex-specific applicability gates',
      'Ancestry warnings for PRS scores',
      'Per-demographic performance tracking',
      'Race-free eGFR calculations'
    ]
  },
  {
    icon: '🔍',
    title: 'Transparency & Explainability',
    description: 'Every prediction comes with SHAP-based explanations showing which factors contributed to the risk score.',
    implementation: [
      'SHAP TreeExplainer for all models',
      'Feature importance rankings',
      'Confidence intervals displayed',
      'Model cards for each disease'
    ]
  },
  {
    icon: '👨‍⚕️',
    title: 'Human Oversight',
    description: 'AI assists but never replaces clinical judgment. All predictions require physician review before any clinical action.',
    implementation: [
      'Predictions marked as "decision support only"',
      'Doctor approval required for treatment plans',
      'Encounter-based access control',
      'Break-glass emergency protocols'
    ]
  },
  {
    icon: '📋',
    title: 'Accountability',
    description: 'Complete audit trail of every access, prediction, and decision. Full compliance with HIPAA and GDPR requirements.',
    implementation: [
      'Immutable audit logs',
      'IP and user agent tracking',
      'Right to access (GDPR Art. 15)',
      'Right to deletion (GDPR Art. 17)'
    ]
  }
];

const AI_LIMITATIONS = [
  {
    category: 'General Limitations',
    items: [
      'AI predictions are probabilistic estimates, not diagnoses',
      'Models trained on historical data may not reflect current medical knowledge',
      'Performance varies across demographic groups',
      'Rare conditions may be underrepresented in training data'
    ]
  },
  {
    category: 'Data Quality',
    items: [
      'Predictions depend on accuracy of input data',
      'Missing values are imputed, which introduces uncertainty',
      'Lab value timing affects prediction accuracy',
      'Self-reported data (smoking, alcohol) may be inaccurate'
    ]
  },
  {
    category: 'Clinical Context',
    items: [
      'Models do not account for all comorbidities',
      'Medication interactions not fully modeled',
      'Recent lifestyle changes may not be reflected',
      'Family history quality varies by patient'
    ]
  },
  {
    category: 'Genetic Data',
    items: [
      'PRS models validated primarily on European ancestry',
      'Predictive accuracy reduced 20-40% for other ancestries',
      'Not all disease-relevant variants are included',
      'Gene-environment interactions not fully captured'
    ]
  }
];

export default function EthicsPage() {
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
            <span className="font-bold text-black text-lg">BioTeK Ethics</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/docs">
              <button className="text-sm font-medium text-black/60 hover:text-black transition-colors">
                Technical Docs
              </button>
            </Link>
            <Link href="/">
              <button className="text-sm font-medium text-black/60 hover:text-black transition-colors">
                ← Back to Platform
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-6">AI Ethics & Governance</h1>
          <p className="text-xl text-black/60 leading-relaxed max-w-3xl">
            BioTeK is built on the principle that AI in healthcare must be ethical, transparent, and accountable. 
            This page documents our commitments, limitations, and safeguards.
          </p>
          
          {/* Quick badges */}
          <div className="flex flex-wrap gap-3 mt-8">
            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              HIPAA Compliant Design
            </span>
            <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
              GDPR Ready
            </span>
            <span className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium">
              EU AI Act Aligned
            </span>
            <span className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
              Differential Privacy ε=3.0
            </span>
          </div>
        </motion.section>

        {/* Ethical Principles */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-black mb-8">Our Ethical Principles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ETHICAL_PRINCIPLES.map((principle, idx) => (
              <motion.div
                key={principle.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm"
              >
                <div className="text-3xl mb-3">{principle.icon}</div>
                <h3 className="font-bold text-black mb-2">{principle.title}</h3>
                <p className="text-sm text-black/60 mb-4">{principle.description}</p>
                <ul className="space-y-1">
                  {principle.implementation.map((item, i) => (
                    <li key={i} className="text-xs text-black/50 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* AI Limitations - Critical Disclosure */}
        <section className="mb-16">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">⚠️</span>
              <h2 className="text-2xl font-bold text-amber-900">AI Limitations & Disclosures</h2>
            </div>
            <p className="text-amber-800 mb-6">
              <strong>Important:</strong> BioTeK provides decision support tools only. 
              AI predictions are not medical diagnoses and must be interpreted by qualified healthcare professionals.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {AI_LIMITATIONS.map((section) => (
                <div key={section.category} className="bg-white/50 rounded-xl p-4">
                  <h3 className="font-bold text-amber-900 mb-3">{section.category}</h3>
                  <ul className="space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Model Cards */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-black mb-4">Model Cards</h2>
          <p className="text-black/60 mb-8">
            Detailed documentation for each disease prediction model, following the 
            <a href="https://arxiv.org/abs/1810.03993" target="_blank" rel="noopener" className="text-blue-600 hover:underline ml-1">
              Model Cards framework (Mitchell et al., 2019)
            </a>.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {MODEL_CARDS.map((card, idx) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden"
              >
                <div className="bg-black/[0.03] px-6 py-4 border-b border-black/5">
                  <h3 className="font-bold text-black">{card.disease}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-green-600 font-mono">AUC: {card.auc.toFixed(2)}</span>
                    <span className="text-black/50">n={card.samples.toLocaleString()}</span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="text-xs font-medium text-black/40 uppercase mb-1">Data Source</div>
                    <div className="text-sm text-black/70">{card.dataSource}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-black/40 uppercase mb-1">Key Features</div>
                    <div className="flex flex-wrap gap-1">
                      {card.features.map((f) => (
                        <span key={f} className="bg-black/5 px-2 py-0.5 rounded text-xs text-black/60">{f}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-black/40 uppercase mb-1">Limitations</div>
                    <ul className="space-y-1">
                      {card.limitations.map((l, i) => (
                        <li key={i} className="text-xs text-black/50 flex items-start gap-1">
                          <span className="text-amber-500">!</span> {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-black/40 uppercase mb-1">Fairness Evaluation</div>
                    <div className="text-xs text-black/60 space-y-1">
                      <div>
                        <span className="font-medium">Sex parity:</span>{' '}
                        {card.fairness.sexParity ? (
                          <span className="text-green-600">✓ Validated</span>
                        ) : (
                          <span className="text-amber-600">{card.fairness.sexNote}</span>
                        )}
                      </div>
                      <div><span className="font-medium">Age:</span> {card.fairness.ageGroups}</div>
                      <div><span className="font-medium">Ancestry:</span> {card.fairness.ancestry}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Patient Rights */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-black mb-8">Your Data Rights</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { right: 'Right to Access', article: 'GDPR Art. 15', desc: 'Request a copy of all your data', icon: '📄' },
              { right: 'Right to Rectification', article: 'GDPR Art. 16', desc: 'Correct inaccurate personal data', icon: '✏️' },
              { right: 'Right to Deletion', article: 'GDPR Art. 17', desc: 'Request erasure of your data', icon: '🗑️' },
              { right: 'Right to Portability', article: 'GDPR Art. 20', desc: 'Export your data in standard format', icon: '📦' },
            ].map((item) => (
              <div key={item.right} className="bg-white rounded-xl p-5 border border-black/5">
                <div className="text-2xl mb-2">{item.icon}</div>
                <h3 className="font-bold text-black text-sm">{item.right}</h3>
                <div className="text-xs text-blue-600 mb-2">{item.article}</div>
                <p className="text-xs text-black/50">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact & Governance */}
        <section className="mb-16">
          <div className="bg-black text-white rounded-3xl p-8">
            <h2 className="text-2xl font-bold mb-4">AI Governance Contact</h2>
            <p className="text-white/70 mb-6">
              For questions about our AI ethics practices, data handling, or to exercise your data rights:
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-white/50 text-sm mb-1">Data Protection Officer</div>
                <div className="font-medium">privacy@biotek.health</div>
              </div>
              <div>
                <div className="text-white/50 text-sm mb-1">AI Ethics Committee</div>
                <div className="font-medium">ethics@biotek.health</div>
              </div>
              <div>
                <div className="text-white/50 text-sm mb-1">Report a Concern</div>
                <div className="font-medium">concerns@biotek.health</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-black/40 text-sm pt-8 border-t border-black/10">
          BioTeK AI Ethics Documentation · Last Updated: January 2026 · Version 1.0
        </div>
      </div>
    </main>
  );
}
