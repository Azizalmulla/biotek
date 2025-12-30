'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Patient {
  patient_id: string;
  name: string;
  room: string;
  status: 'stable' | 'monitoring' | 'critical';
  last_vitals: string;
  alerts: number;
}

interface Vitals {
  timestamp: string;
  bp_systolic: number;
  bp_diastolic: number;
  heart_rate: number;
  temperature: number;
  weight: number;
  respiratory_rate: number;
  oxygen_saturation: number;
}

interface LabResult {
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  timestamp: string;
}

interface Alert {
  id: string;
  type: 'high_risk' | 'followup' | 'medication' | 'vitals';
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  acknowledged: boolean;
}

interface CareNote {
  id: string;
  note: string;
  created_by: string;
  timestamp: string;
  category: 'observation' | 'task' | 'handoff';
}

interface Task {
  id: string;
  description: string;
  due_time: string;
  completed: boolean;
  patient_id: string;
}

export default function NurseDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'patients' | 'vitals' | 'labs' | 'alerts' | 'tasks'>('patients');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<Vitals[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [careNotes, setCareNotes] = useState<CareNote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [newVitals, setNewVitals] = useState({
    bp_systolic: '',
    bp_diastolic: '',
    heart_rate: '',
    temperature: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    pain_level: ''
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://biotek-production.up.railway.app';

  useEffect(() => {
    const stored = localStorage.getItem('biotek_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.role !== 'nurse') {
        router.push('/login');
        return;
      }
      setSession(parsed);
      loadAssignedPatients();
      loadAlerts();
      loadTasks();
    } else {
      router.push('/login');
    }
  }, []);

  const loadAssignedPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/nurse/assigned-patients`, {
        headers: {
          'X-User-Role': 'nurse',
          'X-User-ID': session?.userId || 'nurse'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      } else {
        // Demo data
        setPatients([
          { patient_id: 'PAT-001', name: 'John Smith', room: '201A', status: 'stable', last_vitals: '10 min ago', alerts: 0 },
          { patient_id: 'PAT-002', name: 'Sarah Johnson', room: '203B', status: 'monitoring', last_vitals: '25 min ago', alerts: 2 },
          { patient_id: 'PAT-003', name: 'Michael Brown', room: '205A', status: 'critical', last_vitals: '5 min ago', alerts: 3 },
          { patient_id: 'PAT-004', name: 'Emily Davis', room: '207C', status: 'stable', last_vitals: '1 hr ago', alerts: 1 },
        ]);
      }
    } catch (e) {
      console.error('Failed to load patients:', e);
    }
    setLoading(false);
  };

  const loadPatientVitals = async (patientId: string) => {
    try {
      const res = await fetch(`${API_BASE}/nurse/patient/${patientId}/vitals`, {
        headers: {
          'X-User-Role': 'nurse',
          'X-User-ID': session?.userId || 'nurse'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setVitals(data.vitals || []);
      } else {
        // Demo vitals
        setVitals([
          { timestamp: new Date().toISOString(), bp_systolic: 128, bp_diastolic: 82, heart_rate: 72, temperature: 98.6, weight: 175, respiratory_rate: 16, oxygen_saturation: 98 },
          { timestamp: new Date(Date.now() - 4*3600000).toISOString(), bp_systolic: 132, bp_diastolic: 85, heart_rate: 78, temperature: 98.8, weight: 175, respiratory_rate: 18, oxygen_saturation: 97 },
          { timestamp: new Date(Date.now() - 8*3600000).toISOString(), bp_systolic: 125, bp_diastolic: 80, heart_rate: 70, temperature: 98.4, weight: 175, respiratory_rate: 15, oxygen_saturation: 99 },
        ]);
      }
    } catch (e) {
      console.error('Failed to load vitals:', e);
    }
  };

  const loadPatientLabs = async (patientId: string) => {
    try {
      const res = await fetch(`${API_BASE}/nurse/patient/${patientId}/labs`, {
        headers: {
          'X-User-Role': 'nurse',
          'X-User-ID': session?.userId || 'nurse'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLabs(data.labs || []);
      } else {
        // Demo labs
        setLabs([
          { test_name: 'Glucose', value: '105', unit: 'mg/dL', reference_range: '70-100', status: 'high', timestamp: new Date().toISOString() },
          { test_name: 'Hemoglobin', value: '14.2', unit: 'g/dL', reference_range: '12-17', status: 'normal', timestamp: new Date().toISOString() },
          { test_name: 'WBC', value: '7.5', unit: 'K/uL', reference_range: '4.5-11', status: 'normal', timestamp: new Date().toISOString() },
          { test_name: 'Creatinine', value: '1.1', unit: 'mg/dL', reference_range: '0.7-1.3', status: 'normal', timestamp: new Date().toISOString() },
          { test_name: 'Potassium', value: '5.2', unit: 'mEq/L', reference_range: '3.5-5.0', status: 'high', timestamp: new Date().toISOString() },
        ]);
      }
    } catch (e) {
      console.error('Failed to load labs:', e);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/nurse/alerts`, {
        headers: {
          'X-User-Role': 'nurse',
          'X-User-ID': session?.userId || 'nurse'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      } else {
        // Demo alerts
        setAlerts([
          { id: 'ALT-001', type: 'high_risk', message: 'Patient PAT-003 flagged high risk - physician notified', priority: 'high', timestamp: new Date().toISOString(), acknowledged: false },
          { id: 'ALT-002', type: 'followup', message: 'Follow-up required for PAT-002 - BP check in 2 hours', priority: 'medium', timestamp: new Date().toISOString(), acknowledged: false },
          { id: 'ALT-003', type: 'medication', message: 'PAT-004 medication due at 3:00 PM', priority: 'medium', timestamp: new Date().toISOString(), acknowledged: true },
          { id: 'ALT-004', type: 'vitals', message: 'PAT-002 elevated temperature (100.4°F)', priority: 'high', timestamp: new Date().toISOString(), acknowledged: false },
        ]);
      }
    } catch (e) {
      console.error('Failed to load alerts:', e);
    }
  };

  const loadTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/nurse/tasks`, {
        headers: {
          'X-User-Role': 'nurse',
          'X-User-ID': session?.userId || 'nurse'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      } else {
        // Demo tasks
        setTasks([
          { id: 'TSK-001', description: 'Check vitals for Room 203B', due_time: '14:00', completed: false, patient_id: 'PAT-002' },
          { id: 'TSK-002', description: 'Administer medication - Room 205A', due_time: '14:30', completed: false, patient_id: 'PAT-003' },
          { id: 'TSK-003', description: 'Wound dressing change - Room 201A', due_time: '15:00', completed: false, patient_id: 'PAT-001' },
          { id: 'TSK-004', description: 'Patient discharge prep - Room 207C', due_time: '16:00', completed: true, patient_id: 'PAT-004' },
        ]);
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  };

  const loadPatientCareNotes = async (patientId: string) => {
    try {
      const res = await fetch(`${API_BASE}/nurse/patient/${patientId}/care-notes`, {
        headers: {
          'X-User-Role': 'nurse',
          'X-User-ID': session?.userId || 'nurse'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCareNotes(data.notes || []);
      } else {
        // Demo notes
        setCareNotes([
          { id: 'NOTE-001', note: 'Patient resting comfortably. No complaints of pain.', created_by: 'Nurse Williams', timestamp: new Date().toISOString(), category: 'observation' },
          { id: 'NOTE-002', note: 'Assisted with ambulation. Tolerated well.', created_by: 'Nurse Johnson', timestamp: new Date(Date.now() - 2*3600000).toISOString(), category: 'task' },
        ]);
      }
    } catch (e) {
      console.error('Failed to load care notes:', e);
    }
  };

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    loadPatientVitals(patient.patient_id);
    loadPatientLabs(patient.patient_id);
    loadPatientCareNotes(patient.patient_id);
  };

  const acknowledgeAlert = async (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  };

  const toggleTask = async (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const addCareNote = async () => {
    if (!newNote.trim() || !selectedPatient) return;
    
    const note: CareNote = {
      id: `NOTE-${Date.now()}`,
      note: newNote,
      created_by: session?.fullName || 'Nurse',
      timestamp: new Date().toISOString(),
      category: 'observation'
    };
    
    setCareNotes(prev => [note, ...prev]);
    setNewNote('');
    
    // Try to save to backend
    try {
      await fetch(`${API_BASE}/nurse/patient/${selectedPatient.patient_id}/care-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'nurse',
          'X-User-ID': session?.userId || 'nurse'
        },
        body: JSON.stringify({ note: newNote, category: 'observation' })
      });
    } catch (e) {
      console.error('Failed to save note:', e);
    }
  };

  const submitVitals = async () => {
    if (!selectedPatient) return;
    
    const vitalRecord: Vitals = {
      timestamp: new Date().toISOString(),
      bp_systolic: parseInt(newVitals.bp_systolic) || 0,
      bp_diastolic: parseInt(newVitals.bp_diastolic) || 0,
      heart_rate: parseInt(newVitals.heart_rate) || 0,
      temperature: parseFloat(newVitals.temperature) || 0,
      weight: parseFloat(newVitals.weight) || 0,
      respiratory_rate: parseInt(newVitals.respiratory_rate) || 0,
      oxygen_saturation: parseInt(newVitals.oxygen_saturation) || 0
    };
    
    // Add to local state
    setVitals(prev => [vitalRecord, ...prev]);
    
    // Reset form
    setNewVitals({
      bp_systolic: '',
      bp_diastolic: '',
      heart_rate: '',
      temperature: '',
      respiratory_rate: '',
      oxygen_saturation: '',
      weight: '',
      pain_level: ''
    });
    setShowVitalsForm(false);
    
    // Try to save to backend
    try {
      await fetch(`${API_BASE}/nurse/patient/${selectedPatient.patient_id}/vitals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'nurse',
          'X-User-ID': session?.userId || 'nurse'
        },
        body: JSON.stringify(vitalRecord)
      });
    } catch (e) {
      console.error('Failed to save vitals:', e);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('biotek_session');
    router.push('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'stable': return 'bg-green-100 text-green-700';
      case 'monitoring': return 'bg-amber-100 text-amber-700';
      case 'critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'high_risk': return '⚠️';
      case 'followup': return '📋';
      case 'medication': return '💊';
      case 'vitals': return '❤️';
      default: return '🔔';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-amber-500 bg-amber-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  if (!session) return null;

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;
  const pendingTasks = tasks.filter(t => !t.completed).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f3e7d9' }}>
      {/* Header */}
      <header className="bg-white/60 backdrop-blur-md border-b border-black/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-bold">
                B
              </div>
              <div>
                <h1 className="text-xl font-semibold text-black">Nursing Station</h1>
                <p className="text-sm text-black/50">Patient Care & Monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {unacknowledgedAlerts > 0 && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium animate-pulse">
                  {unacknowledgedAlerts} Active Alerts
                </span>
              )}
              <span className="px-3 py-1 bg-black/5 text-black rounded-full text-sm font-medium">
                👩‍⚕️ {session.fullName || 'Nurse'}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-black text-white px-4 py-2 rounded-full text-sm hover:bg-black/90 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white/60 border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-black">{patients.length}</p>
              <p className="text-sm text-black/50">Assigned Patients</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{patients.filter(p => p.status === 'critical').length}</p>
              <p className="text-sm text-black/50">Critical</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{unacknowledgedAlerts}</p>
              <p className="text-sm text-black/50">Active Alerts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-black">{pendingTasks}</p>
              <p className="text-sm text-black/50">Pending Tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-black/10 bg-white/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {[
              { id: 'patients', label: 'My Patients', icon: '👥' },
              { id: 'vitals', label: 'Vitals', icon: '❤️' },
              { id: 'labs', label: 'Lab Results', icon: '🔬' },
              { id: 'alerts', label: `Alerts ${unacknowledgedAlerts > 0 ? `(${unacknowledgedAlerts})` : ''}`, icon: '🔔' },
              { id: 'tasks', label: `Tasks (${pendingTasks})`, icon: '✅' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-black text-black font-medium'
                    : 'border-transparent text-black/50 hover:text-black/70'
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
        <div className="grid grid-cols-3 gap-6">
          {/* Patient List Sidebar */}
          <div className="col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-black/10 overflow-hidden">
              <div className="p-4 bg-black/5 border-b border-black/10">
                <h3 className="font-semibold text-black">Assigned Patients</h3>
              </div>
              <div className="divide-y divide-black/5 max-h-[600px] overflow-y-auto">
                {patients.map((patient) => (
                  <button
                    key={patient.patient_id}
                    onClick={() => selectPatient(patient)}
                    className={`w-full p-4 text-left hover:bg-black/5 transition-colors ${
                      selectedPatient?.patient_id === patient.patient_id ? 'bg-black/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{patient.name}</p>
                        <p className="text-sm text-gray-500">Room {patient.room}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                          {patient.status}
                        </span>
                        {patient.alerts > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                            {patient.alerts} alerts
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-black/40 mt-1">Last vitals: {patient.last_vitals}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-2">
            <AnimatePresence mode="wait">
              {/* Patients Tab */}
              {activeTab === 'patients' && selectedPatient && (
                <motion.div
                  key="patient-details"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Patient Header */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-black">{selectedPatient.name}</h2>
                        <p className="text-black/50">Room {selectedPatient.room} • ID: {selectedPatient.patient_id}</p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedPatient.status)}`}>
                        {selectedPatient.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Quick Vitals */}
                  {vitals.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/10">
                      <h3 className="font-semibold text-black mb-4">Latest Vitals</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-black/5 rounded-xl">
                          <p className="text-2xl font-bold text-black">{vitals[0].bp_systolic}/{vitals[0].bp_diastolic}</p>
                          <p className="text-sm text-black/50">Blood Pressure</p>
                        </div>
                        <div className="text-center p-4 bg-black/5 rounded-xl">
                          <p className="text-2xl font-bold text-black">{vitals[0].heart_rate}</p>
                          <p className="text-sm text-black/50">Heart Rate</p>
                        </div>
                        <div className="text-center p-4 bg-black/5 rounded-xl">
                          <p className="text-2xl font-bold text-black">{vitals[0].temperature}°F</p>
                          <p className="text-sm text-black/50">Temperature</p>
                        </div>
                        <div className="text-center p-4 bg-black/5 rounded-xl">
                          <p className="text-2xl font-bold text-black">{vitals[0].oxygen_saturation}%</p>
                          <p className="text-sm text-black/50">O2 Saturation</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Care Notes */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/10">
                    <h3 className="font-semibold text-black mb-4">Care Notes</h3>
                    
                    {/* Add Note */}
                    <div className="flex gap-3 mb-4">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add observation or note..."
                        className="flex-1 px-4 py-2 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20"
                        onKeyDown={(e) => e.key === 'Enter' && addCareNote()}
                      />
                      <button
                        onClick={addCareNote}
                        className="px-4 py-2 bg-black text-white rounded-xl hover:bg-black/90"
                      >
                        Add Note
                      </button>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {careNotes.map((note) => (
                        <div key={note.id} className="p-3 bg-black/5 rounded-xl">
                          <p className="text-black">{note.note}</p>
                          <p className="text-xs text-black/40 mt-1">
                            {note.created_by} • {new Date(note.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'patients' && !selectedPatient && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl p-12 text-center shadow-sm border border-black/10"
                >
                  <p className="text-5xl mb-4">👈</p>
                  <p className="text-black/50">Select a patient to view details</p>
                </motion.div>
              )}

              {/* Vitals Tab */}
              {activeTab === 'vitals' && selectedPatient && (
                <motion.div
                  key="vitals"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Vitals Entry Form */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-black">Record New Vitals - {selectedPatient.name}</h3>
                      <button
                        onClick={() => setShowVitalsForm(!showVitalsForm)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          showVitalsForm 
                            ? 'bg-black/10 text-black' 
                            : 'bg-black text-white hover:bg-black/90'
                        }`}
                      >
                        {showVitalsForm ? '✕ Cancel' : '+ Record Vitals'}
                      </button>
                    </div>
                    
                    <AnimatePresence>
                      {showVitalsForm && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-4 gap-4 mb-4">
                            <div>
                              <label className="block text-xs font-medium text-black/50 mb-1">BP Systolic</label>
                              <input
                                type="number"
                                value={newVitals.bp_systolic}
                                onChange={(e) => setNewVitals(prev => ({ ...prev, bp_systolic: e.target.value }))}
                                placeholder="120"
                                className="w-full px-3 py-2 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-black/50 mb-1">BP Diastolic</label>
                              <input
                                type="number"
                                value={newVitals.bp_diastolic}
                                onChange={(e) => setNewVitals(prev => ({ ...prev, bp_diastolic: e.target.value }))}
                                placeholder="80"
                                className="w-full px-3 py-2 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-black/50 mb-1">Heart Rate</label>
                              <input
                                type="number"
                                value={newVitals.heart_rate}
                                onChange={(e) => setNewVitals(prev => ({ ...prev, heart_rate: e.target.value }))}
                                placeholder="72"
                                className="w-full px-3 py-2 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-black/50 mb-1">Temperature °F</label>
                              <input
                                type="number"
                                step="0.1"
                                value={newVitals.temperature}
                                onChange={(e) => setNewVitals(prev => ({ ...prev, temperature: e.target.value }))}
                                placeholder="98.6"
                                className="w-full px-3 py-2 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-black/50 mb-1">Respiratory Rate</label>
                              <input
                                type="number"
                                value={newVitals.respiratory_rate}
                                onChange={(e) => setNewVitals(prev => ({ ...prev, respiratory_rate: e.target.value }))}
                                placeholder="16"
                                className="w-full px-3 py-2 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-black/50 mb-1">O2 Saturation %</label>
                              <input
                                type="number"
                                value={newVitals.oxygen_saturation}
                                onChange={(e) => setNewVitals(prev => ({ ...prev, oxygen_saturation: e.target.value }))}
                                placeholder="98"
                                className="w-full px-3 py-2 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-black/50 mb-1">Weight (lbs)</label>
                              <input
                                type="number"
                                value={newVitals.weight}
                                onChange={(e) => setNewVitals(prev => ({ ...prev, weight: e.target.value }))}
                                placeholder="175"
                                className="w-full px-3 py-2 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-black/50 mb-1">Pain Level (0-10)</label>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={newVitals.pain_level}
                                onChange={(e) => setNewVitals(prev => ({ ...prev, pain_level: e.target.value }))}
                                placeholder="0"
                                className="w-full px-3 py-2 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20"
                              />
                            </div>
                          </div>
                          <button
                            onClick={submitVitals}
                            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all"
                          >
                            ✓ Save Vitals
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Vitals History Table */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/10">
                    <h3 className="font-semibold text-black mb-4">Vitals History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-black/5">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-black">Time</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-black">BP</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-black">HR</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-black">Temp</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-black">RR</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-black">O2</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {vitals.map((v, i) => (
                            <tr key={i} className="hover:bg-black/5">
                              <td className="px-4 py-3 text-black/60">{new Date(v.timestamp).toLocaleTimeString()}</td>
                              <td className="px-4 py-3 font-medium text-black">{v.bp_systolic}/{v.bp_diastolic}</td>
                              <td className="px-4 py-3 text-black">{v.heart_rate} bpm</td>
                              <td className="px-4 py-3 text-black">{v.temperature}°F</td>
                              <td className="px-4 py-3 text-black">{v.respiratory_rate}/min</td>
                              <td className="px-4 py-3 text-black">{v.oxygen_saturation}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Labs Tab */}
              {activeTab === 'labs' && selectedPatient && (
                <motion.div
                  key="labs"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-black/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-black">Lab Results - {selectedPatient.name}</h3>
                    <span className="text-sm text-black/50">Read-only view</span>
                  </div>
                  <div className="space-y-3">
                    {labs.map((lab, i) => (
                      <div key={i} className={`p-4 rounded-xl flex items-center justify-between ${
                        lab.status === 'critical' ? 'bg-red-50 border border-red-200' :
                        lab.status === 'high' || lab.status === 'low' ? 'bg-amber-50 border border-amber-200' :
                        'bg-black/5'
                      }`}>
                        <div>
                          <p className="font-medium text-black">{lab.test_name}</p>
                          <p className="text-sm text-black/50">Ref: {lab.reference_range} {lab.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${
                            lab.status === 'critical' ? 'text-red-600' :
                            lab.status === 'high' || lab.status === 'low' ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {lab.value} {lab.unit}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            lab.status === 'critical' ? 'bg-red-100 text-red-700' :
                            lab.status === 'high' ? 'bg-amber-100 text-amber-700' :
                            lab.status === 'low' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {lab.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Alerts Tab */}
              {activeTab === 'alerts' && (
                <motion.div
                  key="alerts"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {alerts.filter(a => !a.acknowledged).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-black">Active Alerts</h3>
                      {alerts.filter(a => !a.acknowledged).map((alert) => (
                        <div key={alert.id} className={`p-4 rounded-xl border-l-4 ${getPriorityColor(alert.priority)}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                              <div>
                                <p className="font-medium text-black">{alert.message}</p>
                                <p className="text-sm text-black/50">{new Date(alert.timestamp).toLocaleString()}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => acknowledgeAlert(alert.id)}
                              className="px-4 py-2 bg-white border border-black/10 rounded-lg hover:bg-black/5 text-sm"
                            >
                              Acknowledge
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {alerts.filter(a => a.acknowledged).length > 0 && (
                    <div className="space-y-3 mt-6">
                      <h3 className="font-semibold text-black/50">Acknowledged</h3>
                      {alerts.filter(a => a.acknowledged).map((alert) => (
                        <div key={alert.id} className="p-4 rounded-xl bg-black/5 opacity-60">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                            <div>
                              <p className="text-black/60">{alert.message}</p>
                              <p className="text-sm text-black/40">{new Date(alert.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tasks Tab */}
              {activeTab === 'tasks' && (
                <motion.div
                  key="tasks"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-black/10"
                >
                  <h3 className="font-semibold text-black mb-4">Task Checklist</h3>
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div 
                        key={task.id} 
                        className={`p-4 rounded-xl flex items-center justify-between ${
                          task.completed ? 'bg-green-50' : 'bg-black/5'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleTask(task.id)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              task.completed 
                                ? 'bg-green-500 border-green-500 text-white' 
                                : 'border-black/30 hover:border-black'
                            }`}
                          >
                            {task.completed && '✓'}
                          </button>
                          <div>
                            <p className={`font-medium ${task.completed ? 'text-black/40 line-through' : 'text-black'}`}>
                              {task.description}
                            </p>
                            <p className="text-sm text-black/50">Due: {task.due_time}</p>
                          </div>
                        </div>
                        <span className="text-sm text-black/40">{task.patient_id}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* No patient selected for vitals/labs */}
              {(activeTab === 'vitals' || activeTab === 'labs') && !selectedPatient && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl p-12 text-center shadow-sm border border-black/10"
                >
                  <p className="text-5xl mb-4">👈</p>
                  <p className="text-black/50">Select a patient to view {activeTab}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Access Restriction Notice */}
      <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded-lg text-sm shadow-lg">
        🔒 Care monitoring only • No prediction or diagnostic access
      </div>
    </div>
  );
}
