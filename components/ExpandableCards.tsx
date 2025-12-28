'use client';

import Image from 'next/image';

interface Card {
  id: number;
  title: string;
  description: string;
  features: string[];
  image: string;
  bgColor: string;
}

const cards: Card[] = [
  {
    id: 1,
    title: 'Privacy-First Architecture',
    description: 'Advanced privacy-preserving AI that keeps patient data secure through federated learning and differential privacy',
    features: [
      'Federated learning across distributed hospital nodes',
      'Differential privacy with ε=3.0 mathematical guarantees',
      'End-to-end encryption for all data transmission',
      'Research-grade governance and full auditability'
    ],
    image: '/images/privacy-card.png',
    bgColor: '#E8DDD0' // Warm beige like Anthropic
  },
  {
    id: 2,
    title: 'Genomic Intelligence',
    description: 'Cutting-edge AI to quantify genetic and clinical risk factors with machine learning precision',
    features: [
      'RandomForest ensemble with 78% prediction accuracy',
      'Polygenic risk score integration from 100+ genetic variants',
      'What-if scenario testing for intervention planning',
      'Real-time risk assessment with sub-second latency'
    ],
    image: '/images/genomic-card.png',
    bgColor: '#D5E0DD' // Muted sage/gray-green
  },
  {
    id: 3,
    title: 'AI Explainability',
    description: 'Understand every prediction with research-grade explainability and natural language generation',
    features: [
      'SHAP values for individual feature contributions',
      'Clinical knowledge retrieval for contextual explanations',
      'Local language model for structured clinical reports',
      'Calibrated confidence intervals for uncertainty'
    ],
    image: '/images/ChatGPT Image Nov 10, 2025, 08_09_36 AM.png',
    bgColor: '#DDD9E3' // Muted lavender/gray
  }
];

export default function ExpandableCards() {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cards.map((card) => (
          <div
            key={card.id}
            className="group relative h-[400px] overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-shadow duration-500"
          >
            {/* Image Panel - visible by default, slides right on hover */}
            <div 
              className="absolute inset-0 z-10 transition-transform duration-500 ease-in-out group-hover:translate-x-full"
              style={{ backgroundColor: card.bgColor }}
            >
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="relative w-full h-full" style={{ filter: card.id === 3 ? 'contrast(1.3) brightness(0.85)' : 'none' }}>
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className="object-contain mix-blend-multiply"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized
                  />
                </div>
              </div>
            </div>

            {/* Content Panel - hidden by default, slides in from left on hover */}
            <div 
              className="absolute inset-0 bg-black/90 backdrop-blur-sm -translate-x-full transition-all duration-500 ease-in-out group-hover:translate-x-0"
            >
              <div className="h-full flex flex-col justify-between p-8">
                {/* Title */}
                <h3 className="text-2xl font-bold text-white">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="text-white/80 text-sm leading-relaxed">
                  {card.description}
                </p>

                {/* Features */}
                <div className="space-y-2">
                  {card.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-white/70 text-xs">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full text-sm font-medium transition-colors">
                  Learn More →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hover hint */}
      <div className="text-center mt-8 text-black/60 text-sm font-medium">
        Hover over cards to reveal details
      </div>
    </div>
  );
}
