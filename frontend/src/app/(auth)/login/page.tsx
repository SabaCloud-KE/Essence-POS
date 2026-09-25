'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, Shield, Lock, Mail, ArrowRight, Loader2, KeyRound, Clock } from 'lucide-react';

export default function LoginPage() {
  const { login, verifyMfa } = useAuth();

  const [email, setEmail] = useState('admin@essence.co.ke');
  const [password, setPassword] = useState('AdminPassword2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reason') === 'timeout') {
        setIsTimeout(true);
      }
    }
  }, []);

  // MFA Challenge state
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (res.requireMfa && res.mfaToken) {
        setMfaToken(res.mfaToken);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken || !otpCode) return;

    setError(null);
    setIsVerifyingMfa(true);

    try {
      await verifyMfa(mfaToken, otpCode);
    } catch (err: any) {
      setError(err.message || 'Invalid authentication code. Please try again.');
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const setDemoAccount = (role: 'admin' | 'staff') => {
    if (role === 'admin') {
      setEmail('admin@essence.co.ke');
      setPassword('AdminPassword2026!');
    } else {
      setEmail('staff@essence.co.ke');
      setPassword('StaffPassword2026!');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF7F2]">
      <div className="w-full max-w-md">
        {/* Salon Branding Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gold-gradient shadow-lg mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-obsidian-900">
            ESSENCE HAIR & BEAUTY
          </h1>
          <p className="text-xs uppercase tracking-widest text-gold-600 font-semibold mt-1">
            Point of Sale & Payment System
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Nairobi, Kenya • M-Pesa Direct Gateway
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-white rounded-2xl p-8 border border-cream-300 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 gold-gradient" />

          {isTimeout && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium leading-relaxed flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Session Timed Out</div>
                <p className="text-[11px] text-amber-800">
                  Your session was automatically locked due to inactivity. Please sign in again to continue.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          {!mfaToken ? (
            /* Primary Login Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@essence.co.ke"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none text-sm transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none text-sm transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl gold-gradient text-white font-semibold text-sm shadow-md hover:brightness-105 active:brightness-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Register</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Dev Preset Selector */}
              <div className="pt-4 border-t border-cream-200 mt-6 text-center">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2 font-medium">
                  Quick Demo Accounts
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDemoAccount('admin')}
                    className="px-2.5 py-1.5 rounded-lg border border-gold-300 bg-gold-50 text-[11px] font-semibold text-gold-800 hover:bg-gold-100 transition"
                  >
                    👑 Admin Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoAccount('staff')}
                    className="px-2.5 py-1.5 rounded-lg border border-cream-300 bg-cream-100 text-[11px] font-semibold text-gray-700 hover:bg-cream-200 transition"
                  >
                    💇 Staff Demo
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* TOTP MFA Challenge */
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gold-50 border border-gold-200 text-gold-600 flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-obsidian-900">
                  Two-Factor Authentication
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code from your Authenticator app
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 text-center">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-widest font-mono text-lg py-2.5 rounded-xl border border-gray-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifyingMfa || otpCode.length !== 6}
                className="w-full py-3 px-4 rounded-xl gold-gradient text-white font-semibold text-sm shadow-md hover:brightness-105 active:brightness-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifyingMfa ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMfaToken(null);
                  setOtpCode('');
                }}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-800 transition pt-2"
              >
                Back to email & password
              </button>
            </form>
          )}
        </div>

        {/* Security Footer Notice */}
        <div className="text-center mt-6 text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-gold-500" />
          <span>Protected by AES & TOTP encryption. Session timeout enforced.</span>
        </div>
      </div>
    </div>
  );
}
