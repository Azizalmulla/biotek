'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

export default function AdminLogin() {
  const router = useRouter();
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminId.trim() || !password.trim()) {
      setError('Please enter both admin ID and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: adminId,
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Store admin session
      localStorage.setItem('biotek_admin_session', JSON.stringify({
        sessionId: data.session_id,
        adminId: data.admin_id,
        fullName: data.full_name,
        email: data.email,
        accessToken: data.access_token,
        expiresAt: data.expires_at,
        isSuperAdmin: data.is_super_admin
      }));

      // Redirect to admin dashboard
      router.push('/admin');
      
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f3e7d9] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
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
            <h1 className="text-3xl font-bold text-black">BioTeK Admin</h1>
          </div>
          <p className="text-black/60">Administrator Access Portal</p>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-black/40">
            <span>🔒</span>
            <span>Secure • Verified • Audited</span>
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-black mb-1">Administrator Sign In</h2>
            <p className="text-sm text-black/60">
              Access staff management and system controls
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black/70 mb-2">
                Admin ID
              </label>
              <input
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black placeholder-black/30"
                autoFocus
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
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-black/5 rounded-xl border border-black/10 focus:border-black/30 focus:outline-none text-black placeholder-black/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-full font-medium hover:bg-black/80 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-stone-50 border border-stone-200 rounded-xl">
            <div className="flex items-start gap-2">
              <span className="text-black">⚠️</span>
              <div className="text-xs text-black/70">
                <strong>Security Notice:</strong> All admin activities are logged and monitored. 
                Unauthorized access attempts will be reported to system security.
              </div>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-black/60 hover:text-black transition-colors">
              ← Back to Home
            </Link>
          </div>
        </motion.div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-black/40">
          <p>For admin access, contact system administrator</p>
        </div>
      </div>
    </main>
  );
}
