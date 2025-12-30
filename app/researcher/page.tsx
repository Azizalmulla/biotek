'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface CohortStats {
  total_patients: number;
  age_distribution: { range: string; count: number }[];
  sex_distribution: { label: string; count: number }[];
  risk_distribution: { category: string; count: number }[];
  disease_prevalence: { disease: string; count: number; percentage: number }[];
}

interface CohortFilter {
  age_min: number;
  age_max: number;
  sex: 'all' | 'male' | 'female';
  risk_band: 'all' | 'low' | 'moderate' | 'high';
  diseases: string[];
}

export default function ResearcherDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'cohort' | 'federated' | 'export'>('overview');
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [cohortFilter, setCohortFilter] = useState<CohortFilter>({
    age_min: 18,
    age_max: 90,
    sex: 'all',
    risk_band: 'all',
    diseases: []
  });
  const [cohortSize, setCohortSize] = useState<number>(0);
  const [exportStatus, setExportStatus] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('biotek_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.role !== 'researcher') {
        router.push('/login');
        return;
      }
      setSession(parsed);
      loadAggregatedStats();
    } else {
      router.push('/login');
    }
  }, []);

  const loadAggregatedStats = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://biotek-production.up.railway.app';
      const res = await fetch(`${API_URL}/research/aggregated-stats`, {
        headers: {
          'X-User-Role': 'researcher',
          'X-User-ID': session?.user_id || 'researcher'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        // Use demo data if endpoint not available
        setStats({
          total_patients: 1247,
          age_distribution: [
            { range: '18-30', count: 156 },
            { range: '31-45', count: 312 },
            { range: '46-60', count: 445 },
            { range: '61-75', count: 267 },
            { range: '75+', count: 67 }
          ],
          sex_distribution: [
            { label: 'Male', count: 623 },
            { label: 'Female', count: 624 }
          ],
          risk_distribution: [
            { category: 'Low', count: 498 },
            { category: 'Moderate', count: 512 },
            { category: 'High', count: 237 }
          ],
          disease_prevalence: [
            { disease: 'Type 2 Diabetes', count: 312, percentage: 25.0 },
            { disease: 'Hypertension', count: 445, percentage: 35.7 },
            { disease: 'Coronary Heart Disease', count: 178, percentage: 14.3 },
            { disease: 'NAFLD', count: 234, percentage: 18.8 },
            { disease: 'Chronic Kidney Disease', count: 89, percentage: 7.1 }
          ]
        });
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
    setLoading(false);
  };

  const buildCohort = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://biotek-production.up.railway.app';
      const res = await fetch(`${API_URL}/research/build-cohort`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'researcher',
          'X-User-ID': session?.user_id || 'researcher'
        },
        body: JSON.stringify(cohortFilter)
      });
      if (res.ok) {
        const data = await res.json();
        setCohortSize(data.cohort_size);
      } else {
        // Demo calculation
        let size = stats?.total_patients || 1000;
        if (cohortFilter.sex !== 'all') size = Math.floor(size * 0.5);
        if (cohortFilter.risk_band !== 'all') size = Math.floor(size * 0.33);
        const ageRange = cohortFilter.age_max - cohortFilter.age_min;
        size = Math.floor(size * (ageRange / 72));
        setCohortSize(size);
      }
    } catch (e) {
      console.error('Failed to build cohort:', e);
    }
    setLoading(false);
  };

  const exportData = async (format: 'csv' | 'json' | 'synthetic') => {
    setExportStatus('Preparing de-identified dataset...');
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://biotek-production.up.railway.app';
      const res = await fetch(`${API_URL}/research/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'researcher',
          'X-User-ID': session?.user_id || 'researcher'
        },
        body: JSON.stringify({ format, filters: cohortFilter })
      });
      if (res.ok) {
        setExportStatus(`Export ready! ${format.toUpperCase()} file generated.`);
      } else {
        setExportStatus(`Demo: Would export ${cohortSize} records as ${format.toUpperCase()}`);
      }
    } catch (e) {
      setExportStatus(`Demo: Would export ${cohortSize} records as ${format.toUpperCase()}`);
    }
    setTimeout(() => setExportStatus(''), 5000);
  };

  const handleSignOut = () => {
    localStorage.removeItem('biotek_session');
    router.push('/login');
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold">
                B
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Research Portal</h1>
                <p className="text-sm text-gray-500">Population Analytics & De-identified Data</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                Researcher
              </span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Privacy Notice */}
      <div className="bg-indigo-600 text-white text-center py-2 text-sm">
        🔒 All data is de-identified and aggregated. No individual patient records accessible.
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-indigo-100 bg-white/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {[
              { id: 'overview', label: 'Population Overview', icon: '📊' },
              { id: 'cohort', label: 'Cohort Builder', icon: '🎯' },
              { id: 'federated', label: 'Federated Learning', icon: '🔗' },
              { id: 'export', label: 'Data Export', icon: '📤' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-700 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
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
        {activeTab === 'overview' && stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                <p className="text-3xl font-bold text-indigo-600">{stats.total_patients.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">Total Population</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                <p className="text-3xl font-bold text-green-600">{stats.risk_distribution[0]?.count || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Low Risk</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                <p className="text-3xl font-bold text-amber-600">{stats.risk_distribution[1]?.count || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Moderate Risk</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                <p className="text-3xl font-bold text-red-600">{stats.risk_distribution[2]?.count || 0}</p>
                <p className="text-sm text-gray-500 mt-1">High Risk</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6">
              {/* Age Distribution */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                <h3 className="font-semibold text-gray-900 mb-4">Age Distribution</h3>
                <div className="space-y-3">
                  {stats.age_distribution.map((item) => (
                    <div key={item.range} className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 w-16">{item.range}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${(item.count / stats.total_patients) * 100 * 3}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-12">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disease Prevalence */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                <h3 className="font-semibold text-gray-900 mb-4">Disease Prevalence</h3>
                <div className="space-y-3">
                  {stats.disease_prevalence.map((item) => (
                    <div key={item.disease} className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 flex-1 truncate">{item.disease}</span>
                      <div className="w-32 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div 
                          className="bg-purple-500 h-full rounded-full"
                          style={{ width: `${item.percentage * 2}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-16">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sex Distribution */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
              <h3 className="font-semibold text-gray-900 mb-4">Sex Distribution</h3>
              <div className="flex items-center gap-8">
                {stats.sex_distribution.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${item.label === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-semibold">{item.count}</span>
                    <span className="text-gray-400">({((item.count / stats.total_patients) * 100).toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'cohort' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-8"
          >
            {/* Filters */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
              <h3 className="font-semibold text-gray-900 mb-6">Define Cohort Criteria</h3>
              
              <div className="space-y-6">
                {/* Age Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={cohortFilter.age_min}
                      onChange={(e) => setCohortFilter({ ...cohortFilter, age_min: parseInt(e.target.value) })}
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg"
                      min={0}
                      max={120}
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="number"
                      value={cohortFilter.age_max}
                      onChange={(e) => setCohortFilter({ ...cohortFilter, age_max: parseInt(e.target.value) })}
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg"
                      min={0}
                      max={120}
                    />
                  </div>
                </div>

                {/* Sex */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
                  <select
                    value={cohortFilter.sex}
                    onChange={(e) => setCohortFilter({ ...cohortFilter, sex: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  >
                    <option value="all">All</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                {/* Risk Band */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Risk Category</label>
                  <select
                    value={cohortFilter.risk_band}
                    onChange={(e) => setCohortFilter({ ...cohortFilter, risk_band: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="low">Low Risk</option>
                    <option value="moderate">Moderate Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>

                {/* Disease Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Disease (optional)</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value && !cohortFilter.diseases.includes(e.target.value)) {
                        setCohortFilter({ ...cohortFilter, diseases: [...cohortFilter.diseases, e.target.value] });
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  >
                    <option value="">Add disease filter...</option>
                    <option value="type2_diabetes">Type 2 Diabetes</option>
                    <option value="hypertension">Hypertension</option>
                    <option value="coronary_heart_disease">Coronary Heart Disease</option>
                    <option value="nafld">NAFLD</option>
                    <option value="chronic_kidney_disease">Chronic Kidney Disease</option>
                  </select>
                  {cohortFilter.diseases.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {cohortFilter.diseases.map((d) => (
                        <span key={d} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-2">
                          {d.replace(/_/g, ' ')}
                          <button onClick={() => setCohortFilter({ ...cohortFilter, diseases: cohortFilter.diseases.filter(x => x !== d) })}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={buildCohort}
                  disabled={loading}
                  className="w-full py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 font-medium disabled:opacity-50"
                >
                  {loading ? 'Building...' : 'Build Cohort'}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
              <h3 className="font-semibold text-gray-900 mb-6">Cohort Results</h3>
              
              {cohortSize > 0 ? (
                <div className="text-center py-12">
                  <p className="text-6xl font-bold text-indigo-600">{cohortSize.toLocaleString()}</p>
                  <p className="text-gray-500 mt-2">patients match criteria</p>
                  
                  <div className="mt-8 p-4 bg-indigo-50 rounded-xl text-left">
                    <p className="text-sm font-medium text-indigo-700 mb-2">Cohort Definition:</p>
                    <ul className="text-sm text-indigo-600 space-y-1">
                      <li>• Age: {cohortFilter.age_min} - {cohortFilter.age_max}</li>
                      <li>• Sex: {cohortFilter.sex}</li>
                      <li>• Risk: {cohortFilter.risk_band}</li>
                      {cohortFilter.diseases.length > 0 && (
                        <li>• Diseases: {cohortFilter.diseases.join(', ')}</li>
                      )}
                    </ul>
                  </div>

                  <button
                    onClick={() => setActiveTab('export')}
                    className="mt-6 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-medium"
                  >
                    Export This Cohort →
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-5xl mb-4">🎯</p>
                  <p>Define criteria and build cohort to see results</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'federated' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-indigo-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl">🔗</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Federated Learning Network</h3>
                  <p className="text-sm text-gray-500">Train models across institutions without sharing raw data</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-2xl font-bold text-green-600">3</p>
                  <p className="text-sm text-green-700">Connected Nodes</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-2xl font-bold text-blue-600">12,450</p>
                  <p className="text-sm text-blue-700">Total Samples</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <p className="text-2xl font-bold text-purple-600">v2.3</p>
                  <p className="text-sm text-purple-700">Model Version</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Network Nodes</h4>
                {[
                  { name: 'Hospital A (Local)', status: 'online', samples: 1247, lastSync: '2 min ago' },
                  { name: 'Hospital B', status: 'online', samples: 5623, lastSync: '15 min ago' },
                  { name: 'Research Institute C', status: 'syncing', samples: 5580, lastSync: 'Syncing...' },
                ].map((node) => (
                  <div key={node.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        node.status === 'online' ? 'bg-green-500' : 
                        node.status === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'
                      }`} />
                      <span className="font-medium">{node.name}</span>
                    </div>
                    <div className="flex items-center gap-8 text-sm text-gray-500">
                      <span>{node.samples.toLocaleString()} samples</span>
                      <span>{node.lastSync}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'export' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-indigo-100">
              <h3 className="font-semibold text-gray-900 mb-2">Export De-identified Data</h3>
              <p className="text-sm text-gray-500 mb-6">
                All exports are automatically de-identified. Patient IDs, names, and dates are removed or hashed.
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => exportData('csv')}
                  className="w-full p-4 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">📄</span>
                    <div className="text-left">
                      <p className="font-medium">CSV Export</p>
                      <p className="text-sm text-gray-500">Spreadsheet-compatible format</p>
                    </div>
                  </div>
                  <span className="text-indigo-500">→</span>
                </button>

                <button
                  onClick={() => exportData('json')}
                  className="w-full p-4 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{ }</span>
                    <div className="text-left">
                      <p className="font-medium">JSON Export</p>
                      <p className="text-sm text-gray-500">Machine-readable structured data</p>
                    </div>
                  </div>
                  <span className="text-indigo-500">→</span>
                </button>

                <button
                  onClick={() => exportData('synthetic')}
                  className="w-full p-4 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🔮</span>
                    <div className="text-left">
                      <p className="font-medium">Synthetic Data</p>
                      <p className="text-sm text-gray-500">AI-generated data matching real distributions</p>
                    </div>
                  </div>
                  <span className="text-indigo-500">→</span>
                </button>
              </div>

              {exportStatus && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                  {exportStatus}
                </div>
              )}

              <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ Data Use Agreement:</strong> Exported data may only be used for approved research purposes. 
                  Re-identification attempts are prohibited.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
