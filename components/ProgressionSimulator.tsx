'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ProgressionData {
  disease_id: string;
  current_risk: number;
  no_intervention: { year: number; risk: number }[];
  with_intervention: { year: number; risk: number }[];
  summary: {
    risk_at_5_years_no_intervention: number;
    risk_at_5_years_with_intervention: number;
    potential_risk_reduction: number;
    reduction_percentage: number;
  };
  modifiable_factors: {
    factor: string;
    current: number | string;
    target: number | string;
    potential_reduction: number;
    recommendation: string;
  }[];
  progression_rate: {
    base: number;
    adjusted: number;
    with_intervention: number;
  };
}

interface Props {
  patientData: any;
  diseaseId: string;
  diseaseName: string;
  currentRisk: number;
  apiBase: string;
}

export default function ProgressionSimulator({ patientData, diseaseId, diseaseName, currentRisk, apiBase }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProgressionData | null>(null);
  const [showIntervention, setShowIntervention] = useState(true);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/ai/progression-simulation`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Role': 'doctor'
        },
        body: JSON.stringify({
          disease_id: diseaseId,
          patient_data: {
            current_risk: currentRisk,
            age: patientData?.age || 50,
            bmi: patientData?.bmi || 27,
            hba1c: patientData?.hba1c || 6.0,
            bp_systolic: patientData?.bp_systolic || 130,
            smoking_pack_years: patientData?.smoking_pack_years || 0,
            exercise_hours_weekly: patientData?.exercise_hours_weekly || 2,
            family_history_score: patientData?.family_history_score || 0.5
          }
        })
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Progression simulation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxRisk = data ? Math.max(
    ...data.no_intervention.map(d => d.risk),
    ...data.with_intervention.map(d => d.risk)
  ) : 100;

  const chartHeight = 200;
  const chartWidth = 100; // percentage

  const getY = (risk: number) => chartHeight - (risk / maxRisk) * chartHeight;

  const noInterventionPath = data?.no_intervention
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${(d.year / 5) * 100}% ${getY(d.risk)}`)
    .join(' ') || '';

  const withInterventionPath = data?.with_intervention
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${(d.year / 5) * 100}% ${getY(d.risk)}`)
    .join(' ') || '';

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-black/10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📈</span>
          <div>
            <h3 className="text-xl font-bold text-black">Disease Progression Simulator</h3>
            <p className="text-sm text-black/60">5-year risk trajectory • Evidence-based modeling</p>
          </div>
        </div>
        {!data && !loading && (
          <button
            onClick={runSimulation}
            className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:from-violet-700 hover:to-purple-700 flex items-center gap-2 shadow-lg"
          >
            <span>📊</span>
            Simulate 5-Year Trajectory
          </button>
        )}
        {data && (
          <button
            onClick={() => setData(null)}
            className="text-sm text-black/50 hover:text-black"
          >
            ↻ Reset
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 bg-violet-50 px-6 py-4 rounded-2xl">
            <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-violet-700 font-medium">Calculating progression trajectories...</span>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="text-center py-12 bg-gradient-to-br from-violet-50/50 to-purple-50/50 rounded-2xl border border-dashed border-violet-200">
          <span className="text-5xl mb-4 block">📈</span>
          <p className="text-black/60 mb-2">See how risk changes over 5 years</p>
          <p className="text-sm text-black/40">Compare outcomes with and without intervention</p>
        </div>
      )}

      {data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Disease being simulated */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-black/50 uppercase tracking-wide">Simulating</span>
                <h4 className="font-bold text-black">{diseaseName}</h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-black/50">Current Risk</span>
                <div className="text-2xl font-bold text-black">{currentRisk.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowIntervention(false)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !showIntervention 
                  ? 'bg-red-100 text-red-700 border-2 border-red-300' 
                  : 'bg-stone-100 text-stone-600 border-2 border-transparent'
              }`}
            >
              No Intervention
            </button>
            <button
              onClick={() => setShowIntervention(true)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                showIntervention 
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' 
                  : 'bg-stone-100 text-stone-600 border-2 border-transparent'
              }`}
            >
              With Intervention
            </button>
          </div>

          {/* Chart */}
          <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200">
            <div className="relative h-[220px]">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-black/50">
                <span>{Math.round(maxRisk)}%</span>
                <span>{Math.round(maxRisk / 2)}%</span>
                <span>0%</span>
              </div>
              
              {/* Chart area */}
              <div className="ml-14 h-[200px] relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="border-t border-black/5 w-full" />
                  ))}
                </div>
                
                {/* Bars */}
                <div className="absolute inset-0 flex items-end justify-between px-2">
                  {data.no_intervention.map((point, idx) => {
                    const noIntHeight = (point.risk / maxRisk) * 100;
                    const withIntHeight = (data.with_intervention[idx].risk / maxRisk) * 100;
                    
                    return (
                      <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                        <div className="flex items-end gap-1 h-[180px] w-full justify-center">
                          {/* No intervention bar */}
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${noIntHeight}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className={`w-5 rounded-t-lg ${
                              !showIntervention 
                                ? 'bg-gradient-to-t from-red-500 to-red-400' 
                                : 'bg-gradient-to-t from-red-200 to-red-100'
                            }`}
                          />
                          {/* With intervention bar */}
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${withIntHeight}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className={`w-5 rounded-t-lg ${
                              showIntervention 
                                ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' 
                                : 'bg-gradient-to-t from-emerald-200 to-emerald-100'
                            }`}
                          />
                        </div>
                        <span className="text-xs text-black/60 mt-1">Y{point.year}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-stone-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-t from-red-500 to-red-400" />
                <span className="text-sm text-black/70">No Intervention</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-t from-emerald-500 to-emerald-400" />
                <span className="text-sm text-black/70">With Intervention</span>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="text-xs text-red-600 mb-1">Risk at Year 5 (No Action)</div>
              <div className="text-2xl font-bold text-red-700">
                {data.summary.risk_at_5_years_no_intervention.toFixed(1)}%
              </div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <div className="text-xs text-emerald-600 mb-1">Risk at Year 5 (With Action)</div>
              <div className="text-2xl font-bold text-emerald-700">
                {data.summary.risk_at_5_years_with_intervention.toFixed(1)}%
              </div>
            </div>
            <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
              <div className="text-xs text-violet-600 mb-1">Potential Reduction</div>
              <div className="text-2xl font-bold text-violet-700">
                -{data.summary.potential_risk_reduction.toFixed(1)}%
              </div>
              <div className="text-xs text-violet-500">
                ({data.summary.reduction_percentage.toFixed(0)}% improvement)
              </div>
            </div>
          </div>

          {/* Modifiable Factors */}
          {data.modifiable_factors && data.modifiable_factors.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎯</span>
                <h4 className="font-bold text-amber-900">Top Modifiable Risk Factors</h4>
              </div>
              <div className="space-y-3">
                {data.modifiable_factors.map((factor, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-4 border border-amber-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-xs font-bold text-amber-700">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-black">{factor.factor}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-red-600 font-medium">{factor.current}</span>
                        <span className="text-black/40 mx-2">→</span>
                        <span className="text-emerald-600 font-medium">{factor.target}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-black/60 flex-1">{factor.recommendation}</p>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full ml-3">
                        -{factor.potential_reduction}% risk
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progression Rate Info */}
          <div className="bg-stone-100 rounded-xl p-4 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-violet-500 rounded-full"></span>
              <span className="text-black/60">
                Annual progression rate: <span className="font-medium text-black">{data.progression_rate.adjusted}%</span>
                {data.progression_rate.adjusted > data.progression_rate.base && (
                  <span className="text-red-500 ml-1">(elevated)</span>
                )}
              </span>
            </div>
            <span className="text-black/40">Based on patient-specific risk factors</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
