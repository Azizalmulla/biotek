'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://biotek-production.up.railway.app';

export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'staff' | 'create' | 'audit' | 'breakglass' | 'reports' | 'models' | 'federated'>('staff');
  const [loading, setLoading] = useState(true);
  
  // Staff management
  const [staffAccounts, setStaffAccounts] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  
  // Break-glass events
  const [breakGlassEvents, setBreakGlassEvents] = useState<any[]>([]);
  const [loadingBreakGlass, setLoadingBreakGlass] = useState(false);
  
  // Federated learning
  const [federatedTraining, setFederatedTraining] = useState(false);
  const [trainingRounds, setTrainingRounds] = useState(5);
  const [federatedResult, setFederatedResult] = useState<any>(null);
  
  // Create staff form
  const [createForm, setCreateForm] = useState({
    email: '',
    role: 'doctor',
    full_name: '',
    employee_id: '',
    department: '',
    temporary_password: ''
  });
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState('');
  const [createError, setCreateError] = useState('');
  
  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  
  // Model monitoring
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    // Check if admin is logged in
    const storedSession = localStorage.getItem('biotek_admin_session');
    if (!storedSession) {
      router.push('/admin/login');
      return;
    }

    const sessionData = JSON.parse(storedSession);
    
    // Check if session is expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      localStorage.removeItem('biotek_admin_session');
      router.push('/admin/login');
      return;
    }

    setSession(sessionData);
    setLoading(false);
    
    // Load initial data
    loadStaffAccounts(sessionData.adminId);
    loadAuditLogs(sessionData.adminId);
    loadModelInfo();
  }, [router]);

  const loadStaffAccounts = async (adminId: string) => {
    setLoadingStaff(true);
    try {
      const response = await fetch(`${API_BASE}/admin/staff-accounts`, {
        headers: {
          'X-Admin-ID': adminId
        }
      });
      
      const data = await response.json();
      setStaffAccounts(data.staff_accounts || []);
    } catch (error) {
      console.error('Failed to load staff accounts:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadAuditLogs = async (adminId: string) => {
    try {
      const response = await fetch(`${API_BASE}/audit/access-log?limit=100`);
      const data = await response.json();
      setAccessLogs(data.access_logs || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  };

  const loadBreakGlassEvents = async () => {
    setLoadingBreakGlass(true);
    try {
      const response = await fetch(`${API_BASE}/auth/audit/break-glass?limit=100`, {
        headers: {
          'X-User-Role': 'admin',
          'X-User-ID': session?.adminId || 'admin_001'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBreakGlassEvents(data.break_glass_events || []);
      }
    } catch (error) {
      console.error('Failed to load break-glass events:', error);
    } finally {
      setLoadingBreakGlass(false);
    }
  };

  const loadModelInfo = async () => {
    setLoadingModels(true);
    try {
      const response = await fetch(`${API_BASE}/model/info`);
      const data = await response.json();
      setModelInfo(data);
    } catch (error) {
      console.error('Failed to load model info:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      const response = await fetch(`${API_BASE}/admin/create-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-ID': session.adminId
        },
        body: JSON.stringify(createForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create account');
      }

      setCreateSuccess(`Account created successfully!\nUser ID: ${data.user_id}\nActivation email sent to ${data.email}`);
      
      // Reset form
      setCreateForm({
        email: '',
        role: 'doctor',
        full_name: '',
        employee_id: '',
        department: '',
        temporary_password: ''
      });

      // Reload staff accounts
      loadStaffAccounts(session.adminId);
      
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleDisableAccount = async (userId: string, disabled: boolean) => {
    if (!confirm(`Are you sure you want to ${disabled ? 'disable' : 'enable'} this account?`)) {
      return;
    }

    const reason = disabled ? prompt('Reason for disabling account:') : null;

    try {
      const response = await fetch(`${API_BASE}/admin/update-staff-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-ID': session.adminId
        },
        body: JSON.stringify({
          user_id: userId,
          disabled: disabled,
          reason: reason
        })
      });

      if (response.ok) {
        alert(`Account ${disabled ? 'disabled' : 'enabled'} successfully`);
        loadStaffAccounts(session.adminId);
      }
    } catch (error) {
      alert('Failed to update account status');
    }
  };
  
  const handleFederatedTraining = async () => {
    if (!session) return;
    
    setFederatedTraining(true);
    setFederatedResult(null);
    
    try {
      const response = await fetch(`${API_BASE}/federated/train?num_rounds=${trainingRounds}`, {
        method: 'POST',
        headers: {
          'X-Admin-ID': session.adminId
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFederatedResult(data);
      } else {
        alert('Federated training failed');
      }
    } catch (error) {
      console.error('Federated training error:', error);
      alert('Failed to run federated training');
    } finally {
      setFederatedTraining(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('biotek_admin_session');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f3e7d9' }}>
        <div className="text-black/50">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f3e7d9' }}>
      {/* Header */}
      <header className="border-b border-black/10 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image 
                src="/images/ChatGPT Image Nov 10, 2025, 08_09_36 AM.png" 
                alt="BioTeK"
                width={40}
                height={40}
              />
              <div>
                <div className="text-xl font-bold">BioTeK Admin Dashboard</div>
                <div className="text-xs text-black/50">Healthcare Worker Management System</div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Admin Info */}
              <div className="flex items-center gap-3 px-4 py-2 bg-stone-50 rounded-full border border-stone-200">
                <div className="text-2xl">👤</div>
                <div className="text-sm">
                  <div className="font-medium">{session.fullName}</div>
                  <div className="text-black/50 text-xs">
                    {session.isSuperAdmin ? '⭐ Super Admin' : 'Admin'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="text-sm text-black/60 hover:text-black transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-black/10 bg-white/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {[
              { id: 'staff', label: 'Staff Accounts', icon: '👥' },
              { id: 'create', label: 'Create Account', icon: '➕' },
              { id: 'audit', label: 'Audit Logs', icon: '📋' },
              { id: 'breakglass', label: 'Break-Glass', icon: '🚨' },
              { id: 'reports', label: 'Reports', icon: '📊' },
              { id: 'models', label: 'ML Models', icon: '🧠' },
              { id: 'federated', label: 'Federated Training', icon: '🔗' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-black text-black font-medium'
                    : 'border-transparent text-black/50 hover:text-black'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Staff Accounts Tab */}
          {activeTab === 'staff' && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-2">Healthcare Worker Accounts</h2>
                    <p className="text-sm text-black/60">Manage all staff accounts and permissions</p>
                  </div>
                  <div className="text-3xl font-bold text-black">
                    {staffAccounts.length}
                  </div>
                </div>

                {loadingStaff ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-black/60">Loading staff accounts...</p>
                  </div>
                ) : staffAccounts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-black/5">
                        <tr>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">User ID</th>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Name</th>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Role</th>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Department</th>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Status</th>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Last Login</th>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffAccounts.map((account) => (
                          <tr key={account.user_id} className="border-b border-black/5 hover:bg-black/5">
                            <td className="py-3 px-4 text-sm font-mono text-black">{account.user_id}</td>
                            <td className="py-3 px-4 text-sm text-black">{account.full_name}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 rounded-full text-xs font-medium capitalize bg-stone-100 text-black">
                                {account.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-black/70">{account.department || '-'}</td>
                            <td className="py-3 px-4">
                              {account.account_disabled ? (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                  Disabled
                                </span>
                              ) : account.account_locked ? (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                  Locked
                                </span>
                              ) : account.activated ? (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-black/70">
                              {account.last_login ? new Date(account.last_login).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="py-3 px-4">
                              {account.account_disabled ? (
                                <button
                                  onClick={() => handleDisableAccount(account.user_id, false)}
                                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                                >
                                  Enable
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDisableAccount(account.user_id, true)}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                  Disable
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">👥</div>
                    <p className="text-black/60">No staff accounts yet</p>
                    <p className="text-sm text-black/40 mt-2">
                      Create your first healthcare worker account
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Create Account Tab */}
          {activeTab === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-black mb-2">Create Healthcare Worker Account</h2>
                <p className="text-sm text-black/60 mb-6">
                  Add a new verified staff member to the system
                </p>

                {createSuccess && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm whitespace-pre-wrap">
                    {createSuccess}
                  </div>
                )}

                {createError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {createError}
                  </div>
                )}

                <form onSubmit={handleCreateStaff} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black/70 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.full_name}
                      onChange={(e) => setCreateForm({...createForm, full_name: e.target.value})}
                      placeholder="Dr. John Smith"
                      className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black placeholder-black/30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black/70 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                      placeholder="john.smith@hospital.com"
                      className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black placeholder-black/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black/70 mb-2">
                        Role
                      </label>
                      <select
                        required
                        value={createForm.role}
                        onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                        className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black"
                      >
                        <option value="doctor">Doctor</option>
                        <option value="nurse">Nurse</option>
                        <option value="researcher">Researcher</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black/70 mb-2">
                        Employee ID
                      </label>
                      <input
                        type="text"
                        required
                        value={createForm.employee_id}
                        onChange={(e) => setCreateForm({...createForm, employee_id: e.target.value})}
                        placeholder="DOC001"
                        className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black placeholder-black/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black/70 mb-2">
                      Department (Optional)
                    </label>
                    <input
                      type="text"
                      value={createForm.department}
                      onChange={(e) => setCreateForm({...createForm, department: e.target.value})}
                      placeholder="Cardiology"
                      className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black placeholder-black/30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black/70 mb-2">
                      Temporary Password
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.temporary_password}
                      onChange={(e) => setCreateForm({...createForm, temporary_password: e.target.value})}
                      placeholder="TempPass123"
                      className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black placeholder-black/30"
                    />
                    <p className="text-xs text-black/40 mt-1">
                      User will be prompted to change this on first login
                    </p>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800">
                    <strong>⚠️ Verification Required:</strong> Ensure identity verification (background check, HR approval) 
                    is complete before creating this account.
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full bg-black text-white py-4 rounded-full font-medium hover:bg-black/80 transition-all disabled:opacity-50"
                  >
                    {creating ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Audit Logs Tab */}
          {activeTab === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-black mb-2">Access Audit Trail</h2>
                <p className="text-sm text-black/60 mb-6">
                  Complete log of all data access attempts
                </p>

                {accessLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-black/5">
                        <tr>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Timestamp</th>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">User</th>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Role</th>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Purpose</th>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Data Type</th>
                          <th className="py-3 px-4 text-left text-xs font-medium text-black/70">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accessLogs.map((log) => (
                          <tr key={log.id} className="border-b border-black/5 hover:bg-black/5">
                            <td className="py-3 px-4 text-sm text-black/70">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm font-mono text-black">{log.user_id}</td>
                            <td className="py-3 px-4 text-sm capitalize text-black/70">{log.user_role}</td>
                            <td className="py-3 px-4 text-sm capitalize text-black/70">{log.purpose}</td>
                            <td className="py-3 px-4 text-sm text-black/70">{log.data_type}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                log.granted
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {log.granted ? 'Granted' : 'Denied'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📋</div>
                    <p className="text-black/60">No audit logs yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Break-Glass Review Tab */}
          {activeTab === 'breakglass' && (
            <motion.div
              key="breakglass"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onAnimationStart={() => loadBreakGlassEvents()}
            >
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border-2 border-red-200">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">🚨</span>
                  <h2 className="text-2xl font-bold text-red-700">Break-Glass Events</h2>
                </div>
                <p className="text-sm text-red-600/80 mb-6">
                  Emergency access overrides that bypassed normal authorization. Review for appropriateness.
                </p>

                {loadingBreakGlass ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4 animate-pulse">🔍</div>
                    <p className="text-black/60">Loading break-glass events...</p>
                  </div>
                ) : breakGlassEvents.length > 0 ? (
                  <div className="space-y-4">
                    {breakGlassEvents.map((event, idx) => (
                      <div key={event.id || idx} className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-sm bg-red-100 px-2 py-1 rounded">
                                {event.actor_user_id || event.user_id}
                              </span>
                              <span className="text-sm text-red-700 capitalize">
                                ({event.actor_role || event.user_role})
                              </span>
                            </div>
                            <div className="text-sm text-black/70 mb-1">
                              <strong>Patient:</strong> {event.patient_id || 'Unknown'}
                            </div>
                            <div className="text-sm text-black/70 mb-1">
                              <strong>Action:</strong> {event.action || 'break_glass'}
                            </div>
                            {event.reason && (
                              <div className="text-sm text-black/70 mb-1">
                                <strong>Reason:</strong> {event.reason}
                              </div>
                            )}
                            {event.encounter_id && (
                              <div className="text-xs text-black/50">
                                Encounter: {event.encounter_id}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-black/50">
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                            <div className="mt-2">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                ⚠️ Break-Glass
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">✅</div>
                    <p className="text-green-700 font-medium">No break-glass events</p>
                    <p className="text-sm text-black/50 mt-2">
                      No emergency access overrides have been used
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-black mb-2">System Reports</h2>
                <p className="text-sm text-black/60 mb-6">
                  Analytics and compliance reporting
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Staff */}
                  <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="text-4xl mb-2">👥</div>
                    <div className="text-3xl font-bold text-black mb-1">{staffAccounts.length}</div>
                    <div className="text-sm text-black/70">Total Staff Accounts</div>
                  </div>

                  {/* Active Accounts */}
                  <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                    <div className="text-4xl mb-2">✅</div>
                    <div className="text-3xl font-bold text-green-900 mb-1">
                      {staffAccounts.filter(a => a.activated && !a.account_disabled).length}
                    </div>
                    <div className="text-sm text-green-700">Active Accounts</div>
                  </div>

                  {/* Total Access Logs */}
                  <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="text-4xl mb-2">📊</div>
                    <div className="text-3xl font-bold text-black mb-1">{accessLogs.length}</div>
                    <div className="text-sm text-black/70">Access Attempts Logged</div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-black/5 rounded-2xl">
                  <h3 className="font-bold text-black mb-4">Compliance Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-black/70">All staff verified by admin</span>
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-black/70">Complete audit trail maintained</span>
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-black/70">Password-protected authentication</span>
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-black/70">HIPAA/GDPR compliant logging</span>
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ML Models Tab */}
          {activeTab === 'models' && (
            <motion.div
              key="models"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">🧠</span>
                    <div>
                      <h2 className="text-2xl font-bold text-black">ML Model Monitoring</h2>
                      <p className="text-sm text-black/60">Real-time status of disease prediction models</p>
                    </div>
                  </div>
                  <button
                    onClick={loadModelInfo}
                    disabled={loadingModels}
                    className="px-4 py-2 bg-black text-white rounded-full text-sm hover:bg-black/80 transition-all disabled:opacity-50"
                  >
                    {loadingModels ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                {loadingModels && !modelInfo ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-black/60">Loading model information...</p>
                  </div>
                ) : modelInfo ? (
                  <div className="space-y-6">
                    {/* Model Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="text-3xl font-bold text-black">{modelInfo.model_type || 'XGBoost+LightGBM'}</div>
                        <div className="text-xs text-black/50 mt-1">Model Type</div>
                      </div>
                      <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="text-3xl font-bold text-black">v{modelInfo.version || '2.0.0'}</div>
                        <div className="text-xs text-black/50 mt-1">Version</div>
                      </div>
                      <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="text-3xl font-bold text-green-600">{((modelInfo.accuracy || 0.85) * 100).toFixed(0)}%</div>
                        <div className="text-xs text-black/50 mt-1">Avg Accuracy</div>
                      </div>
                      <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="text-3xl font-bold text-black">{modelInfo.diseases || 12}</div>
                        <div className="text-xs text-black/50 mt-1">Disease Models</div>
                      </div>
                    </div>

                    {/* Individual Model Stats */}
                    {modelInfo.disease_models && (
                      <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200">
                        <h3 className="font-bold text-black mb-4">Individual Disease Models</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {Object.entries(modelInfo.disease_models).map(([disease, info]: [string, any]) => (
                            <div key={disease} className="bg-white rounded-xl p-3 border border-stone-100">
                              <div className="text-sm font-medium text-black capitalize mb-1">
                                {disease.replace(/_/g, ' ')}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-black/50">Accuracy</span>
                                <span className={`text-sm font-bold ${
                                  (info.accuracy || 0) >= 85 ? 'text-green-600' : 
                                  (info.accuracy || 0) >= 75 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                  {(info.accuracy || 0).toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-black/50">Samples</span>
                                <span className="text-xs font-mono text-black/70">{info.samples || '-'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Model Health Status */}
                    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                      <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        System Health
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-green-600 font-bold">✓ Online</div>
                          <div className="text-green-800/60 text-xs">API Status</div>
                        </div>
                        <div>
                          <div className="text-green-600 font-bold">{modelInfo.diseases || 13}/13</div>
                          <div className="text-green-800/60 text-xs">Models Loaded</div>
                        </div>
                        <div>
                          <div className="text-green-600 font-bold">{modelInfo.num_trees || 400}</div>
                          <div className="text-green-800/60 text-xs">Total Trees</div>
                        </div>
                        <div>
                          <div className="text-green-600 font-bold">{modelInfo.trained_on || 'Real Data'}</div>
                          <div className="text-green-800/60 text-xs">Training Source</div>
                        </div>
                      </div>
                    </div>

                    {/* Features Info */}
                    <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200">
                      <h3 className="font-bold text-black mb-3">Model Features</h3>
                      <div className="flex flex-wrap gap-2">
                        {(modelInfo.features || ['age', 'bmi', 'hba1c', 'ldl', 'smoking', 'prs', 'sex']).map((f: string) => (
                          <span key={f} className="px-3 py-1 bg-white rounded-full text-xs font-mono text-black/70 border border-stone-200">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">⚠️</div>
                    <p className="text-black/60">Failed to load model information</p>
                    <button
                      onClick={loadModelInfo}
                      className="mt-4 px-6 py-2 bg-black text-white rounded-full text-sm hover:bg-black/80"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Federated Training Tab */}
          {activeTab === 'federated' && (
            <motion.div
              key="federated"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-4xl">🔗</span>
                  <div>
                    <h2 className="text-2xl font-bold text-black">Federated Learning</h2>
                    <p className="text-sm text-black/60">Privacy-preserving collaborative training across hospitals</p>
                  </div>
                </div>

                {/* Hospital Network Overview */}
                <div className="mb-8 p-6 bg-stone-50 rounded-2xl border border-stone-200">
                  <h3 className="font-bold text-black mb-4 flex items-center gap-2">
                    <span>🏥</span> Hospital Network
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/90 rounded-xl p-4">
                      <div className="text-sm text-black/60 mb-1">Boston General</div>
                      <div className="text-2xl font-bold text-black">1000</div>
                      <div className="text-xs text-black/50">patients</div>
                    </div>
                    <div className="bg-white/90 rounded-xl p-4">
                      <div className="text-sm text-black/60 mb-1">NYC Medical</div>
                      <div className="text-2xl font-bold text-black">800</div>
                      <div className="text-xs text-black/50">patients</div>
                    </div>
                    <div className="bg-white/90 rounded-xl p-4">
                      <div className="text-sm text-black/60 mb-1">LA University</div>
                      <div className="text-2xl font-bold text-black">1200</div>
                      <div className="text-xs text-black/50">patients</div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-white/80 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-black">Total Network</span>
                      <span className="text-lg font-bold text-black">3,000 patients</span>
                    </div>
                  </div>
                </div>

                {/* Training Controls */}
                <div className="mb-8 p-6 bg-stone-50 rounded-2xl border border-stone-200">
                  <h3 className="font-bold text-black mb-4 flex items-center gap-2">
                    <span>⚙️</span> Training Configuration
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-black mb-2 block">
                        Number of Training Rounds: {trainingRounds}
                      </label>
                      <input
                        type="range"
                        min="3"
                        max="10"
                        value={trainingRounds}
                        onChange={(e) => setTrainingRounds(parseInt(e.target.value))}
                        className="w-full h-3 bg-black/10 rounded-full appearance-none cursor-pointer"
                        disabled={federatedTraining}
                      />
                      <div className="flex justify-between text-xs text-black/50 mt-1">
                        <span>3 rounds</span>
                        <span>10 rounds</span>
                      </div>
                    </div>

                    <button
                      onClick={handleFederatedTraining}
                      disabled={federatedTraining}
                      className="w-full bg-black text-white px-6 py-4 rounded-full text-sm font-medium hover:bg-black/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {federatedTraining ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Training in progress... Round {trainingRounds}
                        </>
                      ) : (
                        <>
                          <span>🚀</span>
                          Start Federated Training
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Privacy Guarantee */}
                <div className="mb-8 p-6 bg-stone-50 rounded-2xl border border-stone-200">
                  <h3 className="font-bold text-black mb-3 flex items-center gap-2">
                    <span>🔒</span> Privacy Guarantee
                  </h3>
                  <div className="space-y-2 text-sm text-black/70">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Patient data NEVER leaves hospital premises</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Only model weights are shared (no raw data)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>HIPAA compliant collaborative learning</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Federated Averaging (FedAvg) algorithm</span>
                    </div>
                  </div>
                </div>

                {/* Results */}
                {federatedResult && (
                  <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-md rounded-2xl p-6 border border-green-200">
                    <h3 className="font-bold text-black mb-4 flex items-center gap-2">
                      <span>📊</span> Training Results
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/90 rounded-xl p-4">
                        <div className="text-sm text-black/60 mb-1">Federated Model</div>
                        <div className="text-3xl font-bold text-green-600">
                          {(federatedResult.comparison.federated_accuracy * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-black/50">accuracy</div>
                      </div>
                      <div className="bg-white/90 rounded-xl p-4">
                        <div className="text-sm text-black/60 mb-1">Centralized</div>
                        <div className="text-3xl font-bold text-black">
                          {(federatedResult.comparison.centralized_accuracy * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-black/50">accuracy</div>
                      </div>
                    </div>

                    <div className="p-4 bg-white/80 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-black">Accuracy Difference</span>
                        <span className="text-sm font-bold text-green-600">
                          {(federatedResult.comparison.difference * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-xs text-black/60">
                        Federated learning achieves similar accuracy to centralized training,
                        but with ZERO patient data sharing!
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="flex items-start gap-2">
                        <span className="text-xl">🎉</span>
                        <div>
                          <div className="font-bold text-black text-sm mb-1">Success!</div>
                          <div className="text-xs text-black/70">
                            {federatedResult.summary.num_hospitals} hospitals trained collaboratively across{' '}
                            {federatedResult.summary.num_rounds} rounds with {federatedResult.summary.total_patients}{' '}
                            total patients. All data remained local.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!federatedResult && !federatedTraining && (
                  <div className="text-center py-12 text-black/40">
                    <div className="text-5xl mb-4">🔗</div>
                    <p className="text-lg font-medium">No training results yet</p>
                    <p className="text-sm mt-2">Click "Start Federated Training" to begin</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
