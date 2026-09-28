'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  X,
  ShieldCheck,
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { user, updateUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(null);
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  // Real-time strength checks matching backend regex
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
    if (!isFormValid || isLoading) return;

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      await api.changePassword({
        currentPassword,
        newPassword,
      });

      // Update local state if mustChangePassword was true
      if (user?.mustChangePassword) {
        updateUser({ mustChangePassword: false });
      }

      setSuccess('Your password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please verify your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl border border-cream-300 shadow-2xl max-w-md w-full p-6 sm:p-7 relative my-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-cream-100 transition disabled:opacity-40"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center shadow-md shrink-0">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-obsidian-900 leading-tight">
              Change Account Password
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Staff Portal Security • <span className="font-semibold text-obsidian-800">{user?.name}</span>
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
            <div className="flex items-center gap-2 font-bold mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Password Updated Successfully</span>
            </div>
            <p className="text-emerald-700 leading-relaxed mb-3">
              Your new password is now active. Please use it next time you log into Essence POS.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
            >
              Close Window
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Password Form (hidden if succeeded) */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password Field */}
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
                  autoFocus
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

            {/* New Password Field */}
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

            {/* Real-Time Password Strength Requirements Checklist */}
            <div className="p-3 bg-cream-50/80 rounded-xl border border-cream-200 space-y-1.5 text-[11px]">
              <p className="font-semibold text-gray-700 mb-1">Security Requirements:</p>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center gap-1.5">
                  {checks.length ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[9px] text-gray-400 shrink-0">○</span>
                  )}
                  <span className={checks.length ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                    8+ characters
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {checks.upper ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[9px] text-gray-400 shrink-0">○</span>
                  )}
                  <span className={checks.upper ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                    1 uppercase (A-Z)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {checks.lower ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[9px] text-gray-400 shrink-0">○</span>
                  )}
                  <span className={checks.lower ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                    1 lowercase (a-z)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {checks.digit ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[9px] text-gray-400 shrink-0">○</span>
                  )}
                  <span className={checks.digit ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                    1 number (0-9)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 col-span-2">
                  {checks.special ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[9px] text-gray-400 shrink-0">○</span>
                  )}
                  <span className={checks.special ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                    1 special symbol (!@#$%^&*...)
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm New Password Field */}
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

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="w-1/3 py-2.5 px-4 rounded-xl border border-cream-300 text-gray-700 hover:bg-cream-100 font-semibold text-xs transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-2/3 py-2.5 px-4 rounded-xl gold-gradient text-white font-bold text-xs shadow-md hover:brightness-105 active:brightness-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
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
        )}
      </div>
    </div>
  );
}
