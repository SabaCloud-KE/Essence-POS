'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  User,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Mail,
  Smartphone,
  Shield,
  Clock,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, isAdmin, updateUser } = useAuth();

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  if (!user) return null;

  // Real-time strength checks matching backend requirements
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isChangingPassword) return;

    setPasswordError(null);
    setPasswordSuccess(null);
    setIsChangingPassword(true);

    try {
      await api.changePassword({
        currentPassword,
        newPassword,
      });

      if (user.mustChangePassword) {
        updateUser({ mustChangePassword: false });
      }

      setPasswordSuccess('Your password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(
        err.message || 'Failed to change password. Please verify your current password.',
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header & Back Navigation */}
      <div className="bg-white p-5 rounded-2xl border border-cream-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center text-white text-lg font-bold shadow-md">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-obsidian-900 flex items-center gap-2">
              <span>Staff Profile & Security</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage your personal staff account credentials and login security
            </p>
          </div>
        </div>

        <Link
          href={isAdmin ? '/dashboard' : '/pos'}
          className="flex items-center gap-2 px-4 py-2 bg-cream-100 hover:bg-gold-50 border border-cream-300 hover:border-gold-300 text-obsidian-900 hover:text-gold-800 rounded-xl text-xs font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isAdmin ? 'Back to Dashboard' : 'Back to POS Register'}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-cream-300 shadow-sm p-6 text-center">
            <div className="w-20 h-20 rounded-3xl gold-gradient flex items-center justify-center text-white text-3xl font-extrabold mx-auto mb-4 shadow-lg ring-4 ring-gold-100">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-obsidian-900">{user.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{user.role}</span>
            </div>

            <div className="mt-6 pt-5 border-t border-cream-200 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>Email</span>
                </span>
                <span className="font-semibold text-obsidian-900 text-right truncate max-w-[150px]">
                  {user.email}
                </span>
              </div>

              {user.phone && (
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                    <span>Phone</span>
                  </span>
                  <span className="font-semibold text-obsidian-900">{user.phone}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>MFA Status</span>
                </span>
                <span
                  className={`font-semibold ${
                    user.mfaEnabled ? 'text-emerald-700' : 'text-gray-500'
                  }`}
                >
                  {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Account Status</span>
                </span>
                <span className="font-semibold text-emerald-700">Active</span>
              </div>
            </div>
          </div>

          {/* Quick Staff Notice Card */}
          <div className="bg-cream-50 rounded-2xl border border-cream-300 p-5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-obsidian-900">
              <Sparkles className="w-4 h-4 text-gold-600" />
              <span>Staff Responsibility</span>
            </div>
            <p className="text-gray-600 leading-relaxed text-[11px]">
              Every customer sale and service receipt registered under your login is tied to your account for daily audit and reconciliation.
            </p>
          </div>
        </div>

        {/* Right Column: Change Password Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-cream-300 shadow-sm p-6 sm:p-7">
            <div className="flex items-center gap-3 pb-4 border-b border-cream-200 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-gold-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-obsidian-900">Change Account Password</h2>
                <p className="text-xs text-gray-500">
                  Update your credentials to maintain salon terminal security
                </p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Password Changed Successfully</span>
                </div>
                <p className="text-emerald-700">
                  Your new password is now active. Please use it next time you log into Essence POS.
                </p>
              </div>
            )}

            {passwordError && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{passwordError}</div>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-obsidian-900 mb-1">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500 pr-10 bg-cream-50 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-obsidian-900 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter strong new password"
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500 pr-10 bg-cream-50 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Real-Time Requirements Checklist */}
              <div className="p-3.5 bg-cream-50 rounded-xl border border-cream-200 space-y-2 text-[11px]">
                <p className="font-semibold text-gray-700">Password Requirements:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    {checks.length ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px] text-gray-400 shrink-0">○</span>
                    )}
                    <span className={checks.length ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                      At least 8 characters
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {checks.upper ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px] text-gray-400 shrink-0">○</span>
                    )}
                    <span className={checks.upper ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                      1 uppercase letter (A-Z)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {checks.lower ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px] text-gray-400 shrink-0">○</span>
                    )}
                    <span className={checks.lower ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                      1 lowercase letter (a-z)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {checks.digit ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px] text-gray-400 shrink-0">○</span>
                    )}
                    <span className={checks.digit ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                      1 number (0-9)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:col-span-2">
                    {checks.special ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px] text-gray-400 shrink-0">○</span>
                    )}
                    <span className={checks.special ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                      1 special symbol (!@#$%^&*...)
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-obsidian-900 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border outline-none pr-10 transition ${
                      confirmPassword.length === 0
                        ? 'border-cream-300 bg-cream-50 focus:bg-white'
                        : checks.matches
                        ? 'border-emerald-400 bg-emerald-50/20 focus:bg-white'
                        : 'border-rose-300 bg-rose-50/20 focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !checks.matches && (
                  <p className="text-[11px] text-rose-500 mt-1">Passwords do not match.</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword || !isFormValid}
                  className="w-full py-3 px-4 rounded-xl gold-gradient text-white font-bold text-xs shadow-md hover:brightness-105 active:brightness-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
