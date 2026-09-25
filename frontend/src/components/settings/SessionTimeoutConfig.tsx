'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Clock,
  Shield,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sliders,
  Laptop,
  Smartphone,
  Sparkles,
} from 'lucide-react';

interface SessionTimeoutConfigProps {
  settingsData: any;
  onRefresh: () => Promise<void>;
}

export default function SessionTimeoutConfig({ settingsData, onRefresh }: SessionTimeoutConfigProps) {
  const currentTimeout = settingsData?.environment?.sessionTimeout;

  const [adminMinutes, setAdminMinutes] = useState(30);
  const [staffMinutes, setStaffMinutes] = useState(15);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (currentTimeout) {
      if (currentTimeout.adminTimeoutMinutes) setAdminMinutes(currentTimeout.adminTimeoutMinutes);
      if (currentTimeout.staffTimeoutMinutes) setStaffMinutes(currentTimeout.staffTimeoutMinutes);
    }
  }, [currentTimeout]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await api.updateSessionTimeoutConfig({
        adminTimeoutMinutes: Math.max(1, Math.min(720, Number(adminMinutes))),
        staffTimeoutMinutes: Math.max(1, Math.min(720, Number(staffMinutes))),
      });
      // Broadcast update immediately to SessionTimeoutProvider
      localStorage.setItem('essence_pos_session_timeout_updated', String(Date.now()));
      window.dispatchEvent(new CustomEvent('essence_pos_session_timeout_updated'));

      setSaveSuccess('Session timeout policies successfully updated for both dashboards!');
      await onRefresh();
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update session timeouts.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (admin: number, staff: number) => {
    setAdminMinutes(admin);
    setStaffMinutes(staff);
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-300 shadow-sm p-6 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cream-200 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-obsidian-900">Session Timeout & Inactivity Protection</h2>
              <p className="text-[11px] text-gray-500">Dual-dashboard idle auto-logout for Admin & Staff</p>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Active Protection
          </span>
        </div>

        {saveSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Preset Buttons */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
              Quick Security Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset(15, 10)}
                className={`py-2 px-2.5 rounded-xl border text-center transition ${
                  adminMinutes === 15 && staffMinutes === 10
                    ? 'bg-gold-50 border-gold-400 text-obsidian-900 font-bold ring-2 ring-gold-400/20'
                    : 'bg-cream-50 border-cream-200 text-gray-600 hover:bg-cream-100 font-medium'
                }`}
              >
                <div className="text-xs">🔒 Strict</div>
                <div className="text-[10px] text-gray-400">15m / 10m</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(30, 15)}
                className={`py-2 px-2.5 rounded-xl border text-center transition ${
                  adminMinutes === 30 && staffMinutes === 15
                    ? 'bg-gold-50 border-gold-400 text-obsidian-900 font-bold ring-2 ring-gold-400/20'
                    : 'bg-cream-50 border-cream-200 text-gray-600 hover:bg-cream-100 font-medium'
                }`}
              >
                <div className="text-xs">⚖️ Standard</div>
                <div className="text-[10px] text-gray-400">30m / 15m</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(60, 30)}
                className={`py-2 px-2.5 rounded-xl border text-center transition ${
                  adminMinutes === 60 && staffMinutes === 30
                    ? 'bg-gold-50 border-gold-400 text-obsidian-900 font-bold ring-2 ring-gold-400/20'
                    : 'bg-cream-50 border-cream-200 text-gray-600 hover:bg-cream-100 font-medium'
                }`}
              >
                <div className="text-xs">🕒 Extended</div>
                <div className="text-[10px] text-gray-400">60m / 30m</div>
              </button>
            </div>
          </div>

          {/* Dual Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Admin Dashboard */}
            <div className="p-3.5 rounded-2xl bg-cream-50/70 border border-cream-200 space-y-2">
              <div className="flex items-center gap-1.5 text-obsidian-900 font-bold">
                <Laptop className="w-4 h-4 text-gold-600" />
                <span>Admin Dashboard</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                For reports, user management, and salon audit controls.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={adminMinutes}
                  onChange={(e) => setAdminMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-2.5 py-1.5 font-mono text-sm font-bold rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                />
                <span className="font-semibold text-gray-700">minutes</span>
              </div>
            </div>

            {/* Staff / POS Dashboard */}
            <div className="p-3.5 rounded-2xl bg-cream-50/70 border border-cream-200 space-y-2">
              <div className="flex items-center gap-1.5 text-obsidian-900 font-bold">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Staff POS Register</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                Front-desk and floor terminal timeout when cashiers step away.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={staffMinutes}
                  onChange={(e) => setStaffMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-2.5 py-1.5 font-mono text-sm font-bold rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                />
                <span className="font-semibold text-gray-700">minutes</span>
              </div>
            </div>
          </div>

          {/* Security Notice Callout */}
          <div className="p-3 rounded-xl bg-cream-50 border border-cream-200 text-[11px] text-gray-600 leading-relaxed flex items-start gap-2">
            <Shield className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
            <p>
              When a user remains idle, a warning dialog with an animated <strong>60-second countdown</strong> will alert them before auto-logging out and locking the terminal.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 px-4 rounded-xl gold-gradient text-white font-bold text-xs shadow-sm hover:brightness-105 transition flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Update Session Timeout Policies</span>
          </button>
        </form>
      </div>
    </div>
  );
}
