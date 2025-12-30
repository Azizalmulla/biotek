'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface Patient {
  patient_id: string;
  full_name: string;
  phone: string;
  dob: string;
  insurance_status?: string;
  created_at: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  date: string;
  time: string;
  type: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  doctor: string;
}

export default function ReceptionistDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'patients' | 'appointments'>('patients');
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  // New patient form
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    phone: '',
    dob: '',
    email: '',
    insurance_provider: '',
    insurance_id: ''
  });

  // New appointment form
  const [newAppointment, setNewAppointment] = useState({
    patient_id: '',
    date: '',
    time: '',
    type: 'checkup',
    doctor: ''
  });

  useEffect(() => {
    const stored = localStorage.getItem('biotek_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.role !== 'receptionist') {
        router.push('/login');
        return;
      }
      setSession(parsed);
      loadPatients();
      loadAppointments();
    } else {
      router.push('/login');
    }
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://biotek-production.up.railway.app';
      const res = await fetch(`${API_URL}/receptionist/patients`, {
        headers: {
          'X-User-Role': 'receptionist',
          'X-User-ID': session?.user_id || 'receptionist'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      }
    } catch (e) {
      console.error('Failed to load patients:', e);
    }
    setLoading(false);
  };

  const loadAppointments = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://biotek-production.up.railway.app';
      const res = await fetch(`${API_URL}/receptionist/appointments`, {
        headers: {
          'X-User-Role': 'receptionist',
          'X-User-ID': session?.user_id || 'receptionist'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (e) {
      console.error('Failed to load appointments:', e);
    }
  };

  const createPatient = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://biotek-production.up.railway.app';
      const res = await fetch(`${API_URL}/receptionist/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'receptionist',
          'X-User-ID': session?.user_id || 'receptionist'
        },
        body: JSON.stringify(newPatient)
      });
      if (res.ok) {
        setShowNewPatient(false);
        setNewPatient({ full_name: '', phone: '', dob: '', email: '', insurance_provider: '', insurance_id: '' });
        loadPatients();
      }
    } catch (e) {
      console.error('Failed to create patient:', e);
    }
  };

  const createAppointment = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://biotek-production.up.railway.app';
      const res = await fetch(`${API_URL}/receptionist/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'receptionist',
          'X-User-ID': session?.user_id || 'receptionist'
        },
        body: JSON.stringify(newAppointment)
      });
      if (res.ok) {
        setShowNewAppointment(false);
        setNewAppointment({ patient_id: '', date: '', time: '', type: 'checkup', doctor: '' });
        loadAppointments();
      }
    } catch (e) {
      console.error('Failed to create appointment:', e);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://biotek-production.up.railway.app';
      await fetch(`${API_URL}/receptionist/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'receptionist',
          'X-User-ID': session?.user_id || 'receptionist'
        },
        body: JSON.stringify({ status })
      });
      loadAppointments();
    } catch (e) {
      console.error('Failed to update appointment:', e);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone?.includes(searchQuery) ||
    p.patient_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayAppointments = appointments.filter(a => {
    const today = new Date().toISOString().split('T')[0];
    return a.date === today;
  });

  const handleSignOut = () => {
    localStorage.removeItem('biotek_session');
    router.push('/login');
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-amber-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold">
                B
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Reception Desk</h1>
                <p className="text-sm text-gray-500">Patient Registration & Scheduling</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                Receptionist
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

      {/* Stats Bar */}
      <div className="bg-white/60 border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{patients.length}</p>
              <p className="text-sm text-gray-500">Total Patients</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{todayAppointments.length}</p>
              <p className="text-sm text-gray-500">Today's Appointments</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {appointments.filter(a => a.status === 'confirmed').length}
              </p>
              <p className="text-sm text-gray-500">Confirmed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {appointments.filter(a => a.status === 'scheduled').length}
              </p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-amber-100 bg-white/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {[
              { id: 'patients', label: 'Patient Registry', icon: '👤' },
              { id: 'appointments', label: 'Appointments', icon: '📅' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-700 font-medium'
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
        {activeTab === 'patients' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Search & Add */}
            <div className="flex items-center justify-between mb-6">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search by name, phone, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              <button
                onClick={() => setShowNewPatient(true)}
                className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium"
              >
                + New Patient
              </button>
            </div>

            {/* Patient List */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-amber-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Patient</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Phone</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">DOB</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Insurance</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        {loading ? 'Loading...' : 'No patients found. Register a new patient to get started.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient) => (
                      <tr key={patient.patient_id} className="hover:bg-amber-50/50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{patient.full_name}</p>
                            <p className="text-sm text-gray-500">{patient.patient_id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{patient.phone || '-'}</td>
                        <td className="px-6 py-4 text-gray-600">{patient.dob || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            patient.insurance_status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {patient.insurance_status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => {
                              setNewAppointment({ ...newAppointment, patient_id: patient.patient_id });
                              setShowNewAppointment(true);
                            }}
                            className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                          >
                            Book Appointment
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'appointments' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Add Appointment */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
              <button
                onClick={() => setShowNewAppointment(true)}
                className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium"
              >
                + New Appointment
              </button>
            </div>

            {/* Appointments Grid */}
            <div className="grid gap-4">
              {appointments.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center text-gray-500 border border-amber-100">
                  No appointments scheduled. Create one to get started.
                </div>
              ) : (
                appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-white rounded-xl p-6 border border-amber-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-6">
                      <div className="text-center min-w-[80px]">
                        <p className="text-2xl font-bold text-amber-600">{apt.time}</p>
                        <p className="text-sm text-gray-500">{apt.date}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{apt.patient_name || apt.patient_id}</p>
                        <p className="text-sm text-gray-500">{apt.type} • Dr. {apt.doctor}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        apt.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {apt.status}
                      </span>
                      {apt.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}
                            className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* New Patient Modal */}
      {showNewPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl"
          >
            <h3 className="text-xl font-semibold mb-6">Register New Patient</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full Name *"
                value={newPatient.full_name}
                onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="tel"
                placeholder="Phone Number *"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="date"
                placeholder="Date of Birth"
                value={newPatient.dob}
                onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={newPatient.email}
                onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-gray-500 mb-2">Insurance (optional)</p>
                <input
                  type="text"
                  placeholder="Insurance Provider"
                  value={newPatient.insurance_provider}
                  onChange={(e) => setNewPatient({ ...newPatient, insurance_provider: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2"
                />
                <input
                  type="text"
                  placeholder="Insurance ID"
                  value={newPatient.insurance_id}
                  onChange={(e) => setNewPatient({ ...newPatient, insurance_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewPatient(false)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createPatient}
                disabled={!newPatient.full_name || !newPatient.phone}
                className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50"
              >
                Register Patient
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* New Appointment Modal */}
      {showNewAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl"
          >
            <h3 className="text-xl font-semibold mb-6">Book Appointment</h3>
            <div className="space-y-4">
              <select
                value={newAppointment.patient_id}
                onChange={(e) => setNewAppointment({ ...newAppointment, patient_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select Patient *</option>
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>{p.full_name}</option>
                ))}
              </select>
              <input
                type="date"
                value={newAppointment.date}
                onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="time"
                value={newAppointment.time}
                onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <select
                value={newAppointment.type}
                onChange={(e) => setNewAppointment({ ...newAppointment, type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="checkup">General Checkup</option>
                <option value="followup">Follow-up</option>
                <option value="consultation">Consultation</option>
                <option value="procedure">Procedure</option>
              </select>
              <input
                type="text"
                placeholder="Doctor Name"
                value={newAppointment.doctor}
                onChange={(e) => setNewAppointment({ ...newAppointment, doctor: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewAppointment(false)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createAppointment}
                disabled={!newAppointment.patient_id || !newAppointment.date || !newAppointment.time}
                className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50"
              >
                Book Appointment
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
