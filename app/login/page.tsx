'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';

// Hardcoded for production
const API_BASE = 'https://biotek-production.up.railway.app';
console.log('🔥 LOGIN PAGE LOADED - API_BASE:', API_BASE);
console.log('🔥 BUILD TIME:', new Date().toISOString());

const roles = [
  {
    id: 'doctor',
    name: 'Doctor',
    icon: '👨‍⚕️',
    description: 'Access patient data for treatment and diagnosis',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'nurse',
    name: 'Nurse',
    icon: '👩‍⚕️',
    description: 'View clinical data and assist in patient care',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'researcher',
    name: 'Researcher',
    icon: '🔬',
    description: 'Access anonymized data for studies',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'admin',
    name: 'Administrator',
    icon: '⚙️',
    description: 'System management and quality improvement',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'patient',
    name: 'Patient',
    icon: '🧑',
    description: 'View your own medical records',
    color: 'from-indigo-500 to-blue-500'
  },
  {
    id: 'receptionist',
    name: 'Receptionist',
    icon: '📋',
    description: 'Patient registration and scheduling',
    color: 'from-yellow-500 to-amber-500'
  }
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!selectedRole || !userId.trim()) {
      setError('Please select a role and enter a user ID');
      return;
    }

    // For patients, require password
    if (selectedRole === 'patient' && !password) {
      setError('Password is required for patient accounts');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let response, data;

      // Different endpoint for patients vs healthcare workers
      if (selectedRole === 'patient') {
        // Patient login with password verification
        response = await fetch(`${API_BASE}/auth/login-patient`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: userId,
            password: password
          })
        });
      } else {
        // Healthcare worker login with password (admin-created accounts)
        if (!password) {
          setError('Password is required for all staff accounts');
          setLoading(false);
          return;
        }
        
        response = await fetch(`${API_BASE}/auth/login-staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            password: password
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      data = await response.json();
      
      // Store session in localStorage
      const sessionData: any = {
        sessionId: data.session_id,
        allowedPurposes: data.allowed_purposes,
        expiresAt: data.expires_at,
        accessToken: data.access_token
      };

      // Different fields for patient vs healthcare worker
      if (selectedRole === 'patient') {
        sessionData.userId = data.patient_id;
        sessionData.role = 'patient';
        sessionData.email = data.email;
      } else {
        // Staff member
        sessionData.userId = data.user_id;
        sessionData.role = data.role;
        sessionData.email = data.email;
        sessionData.fullName = data.full_name;
      }

      localStorage.setItem('biotek_session', JSON.stringify(sessionData));

      // Redirect based on role
      const roleRoutes: Record<string, string> = {
        patient: '/consent',           // Patients → consent → patient-dashboard
        doctor: '/platform',           // Doctors → full platform
        nurse: '/platform',            // Nurses → platform (limited tabs)
        researcher: '/researcher',     // Researchers → research portal
        receptionist: '/receptionist', // Receptionists → reception desk
        admin: '/admin',               // Admins → admin dashboard
      };
      router.push(roleRoutes[sessionData.role] || '/platform');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f3e7d9] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-black/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-black/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Logo & Header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image 
              src="/images/ChatGPT Image Nov 10, 2025, 08_09_36 AM.png" 
              alt="BioTeK"
              width={64}
              height={64}
              className="rounded-2xl"
            />
            <h1 className="text-5xl font-bold text-black">BioTeK</h1>
          </div>
          <p className="text-xl text-black/60">
            Privacy-First Genomic Risk Prediction Platform
          </p>
          <p className="text-sm text-black/40 mt-2">
            Role-Based Access Control • Purpose-Limited Data Access
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-4xl bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl"
        >
          <h2 className="text-2xl font-bold text-black mb-2">Select Your Role</h2>
          <p className="text-black/60 mb-6">
            Choose your role to access appropriate data and features
          </p>

          {/* User ID Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-black/70 mb-2">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your user ID"
              className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none transition-all text-black placeholder-black/30"
            />
          </div>

          {/* Password Input (for all roles) */}
          {selectedRole && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-black/70 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none transition-all text-black placeholder-black/30"
              />
              {selectedRole === 'patient' ? (
                <p className="text-xs text-black/40 mt-2">
                  New patient? <a href="/patient-registration" className="text-black font-medium hover:underline">Register here</a>
                </p>
              ) : (
                <p className="text-xs text-black/40 mt-2">
                  Staff accounts are created by administrators
                </p>
              )}
            </div>
          )}

          {/* Role Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  selectedRole === role.id
                    ? 'border-black bg-black/5 shadow-lg scale-105'
                    : 'border-black/10 hover:border-black/20 hover:bg-black/5'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-4xl">{role.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-black text-lg">{role.name}</h3>
                    {selectedRole === role.id && (
                      <span className="text-xs text-black/60">Selected</span>
                    )}
                  </div>
                  {selectedRole === role.id && (
                    <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-black/60">{role.description}</p>
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading || !selectedRole || !userId.trim()}
            className="w-full bg-black text-white py-4 rounded-full font-medium hover:bg-black/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                Continue with {selectedRole ? roles.find(r => r.id === selectedRole)?.name : 'Selected Role'}
                <span>→</span>
              </>
            )}
          </button>

          {/* Privacy Notice */}
          <div className="mt-6 p-4 bg-black/5 rounded-xl">
            <p className="text-xs text-black/60 leading-relaxed">
              <strong>Privacy & Access Control:</strong> This system implements Role-Based Access Control (RBAC) 
              and the Hippocratic Database model. Your role determines what data you can access, and you must 
              declare a valid purpose for each access. All data access is logged and auditable.
            </p>
          </div>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 text-center text-sm text-black/40"
        >
          <p>HIPAA & GDPR Compliant • Differential Privacy (ε=3.0) • Federated Learning</p>
        </motion.div>
      </div>
    </main>
  );
}
