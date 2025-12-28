'use client';

import { motion } from 'framer-motion';

interface FeatureImportanceProps {
  importance: Record<string, number>;
}

export default function FeatureImportance({ importance }: FeatureImportanceProps) {
  // Sort features by importance
  const sortedFeatures = Object.entries(importance || {})
    .sort(([, a], [, b]) => b - a)
    .map(([feature, value]) => ({
      name: getFeatureName(feature),
      value: value,
      percentage: value * 100
    }));

  function getFeatureName(feature: string): string {
    const names: Record<string, string> = {
      age: 'Age',
      bmi: 'BMI',
      hba1c: 'HbA1c',
      ldl: 'LDL Cholesterol',
      smoking: 'Smoking Status',
      prs: 'Genetic Risk (PRS)',
      sex: 'Biological Sex'
    };
    return names[feature] || feature;
  }

  function getFeatureColor(index: number): string {
    const colors = [
      '#000000',  // black
      '#404040',  // dark gray
      '#606060',  // medium gray
      '#808080',  // gray
      '#a0a0a0',  // light gray
      '#c0c0c0',  // lighter gray
      '#d0d0d0',  // very light gray
    ];
    return colors[index] || '#e0e0e0';
  }

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black mb-2">Feature Importance</h2>
        <p className="text-sm text-black/60">
          Relative contribution of each factor to the prediction
        </p>
      </div>

      <div className="space-y-4">
        {sortedFeatures.length > 0 ? (
          sortedFeatures.map((feature, index) => (
            <div key={feature.name}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-black">{feature.name}</span>
                <span className="text-sm text-black/60">{feature.percentage.toFixed(1)}%</span>
              </div>
              <div className="relative h-3 bg-black/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${feature.percentage}%` }}
                  transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: getFeatureColor(index) }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-black/40">
            No feature importance data available
          </div>
        )}
      </div>

      {/* Explainability Note */}
      <div className="mt-6 p-4 bg-black/5 rounded-xl">
        <p className="text-xs text-black/70">
          <strong>Model Explainability:</strong> Feature importance scores indicate how much each clinical and genetic factor contributed to this specific prediction. Higher scores mean greater influence on the risk assessment.
        </p>
      </div>
    </div>
  );
}
