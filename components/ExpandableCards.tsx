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
    title: 'Evo 2 DNA Foundation Model',
    description: 'NVIDIA NIM-powered 40B parameter biological foundation model for comprehensive DNA analysis',
    features: [
      'DNA sequence analysis with single-nucleotide sensitivity',
      'Variant effect prediction and pathogenicity scoring',
      'Gene and protein sequence design capabilities',
      'Support for all domains of life (human, mouse, E.coli, yeast)'
    ],
    image: '/images/privacy-card.png',
    bgColor: '#E8DDD0'
  },
  {
    id: 2,
    title: 'Multi-Disease Risk Prediction',
    description: 'ML ensemble predicting 13 chronic diseases with calibrated probabilities',
    features: [
      '83% average AUC across all disease models',
      '13 disease models: diabetes, heart disease, stroke, cancer & more',
      'AI Treatment Optimizer with evidence-based protocols',
      'Calibrated confidence intervals and risk trajectories'
    ],
    image: '/images/genomic-card.png',
    bgColor: '#D5E0DD'
  },
  {
    id: 3,
    title: 'GLM-4.5V Medical Vision AI',
    description: 'Advanced vision-language model for medical imaging and clinical document analysis',
    features: [
      'X-ray, CT, MRI, and pathology image interpretation',
      'Clinical document OCR and structured data extraction',
      'Deep reasoning mode for complex diagnostic cases',
      'AI Research Assistant for patient-specific insights'
    ],
    image: '/images/ChatGPT Image Nov 10, 2025, 08_09_36 AM.png',
    bgColor: '#DDD9E3'
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
