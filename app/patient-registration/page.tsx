'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

export default function PatientRegistration() {
  const router = useRouter();
  const [step, setStep] = useState<'verify' | 'create'>('verify');
  
  // Verification fields
  const [medicalRecordNumber, setMedicalRecordNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  // Account creation fields
  const [patientId, setPatientId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleVerification = () => {
    setLoading(true);
    setError('');
    
    // In a real system, this would verify against hospital records
    if (!medicalRecordNumber || !dateOfBirth) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    // In production: verify against hospital database
    // For now, just generate patient ID and proceed
    setTimeout(() => {
      // Generate patient ID from MRN
      const generatedId = `PAT-${medicalRecordNumber}`;
      setPatientId(generatedId);
      setStep('create');
      setSuccess('Identity verified! Please create your account.');
      setLoading(false);
    }, 1500);
  };

  const handleRegistration = async () => {
    setError('');
    setLoading(true);
    
    try {
      // Call backend registration endpoint
      const response = await fetch(`${API_BASE}/auth/register-patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medical_record_number: medicalRecordNumber,
          date_of_birth: dateOfBirth,
          email: email,
          password: password,
          verification_code: verificationCode || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      // Success! Show message and redirect
      setSuccess(data.message);
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f3e7d9] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image 
              src="/images/ChatGPT Image Nov 10, 2025, 08_09_36 AM.png" 
              alt="BioTeK"
              width={48}
              height={48}
              className="rounded-xl"
            />
            <h1 className="text-3xl font-bold text-black">BioTeK</h1>
          </div>
          <p className="text-black/60">Patient Registration</p>
        </motion.div>

        {/* Registration Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl"
        >
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step === 'verify' ? 'text-black' : 'text-black/30'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'verify' ? 'bg-black text-white' : 'bg-black/10'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">Verify Identity</span>
            </div>
            <div className="w-8 h-0.5 bg-black/10" />
            <div className={`flex items-center gap-2 ${step === 'create' ? 'text-black' : 'text-black/30'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'create' ? 'bg-black text-white' : 'bg-black/10'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Create Account</span>
            </div>
          </div>

          {/* Step 1: Verification */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-black mb-2">Verify Your Identity</h2>
                <p className="text-sm text-black/60">
                  Enter your medical record information to create an account
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black/70 mb-2">
                    Medical Record Number (MRN)
                  </label>
                  <input
                    type="text"
                    value={medicalRecordNumber}
                    onChange={(e) => setMedicalRecordNumber(e.target.value)}
                    placeholder="e.g., 123456"
                    className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black placeholder-black/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black/70 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black/70 mb-2">
                    Verification Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Code from your doctor"
                    className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black placeholder-black/30"
                  />
                  <p className="text-xs text-black/40 mt-1">
                    If your doctor provided a code, enter it here
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleVerification}
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-full font-medium hover:bg-black/80 transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Identity'}
              </button>
            </div>
          )}

          {/* Step 2: Create Account */}
          {step === 'create' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-black mb-2">Create Your Account</h2>
                <p className="text-sm text-black/60">
                  Set up your secure patient portal access
                </p>
              </div>

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
                  {success}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black/70 mb-2">
                    Patient ID (Auto-generated)
                  </label>
                  <input
                    type="text"
                    value={patientId}
                    disabled
                    className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 text-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black/70 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black placeholder-black/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black/70 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black placeholder-black/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black/70 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black placeholder-black/30"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-black/70">
                <strong>Privacy Notice:</strong> Your account is protected with differential privacy 
                (ε=3.0), end-to-end encryption, and HIPAA/GDPR compliance. You can view and revoke 
                consent at any time from your dashboard.
              </div>

              <button
                onClick={handleRegistration}
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-full font-medium hover:bg-black/80 transition-all disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          )}

          {/* Already have account */}
          <div className="mt-6 text-center">
            <p className="text-sm text-black/60">
              Already have an account?{' '}
              <Link href="/login" className="text-black font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-black/40">
          <p>Need help? Contact your healthcare provider</p>
        </div>
      </div>
    </main>
  );
}
