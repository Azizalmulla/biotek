'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'https://biotek-production.up.railway.app';

interface TimelineItem {
  id: string;
  type: 'prediction' | 'genetic' | 'imaging' | 'ai_note' | 'encounter_start' | 'encounter_complete';
  timestamp: string;
  title: string;
  summary: string;
  visibility: 'patient_visible' | 'clinician_only';
  data?: any;
}

interface EncounterTimelineProps {
  encounterId: string | null;
  patientId: string | null;
  userId?: string;
  userRole?: string;
  onClose?: () => void;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  encounter_start: { icon: '🏥', color: 'bg-blue-100 border-blue-300 text-blue-800', label: 'Encounter Started' },
  prediction: { icon: '🎯', color: 'bg-emerald-100 border-emerald-300 text-emerald-800', label: 'Risk Prediction' },
  genetic: { icon: '🧬', color: 'bg-purple-100 border-purple-300 text-purple-800', label: 'Genetic Analysis' },
  imaging: { icon: '👁️', color: 'bg-amber-100 border-amber-300 text-amber-800', label: 'Medical Imaging' },
  ai_note: { icon: '🧠', color: 'bg-indigo-100 border-indigo-300 text-indigo-800', label: 'AI Clinical Note' },
  encounter_complete: { icon: '✅', color: 'bg-green-100 border-green-300 text-green-800', label: 'Encounter Completed' },
};

export default function EncounterTimeline({ encounterId, patientId, userId, userRole, onClose }: EncounterTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [selectedEncounter, setSelectedEncounter] = useState<string | null>(encounterId);

  // Load patient encounters
  useEffect(() => {
    const loadEncounters = async () => {
      if (!patientId) return;
      
      try {
        const response = await fetch(`${API_BASE}/patients/${patientId}/encounters`, {
          headers: {
            'X-User-ID': userId || 'unknown',
            'X-User-Role': userRole || 'doctor'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setEncounters(data.encounters || []);
          if (!selectedEncounter && data.encounters?.length > 0) {
            setSelectedEncounter(data.encounters[0].encounter_id);
          }
        }
      } catch (err) {
        console.error('Failed to load encounters:', err);
      }
    };
    
    loadEncounters();
  }, [patientId, userId, userRole]);

  // Load timeline for selected encounter
  useEffect(() => {
    const loadTimeline = async () => {
      if (!selectedEncounter) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${API_BASE}/encounters/${selectedEncounter}/timeline`, {
          headers: {
            'X-User-ID': userId || 'unknown',
            'X-User-Role': userRole || 'doctor'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setTimeline(data.timeline || []);
        } else {
          setError('Failed to load timeline');
        }
      } catch (err) {
        console.error('Failed to load timeline:', err);
        setError('Network error loading timeline');
      } finally {
        setLoading(false);
      }
    };
    
    loadTimeline();
  }, [selectedEncounter, userId, userRole]);

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (ts: string) => {
    const now = new Date();
    const then = new Date(ts);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!patientId) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-black/10 text-center">
        <span className="text-4xl mb-4 block">📋</span>
        <h3 className="text-xl font-bold text-black mb-2">No Patient Selected</h3>
        <p className="text-black/60">Select a patient to view their encounter timeline</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-black/10 overflow-hidden">
      {/* Header */}
      <div className="bg-stone-50 border-b border-black/10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <h3 className="text-xl font-bold text-black">Encounter Timeline</h3>
              <p className="text-sm text-black/60">
                Patient: {patientId}
              </p>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Encounter Selector */}
        {encounters.length > 0 && (
          <div className="mt-4">
            <label className="text-xs font-medium text-black/50 uppercase tracking-wide">Select Encounter</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {encounters.map((enc) => (
                <button
                  key={enc.encounter_id}
                  onClick={() => setSelectedEncounter(enc.encounter_id)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedEncounter === enc.encounter_id
                      ? 'bg-black text-white'
                      : 'bg-white border border-black/10 text-black/70 hover:border-black/30'
                  }`}
                >
                  <span className="mr-2">{enc.status === 'completed' ? '✅' : '🔄'}</span>
                  {enc.encounter_id}
                  <span className="ml-2 text-xs opacity-70">
                    {formatRelativeTime(enc.created_at)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Timeline Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-black/60">Loading timeline...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">⚠️</span>
            <p className="text-red-600">{error}</p>
          </div>
        ) : timeline.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">📭</span>
            <h4 className="font-semibold text-black mb-2">No Timeline Events</h4>
            <p className="text-black/60 text-sm">
              {selectedEncounter 
                ? 'This encounter has no recorded events yet'
                : 'Select an encounter to view its timeline'}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-black/10"></div>
            
            {/* Timeline Items */}
            <div className="space-y-4">
              <AnimatePresence>
                {timeline.map((item, index) => {
                  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.ai_note;
                  const isExpanded = expandedItem === item.id;
                  
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative pl-14"
                    >
                      {/* Timeline Dot */}
                      <div className={`absolute left-4 w-5 h-5 rounded-full border-2 ${config.color} flex items-center justify-center text-xs`}>
                        {config.icon}
                      </div>
                      
                      {/* Card */}
                      <div 
                        className={`border rounded-2xl overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                          isExpanded ? 'shadow-lg' : ''
                        } ${config.color.replace('text-', 'border-').split(' ')[1]}`}
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                      >
                        <div className={`px-4 py-3 ${config.color.split(' ')[0]}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{config.label}</span>
                              {item.visibility === 'clinician_only' && (
                                <span className="text-xs bg-black/10 px-2 py-0.5 rounded-full">
                                  🔒 Clinician Only
                                </span>
                              )}
                            </div>
                            <span className="text-xs opacity-70">{formatTimestamp(item.timestamp)}</span>
                          </div>
                          <p className="text-sm mt-1 opacity-80">{item.summary || item.title}</p>
                        </div>
                        
                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && item.data && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-white border-t border-black/5"
                            >
                              <div className="p-4">
                                <pre className="text-xs bg-stone-50 p-3 rounded-xl overflow-auto max-h-48 text-black/70">
                                  {JSON.stringify(item.data, null, 2)}
                                </pre>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Stats */}
      {timeline.length > 0 && (
        <div className="bg-stone-50 border-t border-black/10 px-6 py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-4">
              <span className="text-black/50">
                <strong className="text-black">{timeline.length}</strong> events
              </span>
              <span className="text-black/50">
                <strong className="text-black">
                  {timeline.filter(t => t.visibility === 'patient_visible').length}
                </strong> patient-visible
              </span>
            </div>
            <div className="flex gap-2">
              {Object.entries(
                timeline.reduce((acc, item) => {
                  acc[item.type] = (acc[item.type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([type, count]) => (
                <span 
                  key={type}
                  className={`px-2 py-1 rounded-full text-xs ${TYPE_CONFIG[type]?.color || 'bg-gray-100'}`}
                >
                  {TYPE_CONFIG[type]?.icon} {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
