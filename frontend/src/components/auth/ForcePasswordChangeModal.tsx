'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  KeyRound,
} from 'lucide-react';

export function ForcePasswordChangeModal() {
  const { user, updateUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user does not need to change password, do not render
  if (!user || !user.mustChangePassword) {
    return null;
  }

  // Real-time strength checks
  const checks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    digit: /\d/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
    matches: newPassword.length > 0 && newPassword === confirmPassword,
  };

  const isFormValid =
    currentPassword.trim().length > 0 &&
    checks.length &&
    checks.upper &&
    checks.lower &&
    checks.digit &&
    checks.special &&
    checks.matches;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError(null);
    setIsLoading(true);

    try {
      await api.changePassword({
        currentPassword,
        newPassword,
      });

      // Update local auth context and remove the prompt
      updateUser({ mustChangePassword: false });
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please verify current password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-cream-300 shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <KeyRound className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-obsidian-900">
            First-Time Login Security Setup
          </h2>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            Welcome to Essence POS, <span className="font-semibold text-gray-800">{user.name}</span>. For your account security, you must replace your temporary password with a strong permanent password before proceeding.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Temporary Password */}
          <div>
            <label className="block text-xs font-semibold text-obsidian-900 mb-1">
              Temporary Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter temporary password"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500 pr-9 bg-cream-50 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Strong Password */}
          <div>
            <label className="block text-xs font-semibold text-obsidian-900 mb-1">
              New Permanent Password <span className="text-rose-500">*</span>
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter strong password"
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500 bg-cream-50 focus:bg-white"
            />
          </div>

          {/* Real-Time Password Strength Checklist */}
          <div className="p-3 bg-cream-50 rounded-xl border border-cream-200 space-y-1.5 text-[11px]">
            <p className="font-semibold text-gray-700 mb-1">Password Requirements:</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1.5">
                {checks.length ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[9px] text-gray-400">○</span>
                )}
                <span className={checks.length ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                  8+ characters
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {checks.upper ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[9px] text-gray-400">○</span>
                )}
                <span className={checks.upper ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                  1 uppercase (A-Z)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {checks.lower ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[9px] text-gray-400">○</span>
                )}
                <span className={checks.lower ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                  1 lowercase (a-z)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {checks.digit ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[9px] text-gray-400">○</span>
                )}
                <span className={checks.digit ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                  1 number (0-9)
                </span>
              </div>

              <div className="flex items-center gap-1.5 col-span-2">
                {checks.special ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[9px] text-gray-400">○</span>
                )}
                <span className={checks.special ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                  1 special symbol (!@#$%^&*...)
                </span>
              </div>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-obsidian-900 mb-1">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition ${
                confirmPassword.length === 0
                  ? 'border-cream-300 bg-cream-50'
                  : checks.matches
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : 'border-rose-300 bg-rose-50/20'
              }`}
            />
            {confirmPassword.length > 0 && !checks.matches && (
              <p className="text-[11px] text-rose-500 mt-1">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="w-full py-3 px-4 rounded-xl gold-gradient text-white font-bold text-xs shadow-md hover:brightness-105 active:brightness-95 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            <span>Set New Password & Continue</span>
          </button>
        </form>
      </div>
    </div>
  );
}
