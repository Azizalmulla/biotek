'use client';

import { motion } from 'framer-motion';

interface RiskVisualizationProps {
  prediction: any;
}

export default function RiskVisualization({ prediction }: RiskVisualizationProps) {
  const getRiskColor = () => {
    const risk = prediction?.risk_percentage ?? 0;
    if (risk < 30) return '#10b981'; // green
    if (risk < 70) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const getRiskLabel = () => {
    const risk = prediction?.risk_percentage ?? 0;
    if (risk < 30) return 'Low Risk';
    if (risk < 70) return 'Medium Risk';
    return 'High Risk';
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8">
      <h2 className="text-2xl font-bold text-black mb-6">Risk Assessment</h2>

      {/* Risk Gauge */}
      <div className="flex flex-col items-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="relative w-64 h-64 mb-6"
        >
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="100"
              fill="none"
              stroke="#00000010"
              strokeWidth="20"
            />
            <motion.circle
              cx="128"
              cy="128"
              r="100"
              fill="none"
              stroke={getRiskColor()}
              strokeWidth="20"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 628" }}
              animate={{
                strokeDasharray: `${((prediction?.risk_percentage ?? 0) / 100) * 628} 628`
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-6xl font-bold"
              style={{ color: getRiskColor() }}
            >
              {(prediction.risk_percentage ?? 0).toFixed(1)}%
            </motion.div>
            <div className="text-black/60 text-sm mt-2">Disease Risk</div>
          </div>
        </motion.div>

        {/* Risk Category Badge */}
        <div
          className="px-6 py-3 rounded-full font-bold text-white text-lg"
          style={{ backgroundColor: getRiskColor() }}
        >
          {getRiskLabel()}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-black/5 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-black">
            {((prediction?.confidence ?? 0) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-black/60 mt-1">Confidence</div>
        </div>
        <div className="bg-black/5 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-black">
            {prediction?.used_genetics ? 'Yes' : 'No'}
          </div>
          <div className="text-xs text-black/60 mt-1">Genetics Used</div>
        </div>
        <div className="bg-black/5 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-black">
            v{prediction?.model_version ?? '1.0.0'}
          </div>
          <div className="text-xs text-black/60 mt-1">Model Version</div>
        </div>
      </div>

      {/* Clinical Interpretation */}
      <div className="mt-6 p-4 bg-black/5 rounded-xl">
        <h3 className="font-medium text-black mb-2">Clinical Interpretation</h3>
        <p className="text-sm text-black/70">
          {(prediction?.risk_percentage ?? 0) < 30 && (
            "Patient shows low risk profile. Standard preventive care recommended. Continue monitoring lifestyle factors."
          )}
          {(prediction?.risk_percentage ?? 0) >= 30 && (prediction?.risk_percentage ?? 0) < 70 && (
            "Patient shows moderate risk profile. Consider additional screening and lifestyle interventions. Close monitoring advised."
          )}
          {(prediction?.risk_percentage ?? 0) >= 70 && (
            "Patient shows elevated risk profile. Recommend comprehensive screening, specialist referral, and aggressive risk factor modification."
          )}
        </p>
      </div>

      {/* Timestamp */}
      <div className="mt-4 text-xs text-black/50 text-center">
        Generated: {prediction?.timestamp ? new Date(prediction.timestamp).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
}
